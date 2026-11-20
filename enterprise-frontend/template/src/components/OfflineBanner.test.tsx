import { fireEvent, render, screen } from '@testing-library/react';
import OfflineBanner from './OfflineBanner';

describe('OfflineBanner', () => {
  it('在线时不渲染', () => {
    const { container } = render(<OfflineBanner />);
    expect(container.innerHTML).toBe('');
  });

  it('offline 事件后显示提示，online 事件后恢复隐藏', () => {
    const { container } = render(<OfflineBanner />);
    fireEvent(window, new Event('offline'));
    expect(screen.getByText('网络连接已断开，请检查网络')).toBeInTheDocument();
    fireEvent(window, new Event('online'));
    expect(container.innerHTML).toBe('');
  });
});
