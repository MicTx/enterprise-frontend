// 权限真源：页面以 useAccess() 消费，不散落硬编码角色判断（general-pages §菜单与路由接线）。
import type { InitialState } from './utils/authGuard';

export interface Access {
  isLoggedIn: boolean;
  canAdmin: boolean;
}

export default function access(initialState: InitialState | undefined): Access {
  const role = initialState?.currentUser?.role;
  return {
    isLoggedIn: !!initialState?.currentUser,
    canAdmin: role === 'admin',
  };
}
