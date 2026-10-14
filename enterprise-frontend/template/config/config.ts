import { defineConfig } from '@umijs/max';
import zhCN from 'antd/locale/zh_CN';
import defaultSettings from './defaultSettings';
import routes from './routes';

// 主题 token 真源（design-tokens 篇 §基础 token 清单）：cssVar 开启；
// 偏离默认值必须带 why 注释。
const theme = {
  cssVar: true,
  token: {
    colorPrimary: '#1677ff',
    colorSuccess: '#16a34a',
    colorWarning: '#d97706',
    colorError: '#dc2626',
    colorInfo: '#1677ff',
    colorBgLayout: '#f5f7fa',
    colorBgContainer: '#ffffff',
    colorText: '#0f172a',
    colorTextSecondary: '#475569',
    colorBorderSecondary: '#e2e8f0',
    borderRadius: 12,
    borderRadiusLG: 16,
    controlHeight: 36,
    fontSize: 14,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    lineWidth: 1,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  components: {
    Layout: {
      bodyBg: '#f5f7fa',
      headerBg: 'rgba(255,255,255,0.88)',
      siderBg: '#ffffff',
      triggerBg: '#ffffff',
    },
    Card: { borderRadiusLG: 16, paddingLG: 20 },
    Table: { headerBg: '#f8fafc', rowHoverBg: '#f8fbff' },
    Form: { itemMarginBottom: 20 },
    Button: {
      // 禁用态背景不能用默认半透明：叠在地图/画布浮层上等于透底，按钮会「消失」；
      // 改不透明浅灰走主题 token，不做自定义 CSS。
      colorBgContainerDisabled: '#f5f5f5',
    },
  },
} as const;

// umi 4.7.24 的 request 插件 schema 仅声明 dataField；baseURL/errorConfig/requestInterceptors
// 属运行时透传键（plugin-request 把整个 request 配置交给 axios.create），功能有效但生成类型
// 未收录。提为常量绕开字面量多余属性检查，dataField 显式声明满足目标类型全可选的 weak-type
// 校验（值即插件默认值）；上游 schema 收录后可直接内联回 defineConfig。
const requestConfig = {
  dataField: 'data',
  baseURL: '/api',
  errorConfig: {
    // 401 恒处理（即使 skipErrorHandler）：清 token + 跳首页登录并带回跳参数。
    // 登录入口是首页弹层，不建独立登录路由页（data-layer §401 统一收敛）。
    errorHandler: (error: any) => {
      const status = error?.response?.status ?? error?.status;
      if (status === 401) {
        localStorage.removeItem('token');
        const { pathname, search } = window.location;
        if (pathname !== '/') {
          window.location.href = `/?login=1&redirect=${encodeURIComponent(pathname + search)}`;
        }
      }
      throw error;
    },
  },
  requestInterceptors: [
    (config: any) => {
      // 双认证通道：cookie（同源自动携带）+ Bearer header
      const token = localStorage.getItem('token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    },
  ],
};

export default defineConfig({
  hash: true,
  routes,
  ignoreMomentLocale: true,
  fastRefresh: true,
  model: {},
  initialState: {},
  access: {},

  title: defaultSettings.title,
  layout: { locale: false, ...defaultSettings },

  antd: {
    appConfig: {},
    configProvider: { locale: zhCN, theme },
  },

  request: requestConfig,
});
