import { request } from '@umijs/max';

// 统一 apiClient：框架 request 的薄封装，与框架 request 共用 src/app.tsx 的运行时配置
// （/api 前缀、同源 Bearer、401 收敛）；页面不直接 import axios（B1）。
// 默认 skipErrorHandler：业务错误由调用方的四态承载处理，401 仍由统一 errorHandler 收敛。

// dataField 解包：框架 request() 直调只回 HTTP body（dataField 只作用于 useRequest），
// 这里按 config.ts 声明的 dataField='data' 契约统一解包——mock 与后端都以 { data: ... }
// 包裹业务载荷；无该字段的响应原样返回。
function extractData<T>(body: unknown): T {
  if (
    body !== null &&
    typeof body === 'object' &&
    'data' in (body as Record<string, unknown>)
  ) {
    return (body as Record<string, unknown>).data as T;
  }
  return body as T;
}

const skip = { skipErrorHandler: true };

export const apiClient = {
  get: async <T>(url: string, opts?: Record<string, unknown>) =>
    extractData<T>(await request<T>(url, { method: 'GET', ...skip, ...opts })),
  post: async <T>(
    url: string,
    data?: unknown,
    opts?: Record<string, unknown>,
  ) =>
    extractData<T>(
      await request<T>(url, { method: 'POST', data, ...skip, ...opts }),
    ),
  put: async <T>(url: string, data?: unknown, opts?: Record<string, unknown>) =>
    extractData<T>(
      await request<T>(url, { method: 'PUT', data, ...skip, ...opts }),
    ),
  patch: async <T>(
    url: string,
    data?: unknown,
    opts?: Record<string, unknown>,
  ) =>
    extractData<T>(
      await request<T>(url, { method: 'PATCH', data, ...skip, ...opts }),
    ),
  delete: async <T>(url: string, opts?: Record<string, unknown>) =>
    extractData<T>(
      await request<T>(url, { method: 'DELETE', ...skip, ...opts }),
    ),
};
