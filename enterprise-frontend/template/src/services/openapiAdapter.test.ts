import { request } from '@umijs/max';
import * as generated from './api/projects';
import * as adapter from './openapiAdapter';
import * as demo from './projects';

// 生成层与演示层都经框架 request；后端按 config.ts 的 dataField='data' 契约
// 统一返回 { data: 载荷 } 包装。打桩 request 即可对比两条消费面的解包结果。
jest.mock('@umijs/max', () => ({ request: jest.fn() }));

const mockedRequest = request as unknown as jest.Mock;

const project = {
  id: 'p-001',
  name: '水体提取',
  status: 'active' as const,
  owner: '张三',
  updatedAt: '2026-11-19T00:00:00.000Z',
};

const page = { list: [project], total: 1 };

const form = {
  name: '水体提取',
  owner: '张三',
  status: 'active' as const,
};

describe('openapiAdapter（生成层解包消费层）', () => {
  beforeEach(() => {
    mockedRequest.mockReset();
  });

  it('列表：生成层原始形状带 data 包装，adapter 与演示层同为 PageResult 直返', async () => {
    mockedRequest.mockResolvedValue({ data: page });
    expect(await generated.listProjects({ current: 1, pageSize: 10 })).toEqual({
      data: page,
    });
    const fromAdapter = await adapter.listProjects({
      current: 1,
      pageSize: 10,
    });
    const fromDemo = await demo.listProjects({ current: 1, pageSize: 10 });
    expect(fromAdapter).toEqual(page);
    expect(fromAdapter).not.toHaveProperty('data');
    expect(fromAdapter).toEqual(fromDemo);
  });

  it('详情：adapter 与演示层同为 Project 直返', async () => {
    mockedRequest.mockResolvedValue({ data: project });
    expect(await generated.getProject({ id: 'p-001' })).toEqual({
      data: project,
    });
    const fromAdapter = await adapter.getProject('p-001');
    const fromDemo = await demo.getProject('p-001');
    expect(fromAdapter).toEqual(project);
    expect(fromAdapter).not.toHaveProperty('data');
    expect(fromAdapter).toEqual(fromDemo);
  });

  it('创建：adapter 与演示层同为 Project 直返', async () => {
    mockedRequest.mockResolvedValue({ data: project });
    expect(await generated.createProject(form)).toEqual({ data: project });
    const fromAdapter = await adapter.createProject(form);
    const fromDemo = await demo.createProject(form);
    expect(fromAdapter).toEqual(project);
    expect(fromAdapter).toEqual(fromDemo);
  });

  it('更新：adapter 与演示层同为 Project 直返', async () => {
    mockedRequest.mockResolvedValue({ data: project });
    expect(await generated.updateProject({ id: 'p-001' }, form)).toEqual({
      data: project,
    });
    const fromAdapter = await adapter.updateProject('p-001', form);
    const fromDemo = await demo.updateProject('p-001', form);
    expect(fromAdapter).toEqual(project);
    expect(fromAdapter).toEqual(fromDemo);
  });

  it('删除：adapter 与演示层同为 DeleteResult 直返', async () => {
    const deleteResult = { ok: true };
    mockedRequest.mockResolvedValue({ data: deleteResult });
    expect(await generated.removeProject({ id: 'p-001' })).toEqual({
      data: deleteResult,
    });
    const fromAdapter = await adapter.removeProject('p-001');
    const fromDemo = await demo.removeProject('p-001');
    expect(fromAdapter).toEqual(deleteResult);
    expect(fromAdapter).toEqual(fromDemo);
  });
});
