import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

function renderModal(props: { project?: FixtureProject | null } = {}) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ProjectFormModal
        open
        project={props.project ?? null}
        onFinished={jest.fn()}
      />
    </QueryClientProvider>,
  );
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
});
