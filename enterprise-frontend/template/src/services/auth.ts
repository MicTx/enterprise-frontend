import { apiClient } from '@/utils/apiClient';

// 登录接口占位契约（与 /me 同级）：目标仓库接线时按后端真实形状替换。
export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResult {
  token?: string;
}

export const login = (payload: LoginPayload) =>
  apiClient.post<LoginResult>('/auth/login', payload);
