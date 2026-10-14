import { render, screen } from '@testing-library/react';
import Home from './Home';

// 模板自带的最小渲染冒烟测试：证明 jest + jsdom + RTL + jest-dom 链路可用；
// 页面扩展后按 testing-guide 五形态补用例，不在此堆积。
describe('Home', () => {
  it('渲染单卡片占位与空态', () => {
    render(<Home />);
    expect(screen.getByText('开始')).toBeInTheDocument();
    expect(screen.getByText('尚无数据')).toBeInTheDocument();
  });
});
