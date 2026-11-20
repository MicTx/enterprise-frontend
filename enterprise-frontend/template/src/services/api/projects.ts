// @ts-ignore
/* eslint-disable */
import { request } from "@umijs/max";

/** 分页查询项目列表 GET /projects */
export async function listProjects(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.listProjectsParams,
  options?: { [key: string]: any }
) {
  return request<API.ProjectPageData>("/projects", {
    method: "GET",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 新建项目 POST /projects */
export async function createProject(
  body: API.ProjectFormValues,
  options?: { [key: string]: any }
) {
  return request<API.ProjectData>("/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 查询项目详情 GET /projects/${param0} */
export async function getProject(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getProjectParams,
  options?: { [key: string]: any }
) {
  const { id: param0, ...queryParams } = params;
  return request<API.ProjectData>(`/projects/${param0}`, {
    method: "GET",
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 更新项目 PUT /projects/${param0} */
export async function updateProject(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.updateProjectParams,
  body: API.ProjectFormValues,
  options?: { [key: string]: any }
) {
  const { id: param0, ...queryParams } = params;
  return request<API.ProjectData>(`/projects/${param0}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    params: { ...queryParams },
    data: body,
    ...(options || {}),
  });
}

/** 删除项目 DELETE /projects/${param0} */
export async function removeProject(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.removeProjectParams,
  options?: { [key: string]: any }
) {
  const { id: param0, ...queryParams } = params;
  return request<API.ProjectDeleteData>(`/projects/${param0}`, {
    method: "DELETE",
    params: { ...queryParams },
    ...(options || {}),
  });
}
