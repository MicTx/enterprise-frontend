import { QueryClient } from '@tanstack/react-query';

// 服务端状态全走 React Query（data-layer §状态归属三分）；
// 应用初始态（currentUser）归框架 initialState。
// 独立模块而非 app.tsx 导出：umi 运行时注册器只接受白名单键
// （request/getInitialState/layout/rootContainer 等），多余导出会 register failed。
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});
