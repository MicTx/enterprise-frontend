import { render, screen } from '@testing-library/react';
import { getIntl } from '@umijs/max';
import { createIntl } from '@umijs/plugins/node_modules/react-intl';
import enUS from '../locales/en-US';
import zhCN from '../locales/zh-CN';
import ErrorBoundary from './ErrorBoundary';

// jest 链无 umi 插件运行时（getPluginManager 为 null，ThemeProvider.test.tsx 已注记
// 同类问题并打桩）：真调 getIntl 会抛 TypeError，故按模板既有模式打桩。
// getIntl 读全局 g_intl/localStorage umi_locale，不读 React context——语言差异只由
// 桩的 locale 驱动；消息表直接 import locales 目录，不在测试内复写文案。
jest.mock('@umijs/max', () => ({ getIntl: jest.fn() }));

const mockedGetIntl = getIntl as unknown as jest.Mock;
const intlFor = (locale: string) =>
  createIntl({ locale, messages: locale === 'en-US' ? enUS : zhCN });

function Bomb({ crash }: { crash: boolean }) {
  if (crash) throw new Error('boom');
  return <div>正常内容</div>;
}

describe('ErrorBoundary', () => {
  it('子树正常时原样渲染', () => {
    mockedGetIntl.mockReturnValue(intlFor('zh-CN'));
    render(
      <ErrorBoundary>
        <Bomb crash={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('正常内容')).toBeInTheDocument();
  });

  it('zh-CN：子树抛错时按目录文案呈现兜底界面与刷新入口', () => {
    mockedGetIntl.mockReturnValue(intlFor('zh-CN'));
    render(
      <ErrorBoundary>
        <Bomb crash />
      </ErrorBoundary>,
    );
    expect(screen.getByText('页面渲染出错')).toBeInTheDocument();
    expect(screen.getByText(/请刷新页面重试/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /刷新页面/ }),
    ).toBeInTheDocument();
  });

  it('en-US：取词随 locale 走目录对译（不落 defaultMessage 中文回退）', () => {
    mockedGetIntl.mockReturnValue(intlFor('en-US'));
    render(
      <ErrorBoundary>
        <Bomb crash />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Page failed to render')).toBeInTheDocument();
    expect(screen.getByText(/Refresh the page and retry/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Refresh page/ }),
    ).toBeInTheDocument();
  });

  it('捕获异常时 console.error 保留现场（不吞错）', () => {
    mockedGetIntl.mockReturnValue(intlFor('zh-CN'));
    const errorSpy = jest.spyOn(console, 'error');
    render(
      <ErrorBoundary>
        <Bomb crash />
      </ErrorBoundary>,
    );
    expect(errorSpy).toHaveBeenCalledWith(
      'ErrorBoundary 捕获渲染错误:',
      expect.any(Error),
      expect.anything(),
    );
    errorSpy.mockRestore();
  });
});
