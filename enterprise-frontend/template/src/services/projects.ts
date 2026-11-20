import { apiClient } from '@/utils/apiClient';

// 项目域服务：CRUD 全部经统一 apiClient（B1——页面不直接 import axios）。
// 本地开发由 mock/ 提供同名端点；接真实后端时只替换实现，不改调用面。

export type ProjectStatus = 'active' | 'archived';

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  owner: string;
  /** ISO 8601 更新时间 */
  updatedAt: string;
  description?: string;
}

export interface ProjectListParams {
  current: number;
  pageSize: number;
  keyword?: string;
}

export interface PageResult<T> {
  list: T[];
  total: number;
}

export interface ProjectFormValues {
  name: string;
  owner: string;
  status: ProjectStatus;
  description?: string;
}

export const listProjects = (params: ProjectListParams) =>
  apiClient.get<PageResult<Project>>('/projects', { params });

export const getProject = (id: string) =>
  apiClient.get<Project>(`/projects/${id}`);

export const createProject = (values: ProjectFormValues) =>
  apiClient.post<Project>('/projects', values);

export const updateProject = (id: string, values: ProjectFormValues) =>
  apiClient.put<Project>(`/projects/${id}`, values);

export const removeProject = (id: string) =>
  apiClient.delete<{ ok: boolean }>(`/projects/${id}`);
