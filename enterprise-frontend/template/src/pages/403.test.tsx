import { fireEvent, render, screen } from '@testing-library/react';
import Forbidden from './403';

const mockNavigate = jest.fn();
jest.mock('@umijs/max', () => ({
  useNavigate: () => mockNavigate,
  FormattedMessage: (props: { id: string; defaultMessage?: string }) =>
    props.defaultMessage ?? props.id,
}));

describe('403 例外页', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it('呈现无权提示与返回首页入口', () => {
    render(<Forbidden />);
    expect(screen.getByText('403')).toBeInTheDocument();
    expect(
      screen.getByText('没有该页面的访问权限，请联系管理员开通。'),
    ).toBeInTheDocument();
  });

  it('返回首页走框架导航', () => {
    render(<Forbidden />);
    fireEvent.click(screen.getByRole('button', { name: /返回首页/ }));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
