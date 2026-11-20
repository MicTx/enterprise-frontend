import { act, render, screen } from '@testing-library/react';
import defaultSettings from '../../config/defaultSettings';
import { resetSettings, writeSettings } from '../theme/settings';
import ThemeProvider from './ThemeProvider';

// jest 环境无 umi 插件运行时（getPluginManager 为 null），getLocale 打桩
jest.mock('@umijs/max', () => ({ getLocale: () => 'zh-CN' }));

describe('ThemeProvider（rootContainer 层，订阅制偏好）', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    resetSettings();
  });

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
});
