import { act, render, screen } from '@testing-library/react';
import defaultSettings from '../../config/defaultSettings';
import { resetSettings, writeSettings } from '../theme/settings';
import ThemeProvider from './ThemeProvider';

// jest 环境无 umi 插件运行时（getPluginManager 为 null），getLocale 打桩
jest.mock('@umijs/max', () => ({ getLocale: () => 'zh-CN' }));

// 观察 ThemeProvider 传给 ConfigProvider 的 theme：motion 开关是否进 token。
// 不动 antd 全局 ConfigProvider，只拦 ThemeProvider 内部的 ConfigProvider。
type CapturedTheme = { token?: { motion?: boolean } };
const seenThemes: Array<{ token?: { motion?: boolean } } | undefined> = [];
jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  return {
    ...actual,
    ConfigProvider: (props: { children?: unknown; theme?: CapturedTheme }) => {
      seenThemes.push(props.theme);
      return <>{props.children}</>;
    },
  };
});

interface FakeMql {
  matches: boolean;
  media: string;
  listeners: Set<() => void>;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
  addListener: (listener: () => void) => void;
  removeListener: (listener: () => void) => void;
}

function fakeMql(matches: boolean): FakeMql {
  const listeners = new Set<() => void>();
  return {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    listeners,
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
    addListener: (listener) => listeners.add(listener),
    removeListener: (listener) => listeners.delete(listener),
  };
}

let currentMql: FakeMql;
const originalMatchMedia = window.matchMedia;

function lastThemeToken(): { motion?: boolean } {
  return seenThemes[seenThemes.length - 1]?.token ?? {};
}

describe('ThemeProvider（rootContainer 层，订阅制偏好）', () => {
  beforeEach(() => {
    localStorage.clear();
    seenThemes.length = 0;
    currentMql = fakeMql(false);
    // 测试只需要 matchMedia 返回这一份 query 实例；其他 DOM MQL 字段用不到，
    // 与 jsdom 环境的真实签名差异用 unknown 中转收窄。
    window.matchMedia = ((query: string) => {
      void query;
      return currentMql;
    }) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    resetSettings();
  });

  function fireMotionChange() {
    for (const listener of currentMql.listeners) listener();
  }

  it('默认亮色渲染子树', () => {
    render(<ThemeProvider>内容</ThemeProvider>);
    expect(screen.getByText('内容')).toBeInTheDocument();
  });

  it('设置变更（暗色）经订阅通道触达，不依赖 useModel', () => {
    render(<ThemeProvider>子树</ThemeProvider>);
    act(() => {
      writeSettings({ ...defaultSettings, navTheme: 'realDark' });
    });
    expect(screen.getByText('子树')).toBeInTheDocument();
  });

  it('系统无减动效偏好时 token.motion 为 true', () => {
    currentMql.matches = false;
    render(<ThemeProvider>动画</ThemeProvider>);
    expect(lastThemeToken().motion).toBe(true);
  });

  it('系统开启减动效时首次渲染即 token.motion=false（首帧即生效）', () => {
    currentMql.matches = true;
    render(<ThemeProvider>动画</ThemeProvider>);
    expect(lastThemeToken().motion).toBe(false);
  });

  it('运行中系统偏好切换即时更新 token.motion，不依赖重挂或刷新', () => {
    currentMql.matches = false;
    render(<ThemeProvider>动画</ThemeProvider>);
    expect(lastThemeToken().motion).toBe(true);

    act(() => {
      currentMql.matches = true;
      fireMotionChange();
    });
    expect(lastThemeToken().motion).toBe(false);

    act(() => {
      currentMql.matches = false;
      fireMotionChange();
    });
    expect(lastThemeToken().motion).toBe(true);
  });
});
