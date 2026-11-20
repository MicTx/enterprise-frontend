import type { AppSettings } from '../theme/settings';

// 应用初始态类型真源：currentUser 形状在此集中声明。
export interface CurrentUser {
  id: string;
  name: string;
  role: 'admin' | 'user';
  /** 功能级权限码（如 'projects:manage'）；权限真源 src/access.ts 以此解析 */
  permissions?: string[];
}

export interface InitialState {
  currentUser?: CurrentUser;
  /** 运行时偏好（暗色/布局等）；持久化与读写见 src/theme/settings.ts */
  settings?: AppSettings;
}
