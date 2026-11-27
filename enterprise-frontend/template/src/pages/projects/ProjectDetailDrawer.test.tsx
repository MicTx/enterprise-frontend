import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

function renderDrawer(
  projectId: string | null,
  onClose: () => void = jest.fn(),
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ProjectDetailDrawer projectId={projectId} onClose={onClose} />
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

  it('关闭过程不闪骨架屏：projectId 清空不应触发 pending 渲染', async () => {
    // 场景：详情已加载成功，用户点关闭 → 父级把 projectId 置 null。
    // 此刻 query 仍 enabled=false、data 保留；若 UI 分支按 isPending 渲染骨架，
    // 关闭动画期间会闪一下骨架。断言关闭中不再出现 Skeleton 节点。
    jest.mocked(getProject).mockResolvedValue(fixture);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const onClose = jest.fn();
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <ProjectDetailDrawer projectId="p-008" onClose={onClose} />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('流域水质浮标数据分析')).toBeInTheDocument();
    // 关闭：父级置 null
    rerender(
      <QueryClientProvider client={client}>
        <ProjectDetailDrawer projectId={null} onClose={onClose} />
      </QueryClientProvider>,
    );
    // 抽屉关闭动画期间内容树仍在（destroyOnHidden 是关闭后销毁），
    // 但绝不能渲染 Skeleton。
    expect(document.querySelector('.ant-skeleton')).toBeNull();
  });

  it('B 仍在加载时关闭，不得在离场帧中闪回 A 的详情', async () => {
    jest
      .mocked(getProject)
      .mockResolvedValueOnce(fixture)
      .mockImplementationOnce(() => new Promise(() => {}));
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const view = (id: string | null) => (
      <QueryClientProvider client={client}>
        <ProjectDetailDrawer projectId={id} onClose={jest.fn()} />
      </QueryClientProvider>
    );
    const { rerender } = render(view('p-008'));
    await screen.findByText(fixture.name);
    rerender(view('p-003'));
    await waitFor(() =>
      expect(document.querySelector('.ant-skeleton')).not.toBeNull(),
    );
    rerender(view(null));
    expect(screen.queryByText(fixture.name)).not.toBeInTheDocument();
  });

  it('Drawer onClose 回调正确触发父级关闭', async () => {
    jest.mocked(getProject).mockResolvedValue(fixture);
    const onClose = jest.fn();
    renderDrawer('p-008', onClose);
    await screen.findByText('流域水质浮标数据分析');
    // antd Drawer 的关闭按钮
    const closeBtn = document.querySelector(
      '.ant-drawer-close',
    ) as HTMLButtonElement;
    fireEvent.click(closeBtn);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
