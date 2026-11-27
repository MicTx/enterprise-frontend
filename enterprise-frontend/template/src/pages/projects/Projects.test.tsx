import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import dayjs from 'dayjs';
import {
  createProject,
  getProject,
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

// 文案渲染记录（按 id 计次）：锁行隔离断言用——静态列在占位锁行期间
// 不得重渲染。jest.mock 工厂只允许引用 mock 前缀的外部变量。
let mockMessageRenderIds: string[] = [];
const messageRendersOf = (id: string) =>
  mockMessageRenderIds.filter((rendered) => rendered === id).length;

jest.mock('@umijs/max', () => ({
  useAccess: () => mockAccess,
  Access: (props: AccessProps) =>
    props.accessible ? props.children : (props.fallback ?? null),
  FormattedMessage: (props: MessageProps) => {
    mockMessageRenderIds = [...mockMessageRenderIds, props.id];
    return props.defaultMessage ?? props.id;
  },
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
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
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
    mockMessageRenderIds = [];
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

  it('有旧数据时刷新失败保留旧行并就地错误，不打回骨架', async () => {
    // 翻页/重拉失败时 keepPreviousData 已给了上一页数据：该场景要把旧行
    // 留在屏上并以就地 Alert 呈现错误，而不是退回骨架屏或整页错误块。
    jest
      .mocked(listProjects)
      .mockResolvedValueOnce({ list: [fixture], total: 12 })
      .mockRejectedValueOnce(new Error('network'));
    renderProjects();
    expect(await screen.findByText('长三角水体遥感监测')).toBeInTheDocument();
    // 触发一次失败的 refetch（模拟翻页失败：直接重跑当前查询）
    // 通过翻页触发（total=12 > pageSize=10，有第二页）
    fireEvent.click(screen.getByTitle('2'));
    // 失败期间旧行仍在（placeholderData 保留），不回落骨架屏
    expect(screen.getByText('长三角水体遥感监测')).toBeInTheDocument();
    expect(document.querySelector('.ant-skeleton')).toBeNull();
    // 就地错误条可见且不打断上下文
    expect(
      await screen.findByText('刷新失败，已保留上次结果'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^删\s?除$/ })).toBeDisabled();
  });

  it('检索无匹配时说明结果，而不是误称项目库为空', async () => {
    jest
      .mocked(listProjects)
      .mockResolvedValueOnce({ list: [fixture], total: 1 })
      .mockResolvedValueOnce({ list: [], total: 0 });
    renderProjects();
    await screen.findByText(fixture.name);
    const input = screen.getByPlaceholderText('搜索名称/负责人');
    fireEvent.change(input, { target: { value: '没有这个项目' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', keyCode: 13 });
    expect(await screen.findByText('没有匹配的项目')).toBeInTheDocument();
  });

  it('慢翻页占位期间行操作禁用，避免打到旧数据', async () => {
    // keepPreviousData 让旧行占位；但翻页中的「编辑/删除/详情」指向的是
    // 旧页对象，若可点会把操作打到错误记录上。占位期间行操作必须禁用。
    let resolvePage2:
      | ((v: { list: FixtureProject[]; total: number }) => void)
      | undefined;
    jest
      .mocked(listProjects)
      .mockResolvedValueOnce({ list: [fixture], total: 12 })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolvePage2 = resolve;
          }),
      );
    renderProjects();
    expect(await screen.findByText('长三角水体遥感监测')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('2'));
    // 占位期间：旧行的编辑/删除不可点
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^编\s?辑$/ })).toBeDisabled(),
    );
    expect(screen.getByRole('button', { name: /^删\s?除$/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^详\s?情$/ })).toBeDisabled();
    // 回包到达后恢复可点
    resolvePage2?.({ list: [{ ...fixture, id: 'p-011' }], total: 12 });
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /^编\s?辑$/ }),
      ).not.toBeDisabled(),
    );
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

  it('删除确认默认焦点在取消，连按 Enter 不产生 DELETE', async () => {
    jest.mocked(listProjects).mockResolvedValue({ list: [fixture], total: 1 });
    jest.mocked(removeProject).mockResolvedValue({ ok: true });
    renderProjects();
    fireEvent.click(await screen.findByText(/^删\s?除$/));
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText('删除项目「长三角水体遥感监测」？'),
    ).toBeInTheDocument();
    // 非破坏默认：焦点落「取消」，键盘用户连按 Enter 走安全路径
    const cancelBtn = within(dialog).getByRole('button', { name: /^取\s?消$/ });
    await waitFor(() => expect(cancelBtn).toHaveFocus());
    fireEvent.keyDown(cancelBtn, { key: 'Enter', code: 'Enter' });
    fireEvent.keyDown(cancelBtn, { key: 'Enter', code: 'Enter' });
    fireEvent.click(cancelBtn);
    await waitFor(() => expect(removeProject).not.toHaveBeenCalled());
  });

  it('删除确认取消不发请求', async () => {
    jest.mocked(listProjects).mockResolvedValue({ list: [fixture], total: 1 });
    renderProjects();
    fireEvent.click(await screen.findByText(/^删\s?除$/));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /^取\s?消$/ }));
    expect(removeProject).not.toHaveBeenCalled();
  });

  it('删除失败保留该行并就地错误', async () => {
    jest.mocked(listProjects).mockResolvedValue({ list: [fixture], total: 1 });
    jest.mocked(removeProject).mockRejectedValue(new Error('network'));
    renderProjects();
    fireEvent.click(await screen.findByText(/^删\s?除$/));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /^删\s?除$/ }));
    // 失败：行保留 + 就地错误可见
    expect(await screen.findByText('删除失败，请重试')).toBeInTheDocument();
    expect(screen.getByText('长三角水体遥感监测')).toBeInTheDocument();
  });

  it('删除走确认弹层，确认后调用删除服务', async () => {
    jest.mocked(listProjects).mockResolvedValue({ list: [fixture], total: 1 });
    jest.mocked(removeProject).mockResolvedValue({ ok: true });
    renderProjects();
    fireEvent.click(await screen.findByText(/^删\s?除$/));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /^删\s?除$/ }));
    await waitFor(() => expect(removeProject).toHaveBeenCalledWith('p-001'));
  });

  it('开合详情/编辑覆层不重绘表体：行 DOM 不变、列渲染不重跑', async () => {
    // 覆层状态（detailId / editing / formOpen）挂在 Projects 顶层，既往实现
    // 每次开合都令整页 re-render：columns/pagination/scroll/locale 全是新对象，
    // ProTable 全表 cell render 重跑（updatedAt 的 dayjs.format 每行一次）。
    // 隔离后表体应保持子树稳定：行 DOM 不被替换、列渲染函数不再被调用。
    const originalFormat = dayjs.prototype.format;
    const formatSpy = jest
      .spyOn(dayjs.prototype, 'format')
      .mockImplementation(function (this: unknown, ...args: unknown[]) {
        return (originalFormat as (...a: unknown[]) => string).apply(
          this,
          args,
        );
      });
    try {
      // 100 条数据进来（分页后可视行 10），让列渲染基数可见。
      const rows = Array.from({ length: 100 }, (_, i) => ({
        ...fixture,
        id: `p-${String(i + 1).padStart(3, '0')}`,
        name: `项目 ${i + 1}`,
      }));
      jest.mocked(listProjects).mockResolvedValue({ list: rows, total: 100 });
      jest.mocked(getProject).mockResolvedValue(rows[0]);
      renderProjects();
      await screen.findByText('项目 1');
      await waitFor(() =>
        expect(
          document.querySelectorAll('.ant-table-tbody tr.ant-table-row').length,
        ).toBe(10),
      );

      // 盯住表体行 DOM：覆层开合不得引起行级增删。
      const tbody = document.querySelector('.ant-table-tbody');
      if (!tbody) throw new Error('tbody 未挂载');
      let rowMutations = 0;
      const observer = new MutationObserver((muts) => {
        for (const m of muts) {
          rowMutations += m.addedNodes.length + m.removedNodes.length;
        }
      });
      observer.observe(tbody, { childList: true, subtree: true });

      const baselineCalls = formatSpy.mock.calls.length;
      // 打开详情抽屉 → 只允许抽屉自身的 format（≤+1），列表 10 行 cell
      // render 不得重跑。
      fireEvent.click(screen.getAllByRole('button', { name: /^详\s?情$/ })[0]);
      await screen.findByRole('dialog');
      // 等详情数据落位（drawer 自身 format 至多 +1）。
      await waitFor(() => expect(getProject).toHaveBeenCalled());
      await waitFor(() =>
        expect(formatSpy.mock.calls.length - baselineCalls).toBeLessThanOrEqual(
          1,
        ),
      );
      const afterOpenCalls = formatSpy.mock.calls.length;
      // 关闭抽屉（prop 变化合法，至多再 +1 次自身 format），
      // 再开编辑弹层：整段过程不得再触表体 cell 渲染。
      const closeBtn = document.querySelector('.ant-drawer-close');
      if (closeBtn) fireEvent.click(closeBtn as Element);
      await waitFor(() =>
        expect(document.querySelector('.ant-drawer-open')).toBeNull(),
      );
      fireEvent.click(screen.getAllByRole('button', { name: /^编\s?辑$/ })[0]);
      await screen.findByRole('dialog');
      observer.disconnect();
      // 行 DOM 从未被增删（表体未被重画）。
      expect(rowMutations).toBe(0);
      // 覆层开合期间的 format 增量 ≤2（抽屉开关各 1），表体零次——
      // 若表体被波及，10 行 cell render 会一次性贡献 10 次 format。
      expect(formatSpy.mock.calls.length - baselineCalls).toBeLessThanOrEqual(
        2,
      );
      // 抽屉自身 format 已计；编辑弹层开合后不应再有新增。
      expect(formatSpy.mock.calls.length - afterOpenCalls).toBeLessThanOrEqual(
        1,
      );
    } finally {
      formatSpy.mockRestore();
    }
  });

  it('检索占位锁行不重跑静态列；行操作真实禁用，指针与键盘都激活不了', async () => {
    // 表格根每渲染一次，@rc-component/table 都会让全部单元格重算内容。
    // 锁行（keepPreviousData 占位）期间，逐行静态内容——状态标签、日期
    // 格式化——不应重跑；重渲染的只有行操作，且必须带真实 disabled。
    const rows = Array.from({ length: 6 }, (_, i) => ({
      ...fixture,
      id: `p-${String(i + 1).padStart(3, '0')}`,
      name: `项目 ${i + 1}`,
      status: i % 2 === 0 ? ('active' as const) : ('archived' as const),
      updatedAt: `2026-11-${String((i % 27) + 1).padStart(2, '0')}T09:24:00+08:00`,
    }));
    let releaseSearch: (value: {
      list: FixtureProject[];
      total: number;
    }) => void = () => {};
    const unsettledSearch = new Promise<{
      list: FixtureProject[];
      total: number;
    }>((resolve) => {
      releaseSearch = resolve;
    });
    jest
      .mocked(listProjects)
      .mockImplementation((params) =>
        params.keyword === '项目'
          ? unsettledSearch
          : Promise.resolve({ list: rows, total: 6 }),
      );
    renderProjects();
    expect(await screen.findByText('项目 1')).toBeInTheDocument();

    const originalFormat = dayjs.prototype.format;
    const formatSpy = jest
      .spyOn(dayjs.prototype, 'format')
      .mockImplementation(function (this: unknown, ...args: unknown[]) {
        return (originalFormat as (...a: unknown[]) => string).apply(
          this,
          args,
        );
      });
    try {
      const formatsBefore = formatSpy.mock.calls.length;
      // 首屏挂载已渲染过每个状态文案（每条 active / archived 行一次）。
      const statusRendersBefore = {
        active: messageRendersOf('projects.status.active'),
        archived: messageRendersOf('projects.status.archived'),
      };
      const input = screen.getByPlaceholderText('搜索名称/负责人');
      fireEvent.change(input, { target: { value: '项目' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', keyCode: 13 });

      // 锁行已提交：旧行仍在、行操作全部带真实 disabled。
      const editButtons = screen.getAllByRole('button', { name: /^编\s?辑$/ });
      const detailButtons = screen.getAllByRole('button', {
        name: /^详\s?情$/,
      });
      const removeButtons = screen.getAllByRole('button', {
        name: /^删\s?除$/,
      });
      expect(screen.getByText('项目 6')).toBeInTheDocument();
      await waitFor(() =>
        expect(
          document.querySelector('.ant-spin[aria-busy="true"]'),
        ).toBeInTheDocument(),
      );
      for (const button of [
        ...editButtons,
        ...detailButtons,
        ...removeButtons,
      ]) {
        expect(button).toHaveAttribute('disabled');
      }
      // 静态列在锁行期间零次重跑：日期格式化与状态文案都停在基线。
      expect(formatSpy.mock.calls.length).toBe(formatsBefore);
      expect(messageRendersOf('projects.status.active')).toBe(
        statusRendersBefore.active,
      );
      expect(messageRendersOf('projects.status.archived')).toBe(
        statusRendersBefore.archived,
      );

      // 禁用是真实失效而不只是变灰：键盘够不着、指针点了没反应、
      // 无障碍树读作 disabled（原生 disabled 属性）。
      const firstEdit = editButtons[0];
      firstEdit.focus();
      expect(firstEdit).not.toHaveFocus();
      fireEvent.keyDown(firstEdit, { key: 'Enter', code: 'Enter' });
      fireEvent.keyUp(firstEdit, { key: 'Enter', code: 'Enter' });
      fireEvent.click(firstEdit);
      fireEvent.click(detailButtons[0]);
      fireEvent.click(removeButtons[0]);
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(removeProject).not.toHaveBeenCalled();

      // 回包：记录换新引用（第 2 行内容变化）→ 行操作恢复，静态列重算。
      const replacement = {
        list: rows.map((row, i) =>
          i === 1
            ? {
                ...row,
                status: 'active' as const,
                updatedAt: '2026-12-31T23:59:00+08:00',
              }
            : row,
        ),
        total: 6,
      };
      await act(async () => {
        releaseSearch(replacement);
        await unsettledSearch;
      });
      expect(await screen.findByText('2026-12-31 23:59')).toBeInTheDocument();
      await waitFor(() =>
        expect(
          screen.getAllByRole('button', { name: /^编\s?辑$/ })[0],
        ).not.toHaveAttribute('disabled'),
      );
      expect(screen.getAllByText('已归档')).toHaveLength(2);
    } finally {
      formatSpy.mockRestore();
    }
  });
});
