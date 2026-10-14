import { request } from '@umijs/max';

// 统一 apiClient：页面不直接 import axios（B1）；HTTP 走框架 request 或本客户端。
// 默认 skipErrorHandler：错误收敛到 config.ts 的统一 errorHandler（含 401 收敛）。

const skip = { skipErrorHandler: true };

export const apiClient = {
  get: <T>(url: string, opts?: Record<string, unknown>) =>
    request<T>(url, { method: 'GET', ...skip, ...opts }),
  post: <T>(url: string, data?: unknown, opts?: Record<string, unknown>) =>
    request<T>(url, { method: 'POST', data, ...skip, ...opts }),
  put: <T>(url: string, data?: unknown, opts?: Record<string, unknown>) =>
    request<T>(url, { method: 'PUT', data, ...skip, ...opts }),
  patch: <T>(url: string, data?: unknown, opts?: Record<string, unknown>) =>
    request<T>(url, { method: 'PATCH', data, ...skip, ...opts }),
  delete: <T>(url: string, opts?: Record<string, unknown>) =>
    request<T>(url, { method: 'DELETE', ...skip, ...opts }),
};
