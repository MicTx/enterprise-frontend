import apiIndex from './api';
import {
  createProject,
  getProject,
  listProjects,
  removeProject,
  updateProject,
} from './api/projects';

// OpenAPI 生成层冒烟（npm run openapi → src/services/api/）。
// 生成目录在重生成时会被清空，本文件固定放在生成目录外；
// 仅断言生成面可导入、函数性符合生成约定，不发起真实请求。
// 调用面形状：页面经 src/services/openapiAdapter.ts 解包消费（见 openapiAdapter.test.ts
// 的生成层/演示层形状一致断言），不直接消费生成层的 { data } 包装。
describe('openapi 生成服务层（src/services/api）', () => {
  it('五端点函数按 operationId 生成约定导出且可调用', () => {
    expect(typeof listProjects).toBe('function');
    expect(typeof getProject).toBe('function');
    expect(typeof createProject).toBe('function');
    expect(typeof updateProject).toBe('function');
    expect(typeof removeProject).toBe('function');
  });

  it('生成的 tag 分组入口暴露同一批端点函数', () => {
    expect(typeof apiIndex.projects.listProjects).toBe('function');
    expect(typeof apiIndex.projects.getProject).toBe('function');
    expect(typeof apiIndex.projects.createProject).toBe('function');
    expect(typeof apiIndex.projects.updateProject).toBe('function');
    expect(typeof apiIndex.projects.removeProject).toBe('function');
  });
});
