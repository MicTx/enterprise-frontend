import { apiClient } from '@/utils/apiClient';
import {
  createProject,
  getProject,
  listProjects,
  removeProject,
  updateProject,
} from './projects';
import { queryKeys } from './queryKeys';

jest.mock('@/utils/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('projects 服务', () => {
  beforeEach(() => {
    jest.mocked(apiClient.get).mockReset();
    jest.mocked(apiClient.post).mockReset();
    jest.mocked(apiClient.put).mockReset();
    jest.mocked(apiClient.delete).mockReset();
  });

  it('列表携带分页与关键词参数', () => {
    jest.mocked(apiClient.get).mockResolvedValue({ list: [], total: 0 });
    listProjects({ current: 2, pageSize: 5, keyword: '水体' });
    expect(apiClient.get).toHaveBeenCalledWith('/projects', {
      params: { current: 2, pageSize: 5, keyword: '水体' },
    });
  });

  it('详情/创建/更新/删除走对应端点与方法', () => {
    getProject('p-001');
    expect(apiClient.get).toHaveBeenCalledWith('/projects/p-001');
    createProject({ name: 'n', owner: 'o', status: 'active' });
    expect(apiClient.post).toHaveBeenCalledWith('/projects', {
      name: 'n',
      owner: 'o',
      status: 'active',
    });
    updateProject('p-002', { name: 'm', owner: 'o', status: 'archived' });
    expect(apiClient.put).toHaveBeenCalledWith('/projects/p-002', {
      name: 'm',
      owner: 'o',
      status: 'archived',
    });
    removeProject('p-003');
    expect(apiClient.delete).toHaveBeenCalledWith('/projects/p-003');
  });
});

describe('queryKeys 键形（data-layer 四规则）', () => {
  it('列表键族共享 root 前缀，invalidate 打 root 全失效', () => {
    const root = queryKeys.projects();
    const withParams = queryKeys.projects({ current: 1, pageSize: 10 });
    expect(withParams.slice(0, 1)).toEqual(root);
  });

  it('单实体键挂同 root 的 detail 分支', () => {
    expect(queryKeys.project('p-001')[0]).toBe('projects');
    expect(queryKeys.project('p-001')).toEqual(['projects', 'detail', 'p-001']);
  });
});
