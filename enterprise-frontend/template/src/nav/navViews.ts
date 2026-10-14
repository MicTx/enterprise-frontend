// 导航视图真源（模式占位）：菜单按角色白名单裁剪时在此集中声明视图与分组，
// 供 app.tsx 布局菜单渲染消费。隐藏菜单 ≠ 删除深链，授权在后端。
// 模式细则见 references/general-pages.md §菜单与路由接线。

export type NavViewId = 'default';

export interface NavView {
  id: NavViewId;
  name: string;
  allowedRoles: string[];
}

export const NAV_VIEWS: NavView[] = [
  { id: 'default', name: '默认视图', allowedRoles: ['admin', 'user'] },
];

export function resolveNavView(roles: string[] | undefined): NavView {
  return (
    NAV_VIEWS.find((v) => roles?.some((r) => v.allowedRoles.includes(r))) ??
    NAV_VIEWS[0]
  );
}
