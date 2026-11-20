import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import {
  createProject,
  listProjects,
  removeProject,
} from '@/services/projects';
import Projects from './Projects';

// 本地类型别名（测试链的 babel 转换不兼容从被测模块混入 type 导入）。
type FixtureProject = {
  id: string;
  name: string;
  status: 'active' | 'archived';
  owner: string;
  updatedAt: string;
};

type AccessProps = {
  accessible: boolean;
  children: unknown;
  fallback?: unknown;
};

type MessageProps = {
  id: string;
  defaultMessage?: string;
};

const mockAccess = {
  isLoggedIn: true,
  canAdmin: true,
  canManageProjects: true,
};

jest.mock('@umijs/max', () => ({
  useAccess: () => mockAccess,
  Access: (props: AccessProps) =>
    props.accessible ? props.children : (props.fallback ?? null),
  FormattedMessage: (props: MessageProps) => props.defaultMessage ?? props.id,
  useIntl: () => ({
    formatMessage: (cfg: MessageProps, values?: Record<string, unknown>) =>
      Object.entries(values ?? {}).reduce(
        (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
        cfg.defaultMessage ?? cfg.id ?? '',
      ),
  }),
}));

jest.mock('@/services/projects', () => ({
  listProjects: jest.fn(),
  getProject: jest.fn(),
  createProject: jest.fn(),
  updateProject: jest.fn(),
  removeProject: jest.fn(),
}));

const fixture: FixtureProject = {
  id: 'p-001',
  name: '长三角水体遥感监测',
  status: 'active',
  owner: '陈屿',
  updatedAt: '2026-11-12T09:24:00+08:00',
};

function renderProjects() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <Projects />
    </QueryClientProvider>,
  );
}

describe('Projects 列表页', () => {
  beforeEach(() => {
    jest.mocked(listProjects).mockReset();
    jest.mocked(createProject).mockReset();
    jest.mocked(removeProject).mockReset();
    mockAccess.canManageProjects = true;
  });

  it('渲染数据行、状态标签与总数', async () => {
    jest.mocked(listProjects).mockResolvedValue({
      list: [
        fixture,
        { ...fixture, id: 'p-004', name: '城市热岛分析', status: 'archived' },
      ],
      total: 2,
    });
    renderProjects();
    expect(await screen.findByText('长三角水体遥感监测')).toBeInTheDocument();
    expect(screen.getByText('运行中')).toBeInTheDocument();
    expect(screen.getByText('已归档')).toBeInTheDocument();
    expect(screen.getByText('共 2 条')).toBeInTheDocument();
  });

  it('空列表呈现空态', async () => {
    jest.mocked(listProjects).mockResolvedValue({ list: [], total: 0 });
    renderProjects();
    // 表格空态文案落在 Empty 描述节点（避开文档 <title> 的同名命中）。
    expect(
      await screen.findByText('暂无数据', {
        selector: '.ant-empty-description',
      }),
    ).toBeInTheDocument();
  });

  it('错误态展示重试，重试成功后恢复列表', async () => {
    jest
      .mocked(listProjects)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue({ list: [fixture], total: 1 });
    renderProjects();
    expect(await screen.findByText('列表加载失败')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^重\s?试$/ }));
    expect(await screen.findByText('长三角水体遥感监测')).toBeInTheDocument();
  });

  it('无管理权限时不渲染新建按钮与行内写操作', async () => {
    mockAccess.canManageProjects = false;
    jest.mocked(listProjects).mockResolvedValue({ list: [fixture], total: 1 });
    renderProjects();
    expect(await screen.findByText('长三角水体遥感监测')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /新建项目/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/^删\s?除$/)).not.toBeInTheDocument();
    expect(screen.getByText(/^详\s?情$/)).toBeInTheDocument();
  });

  it('新建弹层打开后提交创建服务', async () => {
    jest.mocked(listProjects).mockResolvedValue({ list: [], total: 0 });
    jest.mocked(createProject).mockResolvedValue(fixture);
    renderProjects();
    fireEvent.click(screen.getByRole('button', { name: /新建项目/ }));
    // 等 dialog 完整挂载（字段注册完成后填写与提交才可靠）
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText('项目名称'), {
      target: { value: '海岸带侵蚀监测' },
    });
    fireEvent.change(screen.getByLabelText('负责人'), {
      target: { value: '沈望舒' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^保\s?存$/ }));
    await waitFor(() =>
      expect(createProject).toHaveBeenCalledWith({
        name: '海岸带侵蚀监测',
        owner: '沈望舒',
        status: 'active',
        description: undefined,
      }),
    );
  });

  it('删除走确认弹层，确认后调用删除服务', async () => {
    jest.mocked(listProjects).mockResolvedValue({ list: [fixture], total: 1 });
    jest.mocked(removeProject).mockResolvedValue({ ok: true });
    renderProjects();
    fireEvent.click(await screen.findByText(/^删\s?除$/));
    expect(
      await screen.findByText('删除项目「长三角水体遥感监测」？', {
        selector: '.ant-modal-confirm-title',
      }),
    ).toBeInTheDocument();
    // 行内删除与确认框 ok 按钮同名，圈定在确认框内点击
    const modal = await screen.findByRole('dialog');
    fireEvent.click(within(modal).getByRole('button', { name: /^删\s?除$/ }));
    await waitFor(() => expect(removeProject).toHaveBeenCalledWith('p-001'));
  });
});
