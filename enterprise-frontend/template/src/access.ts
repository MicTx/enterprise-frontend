// 权限真源：页面以 useAccess() 消费，不散落硬编码角色判断（general-pages §菜单与路由接线）。
// 功能级权限码由 /me 的 permissions 解析；admin 角色隐含全部功能权限。
import type { InitialState } from './utils/authGuard';

export interface Access {
  isLoggedIn: boolean;
  canAdmin: boolean;
  /** 功能级示例：项目管理（新建/编辑/删除按钮级消费） */
  canManageProjects: boolean;
}

export default function access(initialState: InitialState | undefined): Access {
  const user = initialState?.currentUser;
  const permissions = user?.permissions ?? [];
  return {
    isLoggedIn: !!user,
    canAdmin: user?.role === 'admin',
    canManageProjects:
      user?.role === 'admin' || permissions.includes('projects:manage'),
  };
}
