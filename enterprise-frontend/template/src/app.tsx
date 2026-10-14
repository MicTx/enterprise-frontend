import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { apiClient } from './utils/apiClient';
import type { InitialState } from './utils/authGuard';

// 服务端状态全走 React Query（data-layer §状态归属三分）；
// 应用初始态（currentUser）归框架 initialState。
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export async function getInitialState(): Promise<InitialState> {
  try {
    const currentUser =
      await apiClient.get<NonNullable<InitialState['currentUser']>>('/me');
    return { currentUser };
  } catch {
    return {};
  }
}

export function rootContainer(container: React.ReactNode) {
  return React.createElement(
    QueryClientProvider,
    { client: queryClient },
    container,
  );
}
