import type { ProLayoutProps } from '@ant-design/pro-components';
import defaultSettings from '../../config/defaultSettings';

// 运行时偏好：ProLayout settings 整体持久化（localStorage 命名空间键），
// 读时与默认值合并——新增偏好字段自动获得默认值，无需版本迁移。
export type AppSettings = ProLayoutProps & { title?: string };

const STORAGE_KEY = 'my-admin.settings';

export function readSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultSettings };
    return { ...defaultSettings, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    // 损坏数据回落默认值，不阻塞应用启动
    return { ...defaultSettings };
  }
}

export function writeSettings(next: AppSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  emitChange();
}

export function resetSettings(): AppSettings {
  localStorage.removeItem(STORAGE_KEY);
  emitChange();
  return { ...defaultSettings };
}

// 变更订阅：rootContainer 层组件（ThemeProvider）不能用 useModel——它们渲染在
// model Provider 之外（umi 运行时 rootContainer 是最外层包裹）。设置变更经此
// 轻量订阅通知外层主题同步切换，模型层（initialState）由消费方自行更新。
type Listener = (settings: AppSettings) => void;
const listeners = new Set<Listener>();

function emitChange() {
  const snapshot = readSettings();
  for (const listener of listeners) listener(snapshot);
}

export function subscribeSettings(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
