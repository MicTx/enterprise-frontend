// 原子类入口：postcss 链（@tailwindcss/postcss）已注册，此处 import 即生效；
// global.less 的 @import 不走 postcss 编译链，不要放那里。
import './tailwind.css';
import type { MenuDataItem } from '@ant-design/pro-components';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  type AxiosError,
  getIntl,
  type RequestConfig,
  type RequestOptions,
  type RunTimeLayoutConfig,
  SelectLang,
} from '@umijs/max';
import { message, notification } from 'antd';
import React from 'react';
import defaultSettings from '../config/defaultSettings';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineBanner from './components/OfflineBanner';
import SettingsDrawerHost from './components/SettingsDrawerHost';
import ThemeProvider from './components/ThemeProvider';
import { isMenuPathVisible, resolveNavView } from './nav/navViews';
import Forbidden from './pages/403';
import NotFound from './pages/404';
import { type AppSettings, readSettings } from './theme/settings';
import { apiClient } from './utils/apiClient';
import type { InitialState } from './utils/authGuard';
import {
  buildLoginUrl,
  hardNavigate,
  isLoginOpen,
  isSameOrigin,
  TOKEN_KEY,
} from './utils/authRedirect';
import { queryClient } from './utils/queryClient';

// pro-components 布局文案（设置抽屉等）按 localStorage.umi_locale → window.g_locale
// → navigator.language 自行判语言，与应用 locale 真源脱节（无头环境会落 en-US）。
// 启动时把 g_locale 钉到 umi 当前语言；切语言默认整页刷新后重新求值。
declare global {
  interface Window {
    g_locale?: string;
  }
}
if (typeof window !== 'undefined') {
  window.g_locale = localStorage.getItem('umi_locale') || 'zh-CN';
}

// 请求错误统一分发契约：响应体携带 showType 时按级呈现（四态错误态的请求侧）。
// SILENT 不出 UI；WARN_MESSAGE / ERROR_MESSAGE / NOTIFICATION 由统一入口呈现，
// 页面不自行 toast 轰炸；REDIRECT 语义由上方 401 收敛承载。
type ShowType =
  | 'SILENT'
  | 'WARN_MESSAGE'
  | 'ERROR_MESSAGE'
  | 'NOTIFICATION'
  | 'REDIRECT';

interface ErrorBody {
  errorMessage?: string;
  showType?: ShowType;
}

// 兜底文案与通知标题单源在 locales（app.request.*）：组件外无 FormattedMessage，
// 取词走 getIntl().formatMessage（与模板「文案走 locales + intl」同一条通道）。
function notifyByShowType(body: ErrorBody | undefined) {
  const intl = getIntl();
  const text =
    body?.errorMessage ?? intl.formatMessage({ id: 'app.request.failed' });
  switch (body?.showType) {
    case 'WARN_MESSAGE':
      message.warning(text);
      break;
    case 'ERROR_MESSAGE':
      message.error(text);
      break;
    case 'NOTIFICATION':
      notification.error({
        message: intl.formatMessage({ id: 'app.request.failedTitle' }),
        description: text,
      });
      break;
    default:
      break;
  }
}

// 运行时请求配置真源：框架 request 与 apiClient 共用这一条管线（data-layer §双通道请求）。
export const request: RequestConfig = {
  baseURL: '/api',
  errorConfig: {
    // 401 恒处理：框架对每个失败请求都调用 errorHandler（含 skipErrorHandler）。
    // 已在登录弹层时不再跳转，登录接口自身的 401 不自循环。
    errorHandler: (error, opts) => {
      const response = (error as AxiosError).response;
      if (response?.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        if (!isLoginOpen(window.location)) {
          hardNavigate(buildLoginUrl(window.location));
        }
        throw error;
      }
      // showType 统一分发只作用于未 skip 的请求；apiClient 默认 skip，
      // 业务错误由调用方四态承载（两条互补通道，零破坏既有行为）。
      const options = (
        opts as
          | { request?: { options?: { skipErrorHandler?: boolean } } }
          | undefined
      )?.request?.options;
      if (!options?.skipErrorHandler) {
        notifyByShowType(response?.data as ErrorBody | undefined);
      }
      throw error;
    },
  },
  requestInterceptors: [
    (config: RequestOptions) => {
      // Bearer 只附同源请求：外域（地图服务、第三方 API）不带用户凭证。
      const token = localStorage.getItem(TOKEN_KEY);
      if (token && isSameOrigin(config.baseURL) && isSameOrigin(config.url)) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      }
      return config;
    },
  ],
};

export async function getInitialState(): Promise<InitialState> {
  // 偏好同步读取（localStorage），无需等待网络
  const settings = readSettings();
  try {
    const currentUser =
      await apiClient.get<NonNullable<InitialState['currentUser']>>('/me');
    return { currentUser, settings };
  } catch {
    return { settings };
  }
}

// 导航真源消费面：布局菜单只渲染当前角色命中的 NavView 白名单路径。
// 菜单裁剪只控可见性——路由与深链不受影响，授权在后端
// （general-pages §菜单与路由接线：隐藏菜单 ≠ 删除深链）。
function filterMenusByNavView(
  menus: MenuDataItem[],
  view: ReturnType<typeof resolveNavView>,
): MenuDataItem[] {
  return menus.flatMap((menu) => {
    const children = menu.children
      ? filterMenusByNavView(menu.children, view)
      : undefined;
    const hasVisibleChildren = !!children && children.length > 0;
    if (!isMenuPathVisible(view, menu.path) && !hasVisibleChildren) {
      return [];
    }
    return [{ ...menu, ...(children ? { children } : {}) }];
  });
}

// 布局运行时配置：settings 随 initialState（SettingDrawer 变更）响应；
// 越权与未命中路由接例外页组件（深链可达，授权在后端）。
export const layout: RunTimeLayoutConfig = ({ initialState }) => {
  const settings: AppSettings = {
    ...defaultSettings,
    ...initialState?.settings,
  };
  const role = initialState?.currentUser?.role;
  const navView = resolveNavView(role ? [role] : undefined);
  return {
    ...settings,
    menuDataRender: (menuData) => filterMenusByNavView(menuData, navView),
    childrenRender: (dom) => (
      <>
        {/* OfflineBanner 在 provider 链内（rootContainer 层无 IntlProvider） */}
        <OfflineBanner />
        {dom}
        <SettingsDrawerHost />
      </>
    ),
    // 头部语言切换（umi locale 内置，随 localStorage ant_locale 持久化）
    rightContentRender: () => <SelectLang />,
    unAccessible: <Forbidden />,
    noFound: <NotFound />,
  };
};

export function rootContainer(container: React.ReactNode) {
  // rootContainer 是最外层包裹（model/locale Provider 之外）：此层组件不得用
  // useModel / FormattedMessage（无对应上下文），OfflineBanner 因此移入 childrenRender。
  return React.createElement(
    QueryClientProvider,
    { client: queryClient },
    React.createElement(
      ErrorBoundary,
      null,
      React.createElement(ThemeProvider, null, container),
    ),
  );
}
