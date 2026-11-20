// OpenAPI 生成层的解包消费层（生成目录外：重生成即清空 src/services/api/，本文件保留）。
// config/config.ts 的 request 契约 dataField='data'：生成层返回 { data: 业务载荷 } 包装，
// 这里统一解包，使调用面与演示层 src/services/projects.ts 同为直返形状
// （PageResult / Project / DeleteResult），页面接生成层时经本 adapter，不直接拿包装形状。
import {
  createProject as createProjectGenerated,
  getProject as getProjectGenerated,
  listProjects as listProjectsGenerated,
  removeProject as removeProjectGenerated,
  updateProject as updateProjectGenerated,
} from './api/projects';
import type {
  PageResult,
  Project,
  ProjectFormValues,
  ProjectListParams,
} from './projects';

function unwrapData<T>(payload: { data: T }): T {
  return payload.data;
}

export const listProjects = async (
  params: ProjectListParams,
): Promise<PageResult<Project>> =>
  unwrapData(await listProjectsGenerated(params));

export const getProject = async (id: string): Promise<Project> =>
  unwrapData(await getProjectGenerated({ id }));

export const createProject = async (
  values: ProjectFormValues,
): Promise<Project> => unwrapData(await createProjectGenerated(values));

export const updateProject = async (
  id: string,
  values: ProjectFormValues,
): Promise<Project> => unwrapData(await updateProjectGenerated({ id }, values));

export const removeProject = async (id: string): Promise<{ ok: boolean }> =>
  unwrapData(await removeProjectGenerated({ id }));
