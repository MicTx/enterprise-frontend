// 导航视图真源（模式占位）：菜单按角色白名单裁剪时在此集中声明视图与分组，
// 供 app.tsx 布局菜单渲染（menuDataRender）消费。隐藏菜单 ≠ 删除深链，授权在后端。
// 模式细则见 references/general-pages.md §菜单与路由接线。

export type NavViewId = 'default';

export interface NavView {
  id: NavViewId;
  name: string;
  allowedRoles: string[];
  /** 菜单可见白名单（路由 path）：'/' 精确匹配，其余按前缀匹配子路由。 */
  menuPaths: string[];
}

export const NAV_VIEWS: NavView[] = [
  {
    id: 'default',
    name: '默认视图',
    allowedRoles: ['admin', 'user'],
    menuPaths: ['/', '/projects'],
  },
];

export function resolveNavView(roles: string[] | undefined): NavView {
  return (
    NAV_VIEWS.find((v) => roles?.some((r) => v.allowedRoles.includes(r))) ??
    NAV_VIEWS[0]
  );
}

/** 菜单路径是否命中当前视图白名单（只控菜单可见性，深链与授权不受影响）。 */
export function isMenuPathVisible(
  view: NavView,
  path: string | undefined,
): boolean {
  if (!path) return false;
  return view.menuPaths.some((allowed) =>
    allowed === '/'
      ? path === '/'
      : path === allowed || path.startsWith(`${allowed}/`),
  );
}
