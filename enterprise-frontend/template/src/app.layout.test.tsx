import type { MenuDataItem } from '@ant-design/pro-components';
import defaultSettings from '../config/defaultSettings';
import { layout } from './app';
import { resolveNavView } from './nav/navViews';
import type { InitialState } from './utils/authGuard';

// layout 运行时入参是完整 InitDataType（含 refresh/setInitialState 等运行时面），
// 本测试只驱动 initialState 分支，其余字段与断言无关——按需收窄注入。
type LayoutInput = Parameters<typeof layout>[0];

function callLayout(initialState: InitialState | undefined) {
  return layout({ initialState } as LayoutInput);
}

function renderMenu(
  config: ReturnType<typeof callLayout>,
  menuData: MenuDataItem[],
): MenuDataItem[] {
  return config.menuDataRender?.(menuData) ?? [];
}

describe('布局运行时配置', () => {
  it('无 initialState 时回落默认 settings', () => {
    const config = callLayout(undefined);
    expect(config.title).toBe(defaultSettings.title);
    expect(config.navTheme).toBe('light');
  });

  it('initialState.settings 覆盖默认（暗色）', () => {
    const config = callLayout({
      settings: { ...defaultSettings, navTheme: 'realDark' },
    });
    expect(config.navTheme).toBe('realDark');
  });

  it('越权与未命中路由接例外页', () => {
    const config = callLayout(undefined);
    expect(config.unAccessible).toBeDefined();
    expect(config.noFound).toBeDefined();
    expect(typeof config.childrenRender).toBe('function');
  });

  it('菜单从 navViews 派生：白名单外的路径不进菜单', () => {
    const config = callLayout({
      currentUser: { id: '1', name: 'admin', role: 'admin' },
    });
    // 白名单直接取自导航真源；放一个真源未声明的路径，验证它被裁剪。
    const view = resolveNavView(['admin']);
    const declared = view.menuPaths.map((path, index) => ({
      name: `declared-${index}`,
      path,
    }));
    const rendered = renderMenu(config, [
      ...declared,
      { name: 'undeclared', path: '/undeclared-menu-entry' },
    ]);
    expect(rendered.map((item) => item.path)).toEqual(view.menuPaths);
  });

  it('导航白名单按角色解析：user/admin 命中视图，未知角色回落默认视图', () => {
    const userView = resolveNavView(['user']);
    const adminView = resolveNavView(['admin']);
    const fallbackView = resolveNavView(['unknown-role']);
    expect(userView.id).toBe('default');
    expect(adminView.id).toBe('default');
    expect(fallbackView.id).toBe('default');

    const config = callLayout({
      currentUser: { id: '2', name: 'viewer', role: 'user' },
    });
    const menuData = fallbackView.menuPaths.map((path, index) => ({
      name: `item-${index}`,
      path,
    }));
    expect(renderMenu(config, menuData).map((item) => item.path)).toEqual(
      fallbackView.menuPaths,
    );
  });

  it('分组节点保留可见子项（菜单裁剪只控可见性）', () => {
    const config = callLayout(undefined);
    const rendered = renderMenu(config, [
      {
        name: 'group',
        path: '/group-not-whitelisted',
        children: [{ name: 'child', path: '/projects/detail/1' }],
      },
    ]);
    expect(rendered).toHaveLength(1);
    expect(rendered[0].children?.map((item) => item.path)).toEqual([
      '/projects/detail/1',
    ]);
  });
});
