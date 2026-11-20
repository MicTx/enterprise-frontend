import { getIntl } from '@umijs/max';
import { Button, Result } from 'antd';
import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * 全局错误兜底（general-pages §四态一致承载——错误态的 ErrorBoundary 兜底）。
 * 挂 rootContainer 最外层：任一子树渲染抛错时给出可操作的恢复界面，不白屏。
 *
 * 取词走 getIntl()：本组件在 IntlProvider 之外（rootContainer 层），FormattedMessage
 * 无 context 可用；getIntl 读 umi 全局 locale（非 React context），此层可用。
 */
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 控制台保留现场供排查（不吞错）
    console.error('ErrorBoundary 捕获渲染错误:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      const intl = getIntl();
      return (
        <Result
          status="error"
          title={intl.formatMessage({
            id: 'error.boundary.title',
            defaultMessage: '页面渲染出错',
          })}
          subTitle={intl.formatMessage({
            id: 'error.boundary.subtitle',
            defaultMessage: '请刷新页面重试；若持续出现请联系管理员。',
          })}
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              {intl.formatMessage({
                id: 'error.boundary.refresh',
                defaultMessage: '刷新页面',
              })}
            </Button>
          }
        />
      );
    }
    return this.props.children;
  }
}
