import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { getProject } from '@/services/projects';
import ProjectDetailDrawer from './ProjectDetailDrawer';

jest.mock('@/services/projects', () => ({
  listProjects: jest.fn(),
  getProject: jest.fn(),
  createProject: jest.fn(),
  updateProject: jest.fn(),
  removeProject: jest.fn(),
}));

// 本地类型别名（测试链的 babel 转换不兼容从被测模块混入 type 导入）。
type FixtureProject = {
  id: string;
  name: string;
  status: 'active' | 'archived';
  owner: string;
  updatedAt: string;
  description?: string;
};

const fixture: FixtureProject = {
  id: 'p-008',
  name: '流域水质浮标数据分析',
  status: 'active',
  owner: '周砚',
  updatedAt: '2026-11-13T08:20:00+08:00',
  description: '浮标时序数据清洗与超标告警。',
};

function renderDrawer(projectId: string | null) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ProjectDetailDrawer projectId={projectId} onClose={jest.fn()} />
    </QueryClientProvider>,
  );
}

describe('ProjectDetailDrawer', () => {
  beforeEach(() => {
    jest.mocked(getProject).mockReset();
  });

  it('渲染详情分区字段', async () => {
    jest.mocked(getProject).mockResolvedValue(fixture);
    renderDrawer('p-008');
    expect(await screen.findByText('流域水质浮标数据分析')).toBeInTheDocument();
    expect(screen.getByText('周砚')).toBeInTheDocument();
    expect(screen.getByText('2026-11-13 08:20')).toBeInTheDocument();
    expect(
      screen.getByText('浮标时序数据清洗与超标告警。'),
    ).toBeInTheDocument();
  });

  it('错误态展示重试入口', async () => {
    jest.mocked(getProject).mockRejectedValue(new Error('network'));
    renderDrawer('p-008');
    expect(await screen.findByText('详情加载失败')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^重\s?试$/ }),
    ).toBeInTheDocument();
  });
});
