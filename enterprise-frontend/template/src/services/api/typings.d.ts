declare namespace API {
  type DeleteResult = {
    ok: boolean;
  };

  type ErrorBody = {
    success: boolean;
    errorCode: string;
    errorMessage: string;
    showType: string;
  };

  type getProjectParams = {
    /** 项目 ID */
    id: string;
  };

  type listProjectsParams = {
    /** 当前页码，从 1 起 */
    current: number;
    /** 每页条数 */
    pageSize: number;
    /** 命中项目名或负责人的关键词 */
    keyword?: string;
  };

  type PageResult = {
    list: Project[];
    total: number;
  };

  type Project = {
    id: string;
    name: string;
    status: ProjectStatus;
    owner: string;
    /** ISO 8601 更新时间 */
    updatedAt: string;
    description?: string;
  };

  type ProjectData = {
    data: Project;
  };

  type ProjectDeleteData = {
    data: DeleteResult;
  };

  type ProjectFormValues = {
    name: string;
    owner: string;
    status: ProjectStatus;
    description?: string;
  };

  type ProjectPageData = {
    data: PageResult;
  };

  type ProjectStatus = "active" | "archived";

  type removeProjectParams = {
    /** 项目 ID */
    id: string;
  };

  type updateProjectParams = {
    /** 项目 ID */
    id: string;
  };
}
