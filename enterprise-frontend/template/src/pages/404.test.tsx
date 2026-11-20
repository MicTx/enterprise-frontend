import { fireEvent, render, screen } from '@testing-library/react';
import NotFound from './404';

const mockNavigate = jest.fn();
jest.mock('@umijs/max', () => ({
  useNavigate: () => mockNavigate,
  FormattedMessage: (props: { id: string; defaultMessage?: string }) =>
    props.defaultMessage ?? props.id,
}));

describe('404 例外页', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it('呈现不存在提示与返回首页入口', () => {
    render(<NotFound />);
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('页面不存在或已被移动。')).toBeInTheDocument();
  });

  it('返回首页走框架导航', () => {
    render(<NotFound />);
    fireEvent.click(screen.getByRole('button', { name: /返回首页/ }));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
