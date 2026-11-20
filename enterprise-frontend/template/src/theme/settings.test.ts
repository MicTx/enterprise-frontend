import defaultSettings from '../../config/defaultSettings';
import { readSettings, resetSettings, writeSettings } from './settings';

describe('运行时偏好持久化', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('无存储时返回默认值', () => {
    expect(readSettings()).toEqual({ ...defaultSettings });
  });

  it('写入后读回合并且覆盖默认值', () => {
    writeSettings({ ...defaultSettings, navTheme: 'realDark' });
    expect(readSettings().navTheme).toBe('realDark');
    // 未覆盖字段回落默认
    expect(readSettings().siderWidth).toBe(defaultSettings.siderWidth);
  });

  it('损坏数据回落默认值不抛错', () => {
    localStorage.setItem('my-admin.settings', '{broken json');
    expect(readSettings()).toEqual({ ...defaultSettings });
  });

  it('resetSettings 清除存储并回到默认', () => {
    writeSettings({ ...defaultSettings, layout: 'top' });
    expect(resetSettings()).toEqual({ ...defaultSettings });
    expect(localStorage.getItem('my-admin.settings')).toBeNull();
  });
});
