import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { createProject, updateProject } from '@/services/projects';
import ProjectFormModal from './ProjectFormModal';

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
  id: 'p-002',
  name: '全域土地巡查（二期）',
  status: 'active',
  owner: '李清源',
  updatedAt: '2026-11-10T16:40:00+08:00',
  description: '图斑变化检测。',
};

function renderModal(
  props: {
    project?: FixtureProject | null;
    open?: boolean;
    onFinished?: () => void;
  } = {},
) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const onFinished = props.onFinished ?? jest.fn();
  const utils = render(
    <QueryClientProvider client={client}>
      <ProjectFormModal
        open={props.open ?? true}
        project={props.project ?? null}
        onFinished={onFinished}
      />
    </QueryClientProvider>,
  );
  return { ...utils, onFinished, client };
}

describe('ProjectFormModal', () => {
  beforeEach(() => {
    jest.mocked(createProject).mockReset();
    jest.mocked(updateProject).mockReset();
  });

  it('空提交触发必填校验', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /^保\s?存$/ }));
    expect(await screen.findByText('请输入项目名称')).toBeInTheDocument();
    expect(screen.getByText('请输入负责人')).toBeInTheDocument();
    expect(createProject).not.toHaveBeenCalled();
  });

  it('编辑模式回填既有值', async () => {
    renderModal({ project: fixture });
    await waitFor(() =>
      expect(
        (screen.getByLabelText('项目名称') as HTMLInputElement).value,
      ).toBe('全域土地巡查（二期）'),
    );
    expect((screen.getByLabelText('负责人') as HTMLInputElement).value).toBe(
      '李清源',
    );
  });

  it('编辑提交调用更新服务并携带 id', async () => {
    jest.mocked(updateProject).mockResolvedValue(fixture);
    renderModal({ project: fixture });
    fireEvent.change(screen.getByLabelText('负责人'), {
      target: { value: '陈屿' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^保\s?存$/ }));
    await waitFor(() =>
      expect(updateProject).toHaveBeenCalledWith('p-002', {
        name: '全域土地巡查（二期）',
        owner: '陈屿',
        status: 'active',
        description: '图斑变化检测。',
      }),
    );
  });

  it('干净态取消直接关闭，不弹确认', async () => {
    const onFinished = jest.fn();
    renderModal({ onFinished });
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: /^取\s?消$/ }));
    expect(onFinished).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('放弃未保存的更改？')).not.toBeInTheDocument();
  });

  it('编辑模式初始回填不算脏，直接关闭', async () => {
    // 编辑会话刚打开，未做改动——取消必须直接关，不得弹「放弃更改」。
    const onFinished = jest.fn();
    renderModal({ project: fixture, onFinished });
    await screen.findByRole('dialog');
    await waitFor(() =>
      expect(
        (screen.getByLabelText('项目名称') as HTMLInputElement).value,
      ).toBe('全域土地巡查（二期）'),
    );
    fireEvent.click(screen.getByRole('button', { name: /^取\s?消$/ }));
    expect(onFinished).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('放弃未保存的更改？')).not.toBeInTheDocument();
  });

  it('输入后还原为原值视为干净，直接关闭', async () => {
    // 用户改完又改回原值（最终还原），dirty 应回到 false，不再弹确认。
    const onFinished = jest.fn();
    renderModal({ project: fixture, onFinished });
    await screen.findByRole('dialog');
    const nameInput = screen.getByLabelText('项目名称') as HTMLInputElement;
    await waitFor(() => expect(nameInput.value).toBe('全域土地巡查（二期）'));
    fireEvent.change(nameInput, { target: { value: '临时改动' } });
    fireEvent.change(nameInput, { target: { value: '全域土地巡查（二期）' } });
    fireEvent.click(screen.getByRole('button', { name: /^取\s?消$/ }));
    await waitFor(() => expect(onFinished).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('放弃未保存的更改？')).not.toBeInTheDocument();
  });

  it.each(['项目名称', '负责人', '描述'])(
    '新增时将%s还原为空，不打断离开',
    async (field) => {
      const onFinished = jest.fn();
      renderModal({ onFinished });
      const description = await screen.findByLabelText(field);
      fireEvent.change(description, { target: { value: '临时' } });
      fireEvent.change(description, { target: { value: '' } });
      fireEvent.click(screen.getByRole('button', { name: /^取\s?消$/ }));
      expect(onFinished).toHaveBeenCalledTimes(1);
    },
  );

  it('脏数据取消弹确认且默认焦点在继续编辑', async () => {
    const onFinished = jest.fn();
    renderModal({ onFinished });
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText('项目名称'), {
      target: { value: '改过的名字' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^取\s?消$/ }));
    // 弹确认且父级未关闭（antd 多弹层共用同一 title id，按内容文本定位确认框）
    const confirmTitle = await screen.findByText('放弃未保存的更改？');
    const confirm = confirmTitle.closest('[role=dialog]') as HTMLElement;
    expect(confirm).not.toBeNull();
    expect(onFinished).not.toHaveBeenCalled();
    // 非破坏默认：焦点落在「继续编辑」上
    await waitFor(() =>
      expect(
        within(confirm).getByRole('button', { name: /继续编辑/ }),
      ).toHaveFocus(),
    );
    // 选继续编辑：确认框关闭、原表单与输入保留。antd 关闭动画后节点会被
    // 标记为隐藏（display:none）再卸载，因此断「不可见」而非「已卸载」。
    fireEvent.click(within(confirm).getByRole('button', { name: /继续编辑/ }));
    await waitFor(() => {
      const title = screen.queryByText('放弃未保存的更改？');
      if (!title) {
        return;
      }
      const wrap = title.closest('.ant-modal-wrap') as HTMLElement | null;
      expect(wrap).toHaveStyle({ display: 'none' });
    });
    expect(onFinished).not.toHaveBeenCalled();
    expect((screen.getByLabelText('项目名称') as HTMLInputElement).value).toBe(
      '改过的名字',
    );
  });

  it('父级关闭表单时同时收起未决的弃稿确认', async () => {
    const { rerender, client, onFinished } = renderModal();
    fireEvent.change(await screen.findByLabelText('项目名称'), {
      target: { value: '未保存的名称' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^取\s?消$/ }));
    const discard = await screen.findByRole('button', { name: /放弃更改/ });
    rerender(
      <QueryClientProvider client={client}>
        <ProjectFormModal open={false} onFinished={onFinished} />
      </QueryClientProvider>,
    );
    fireEvent.click(discard);
    expect(onFinished).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(createProject).not.toHaveBeenCalled();
  });

  it('继续编辑把焦点交回原输入字段', async () => {
    // 用户上次聚焦「负责人」→ 触发丢弃确认 → 选继续编辑 → 焦点回负责人输入，
    // 不让用户重新找位置。
    renderModal();
    await screen.findByRole('dialog');
    const ownerInput = screen.getByLabelText('负责人') as HTMLInputElement;
    ownerInput.focus();
    fireEvent.change(ownerInput, { target: { value: '张三' } });
    fireEvent.click(screen.getByRole('button', { name: /^取\s?消$/ }));
    const confirmTitle = await screen.findByText('放弃未保存的更改？');
    const confirm = confirmTitle.closest('[role=dialog]') as HTMLElement;
    fireEvent.click(within(confirm).getByRole('button', { name: /继续编辑/ }));
    await waitFor(() => expect(ownerInput).toHaveFocus());
  });

  it('脏数据确认放弃才关闭', async () => {
    const onFinished = jest.fn();
    renderModal({ onFinished });
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText('项目名称'), {
      target: { value: '改过的名字' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^取\s?消$/ }));
    const confirmTitle = await screen.findByText('放弃未保存的更改？');
    const confirm = confirmTitle.closest('[role=dialog]') as HTMLElement;
    fireEvent.click(within(confirm).getByRole('button', { name: /放弃更改/ }));
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('保存进行中重复点击提交只写一次', async () => {
    let resolveCreate: ((v: FixtureProject) => void) | undefined;
    jest.mocked(createProject).mockImplementation(
      () =>
        new Promise<FixtureProject>((resolve) => {
          resolveCreate = resolve;
        }),
    );
    renderModal();
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText('项目名称'), {
      target: { value: '新项目' },
    });
    fireEvent.change(screen.getByLabelText('负责人'), {
      target: { value: '张三' },
    });
    const save = screen.getByRole('button', { name: /^保\s?存$/ });
    fireEvent.click(save);
    fireEvent.click(save);
    fireEvent.click(save);
    await waitFor(() => expect(createProject).toHaveBeenCalledTimes(1));
    resolveCreate?.({ ...fixture, id: 'p-099' });
  });

  it('保存进行中取消按钮与 Esc 均不可用且不出现放弃确认', async () => {
    // 已发出的写入不可撤销——不能给「放弃未保存的更改？」谎称可以撤销。
    // 取消按钮直接禁用，Esc 不触发丢弃确认；遮罩本就不响应点击。
    let resolveCreate: ((v: FixtureProject) => void) | undefined;
    jest.mocked(createProject).mockImplementation(
      () =>
        new Promise<FixtureProject>((resolve) => {
          resolveCreate = resolve;
        }),
    );
    const onFinished = jest.fn();
    renderModal({ onFinished });
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText('项目名称'), {
      target: { value: '新项目' },
    });
    fireEvent.change(screen.getByLabelText('负责人'), {
      target: { value: '张三' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^保\s?存$/ }));
    await waitFor(() => expect(createProject).toHaveBeenCalledTimes(1));
    // 提交进行中：取消按钮禁用
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^取\s?消$/ })).toBeDisabled(),
    );
    // Esc 也不能触发丢弃流程
    fireEvent.keyDown(document.body, { key: 'Escape', keyCode: 27 });
    expect(screen.queryByText('放弃未保存的更改？')).not.toBeInTheDocument();
    expect(onFinished).not.toHaveBeenCalled();
    resolveCreate?.({ ...fixture, id: 'p-100' });
  });

  it('保存失败保留输入并呈现错误', async () => {
    jest.mocked(createProject).mockRejectedValue(new Error('network'));
    renderModal();
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText('项目名称'), {
      target: { value: '新项目' },
    });
    fireEvent.change(screen.getByLabelText('负责人'), {
      target: { value: '张三' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^保\s?存$/ }));
    expect(await screen.findByText('保存失败，请重试')).toBeInTheDocument();
    expect((screen.getByLabelText('项目名称') as HTMLInputElement).value).toBe(
      '新项目',
    );
    expect((screen.getByLabelText('负责人') as HTMLInputElement).value).toBe(
      '张三',
    );
    // 弹层未关闭
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('保存失败后再次编辑并取消走丢弃确认', async () => {
    // 提交失败 = 写入没落库，用户改动仍在表单内；此时取消必须仍走「放弃更改」确认。
    jest.mocked(createProject).mockRejectedValue(new Error('network'));
    const onFinished = jest.fn();
    renderModal({ onFinished });
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText('项目名称'), {
      target: { value: '新项目' },
    });
    fireEvent.change(screen.getByLabelText('负责人'), {
      target: { value: '张三' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^保\s?存$/ }));
    await screen.findByText('保存失败，请重试');
    // 失败后再编辑一次（输入仍可改）
    fireEvent.change(screen.getByLabelText('项目名称'), {
      target: { value: '新项目 v2' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^取\s?消$/ }));
    const confirmTitle = await screen.findByText('放弃未保存的更改？');
    const confirm = confirmTitle.closest('[role=dialog]') as HTMLElement;
    expect(confirm).not.toBeNull();
    expect(onFinished).not.toHaveBeenCalled();
  });

  it('旧请求成功回包不得关闭已重开的新表单', async () => {
    // 场景：编辑 A 的保存挂在途 → 用户取消并新建 B；A 的迟回包不能关 B。
    const onFinished = jest.fn();
    let resolveUpdate: ((v: FixtureProject) => void) | undefined;
    jest.mocked(updateProject).mockImplementation(
      () =>
        new Promise<FixtureProject>((resolve) => {
          resolveUpdate = resolve;
        }),
    );
    const client = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <ProjectFormModal open project={fixture} onFinished={onFinished} />
      </QueryClientProvider>,
    );
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText('负责人'), {
      target: { value: '陈屿' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^保\s?存$/ }));
    await waitFor(() => expect(updateProject).toHaveBeenCalledTimes(1));
    // 上层直接关（不等回包），再开成「新建」
    rerender(
      <QueryClientProvider client={client}>
        <ProjectFormModal
          open={false}
          project={fixture}
          onFinished={onFinished}
        />
      </QueryClientProvider>,
    );
    rerender(
      <QueryClientProvider client={client}>
        <ProjectFormModal open project={null} onFinished={onFinished} />
      </QueryClientProvider>,
    );
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText('项目名称'), {
      target: { value: 'B 项目' },
    });
    // 旧 update 迟到的成功回包
    resolveUpdate?.(fixture);
    await waitFor(() => expect(updateProject).toHaveBeenCalledTimes(1));
    // 新表单仍在，标题仍为「新建项目」
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect((screen.getByLabelText('项目名称') as HTMLInputElement).value).toBe(
      'B 项目',
    );
    // onFinished 一次都不能被旧回包代触发
    expect(onFinished).not.toHaveBeenCalled();
  });

  it('B 提交在途时，A 的迟回成功不得误关 B', async () => {
    // 双向会话竞争：A 的保存挂起 → 上层关闭 → 重开为 B 新建 → B 也提交挂起。
    // A 的迟回包到达时，B 的提交仍在途；A 的成功绝不能替 B 关闭弹层。
    const onFinished = jest.fn();
    let resolveA: ((v: FixtureProject) => void) | undefined;
    let resolveB: ((v: FixtureProject) => void) | undefined;
    jest.mocked(updateProject).mockImplementation(
      () =>
        new Promise<FixtureProject>((resolve) => {
          resolveA = resolve;
        }),
    );
    jest.mocked(createProject).mockImplementation(
      () =>
        new Promise<FixtureProject>((resolve) => {
          resolveB = resolve;
        }),
    );
    const client = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <ProjectFormModal open project={fixture} onFinished={onFinished} />
      </QueryClientProvider>,
    );
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText('负责人'), {
      target: { value: '陈屿' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^保\s?存$/ }));
    await waitFor(() => expect(updateProject).toHaveBeenCalledTimes(1));
    // 上层在 A 回包前直接切到 B（open=false → open=true + project=null）
    rerender(
      <QueryClientProvider client={client}>
        <ProjectFormModal
          open={false}
          project={fixture}
          onFinished={onFinished}
        />
      </QueryClientProvider>,
    );
    rerender(
      <QueryClientProvider client={client}>
        <ProjectFormModal open project={null} onFinished={onFinished} />
      </QueryClientProvider>,
    );
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText('项目名称'), {
      target: { value: 'B 项目' },
    });
    fireEvent.change(screen.getByLabelText('负责人'), {
      target: { value: '李四' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^保\s?存$/ }));
    await waitFor(() => expect(createProject).toHaveBeenCalledTimes(1));
    // 此时 A 的成功回包迟回
    resolveA?.(fixture);
    // B 的弹层不应被 A 的成功关闭
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onFinished).not.toHaveBeenCalled();
    // B 自己的成功回包到达才会触发关闭
    resolveB?.({ ...fixture, id: 'p-b-1', name: 'B 项目', owner: '李四' });
    await waitFor(() => expect(onFinished).toHaveBeenCalledTimes(1));
  });

  it('保存成功后立即触发关闭，不等待列表刷新', async () => {
    // 慢 invalidation 不得拖住 onFinished：写入完成应立即关闭表单，
    // 缓存失效在后台照常进行（mock 的 invalidate 返回 promise 但测试不 await）。
    jest.mocked(createProject).mockResolvedValue({
      ...fixture,
      id: 'p-new-1',
      name: '新项目',
      owner: '张三',
    });
    const onFinished = jest.fn();
    renderModal({ onFinished });
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText('项目名称'), {
      target: { value: '新项目' },
    });
    fireEvent.change(screen.getByLabelText('负责人'), {
      target: { value: '张三' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^保\s?存$/ }));
    // 写入一完成就该关闭——invalidateQueries 是 fire-and-forget
    await waitFor(() => expect(onFinished).toHaveBeenCalledTimes(1));
  });

  it('从有描述的记录切到无描述的新建不串值', async () => {
    const client = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <ProjectFormModal open project={fixture} onFinished={jest.fn()} />
      </QueryClientProvider>,
    );
    await waitFor(() =>
      expect((screen.getByLabelText('描述') as HTMLTextAreaElement).value).toBe(
        '图斑变化检测。',
      ),
    );
    // 同一弹层从编辑切到新建：可选字段必须回到空
    rerender(
      <QueryClientProvider client={client}>
        <ProjectFormModal open project={null} onFinished={jest.fn()} />
      </QueryClientProvider>,
    );
    await waitFor(() =>
      expect((screen.getByLabelText('描述') as HTMLTextAreaElement).value).toBe(
        '',
      ),
    );
    expect((screen.getByLabelText('项目名称') as HTMLInputElement).value).toBe(
      '',
    );
  });
});
