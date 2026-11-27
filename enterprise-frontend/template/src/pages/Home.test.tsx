import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { login } from '@/services/auth';
import { hardNavigate } from '@/utils/authRedirect';
import Home from './Home';

jest.mock('@/services/auth', () => ({ login: jest.fn() }));
jest.mock('@/utils/authRedirect', () => ({
  ...jest.requireActual('@/utils/authRedirect'),
  hardNavigate: jest.fn(),
}));

function renderHome() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <Home />
    </QueryClientProvider>,
  );
}

function submitLogin() {
  fireEvent.change(screen.getByLabelText('用户名'), { target: { value: 'u' } });
  fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'p' } });
  // antd 在两字中文按钮文案间自动插空格，可访问名称为「登 录」。
  fireEvent.click(screen.getByRole('button', { name: /^登\s?录$/ }));
}

describe('Home', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.mocked(login).mockReset();
    jest.mocked(hardNavigate).mockReset();
    window.history.replaceState(null, '', '/');
  });

  it('无回跳目标的首页直接提供项目入口，不显示没有数据的误导文案', () => {
    renderHome();
    expect(screen.getByText('开始')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '查看项目' })).toHaveAttribute(
      'href',
      '/projects',
    );
    expect(screen.queryByText('尚无数据')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('login=1 打开登录弹层，登录成功写 token 并回跳同源 redirect', async () => {
    window.history.replaceState(
      null,
      '',
      '/?login=1&redirect=%2Forders%3Fp%3D2',
    );
    jest.mocked(login).mockResolvedValue({ token: 't-1' });
    renderHome();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    submitLogin();
    await waitFor(() =>
      expect(hardNavigate).toHaveBeenCalledWith('/orders?p=2'),
    );
    expect(localStorage.getItem('token')).toBe('t-1');
  });

  it('外域 redirect 回退首页，不做开放重定向', async () => {
    window.history.replaceState(
      null,
      '',
      '/?login=1&redirect=%2F%2Fevil.example',
    );
    jest.mocked(login).mockResolvedValue({ token: 't-2' });
    renderHome();
    submitLogin();
    await waitFor(() => expect(hardNavigate).toHaveBeenCalledWith('/'));
  });

  it('登录失败显示错误态且不跳转', async () => {
    window.history.replaceState(null, '', '/?login=1');
    jest.mocked(login).mockRejectedValue(new Error('401'));
    renderHome();
    submitLogin();
    expect(await screen.findByText('登录失败，请重试')).toBeInTheDocument();
    expect(hardNavigate).not.toHaveBeenCalled();
  });
});
