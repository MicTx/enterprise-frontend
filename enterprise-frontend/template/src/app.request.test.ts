import { getIntl } from '@umijs/max';
import { createIntl } from '@umijs/plugins/node_modules/react-intl';
import { message, notification } from 'antd';
import { request } from './app';
import enUS from './locales/en-US';
import zhCN from './locales/zh-CN';
import { hardNavigate } from './utils/authRedirect';

// jest 链无 umi 插件运行时（getPluginManager 为 null，ThemeProvider.test.tsx:7-8
// 已注记同类问题并打桩）：真调 getIntl 会抛 TypeError，故按既有模式打桩。
// 桩的消息表直接 import locales 目录，不在测试内复写文案。
jest.mock('@umijs/max', () => ({
  getIntl: jest.fn(),
  SelectLang: () => null,
}));

jest.mock('./utils/authRedirect', () => ({
  ...jest.requireActual('./utils/authRedirect'),
  hardNavigate: jest.fn(),
}));

const mockedGetIntl = getIntl as unknown as jest.Mock;
const intlFor = (locale: string) =>
  createIntl({ locale, messages: locale === 'en-US' ? enUS : zhCN });

beforeEach(() => {
  mockedGetIntl.mockReturnValue(intlFor('zh-CN'));
});

type Interceptor = (config: Record<string, any>) => Record<string, any>;

const intercept = request.requestInterceptors?.[0] as unknown as Interceptor;
const handleError = (error: unknown, opts?: unknown) =>
  request.errorConfig?.errorHandler?.(error as Error, (opts ?? {}) as never);
const unauthorized = { response: { status: 401 } };

describe('运行时请求配置', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.mocked(hardNavigate).mockReset();
    window.history.replaceState(null, '', '/');
  });

  it('统一 /api 前缀', () => {
    expect(request.baseURL).toBe('/api');
  });

  it('同源请求附 Bearer，外域与协议相对地址不附', () => {
    localStorage.setItem('token', 't-1');
    const same = intercept({ baseURL: '/api', url: '/me', headers: {} });
    expect(same.headers.Authorization).toBe('Bearer t-1');
    for (const url of ['https://tiles.example/x', '//tiles.example/x']) {
      const foreign = intercept({ baseURL: '/api', url, headers: {} });
      expect(foreign.headers.Authorization).toBeUndefined();
    }
  });

  it('无 token 不附 Authorization', () => {
    const config = intercept({ baseURL: '/api', url: '/me', headers: {} });
    expect(config.headers.Authorization).toBeUndefined();
  });

  it('外域 baseURL、反斜杠与无斜杠 scheme 地址不附 Bearer', () => {
    localStorage.setItem('token', 't-1');
    for (const config of [
      { baseURL: 'https://evil.example', url: '/x' },
      { baseURL: '/api', url: '/\\evil.example/x' },
      { baseURL: '/api', url: 'https:evil.example/x' },
    ]) {
      expect(
        intercept({ ...config, headers: {} }).headers.Authorization,
      ).toBeUndefined();
    }
  });

  it('非首页带 login=1 时 401 仍跳首页登录弹层', () => {
    window.history.replaceState(null, '', '/orders?login=1');
    expect(() => handleError(unauthorized)).toThrow();
    expect(hardNavigate).toHaveBeenCalledWith(
      '/?login=1&redirect=%2Forders%3Flogin%3D1',
    );
  });

  it('401 清 token 并跳首页登录弹层，带回跳目标', () => {
    localStorage.setItem('token', 't-1');
    window.history.replaceState(null, '', '/orders?p=2');
    expect(() => handleError(unauthorized)).toThrow();
    expect(localStorage.getItem('token')).toBeNull();
    expect(hardNavigate).toHaveBeenCalledWith(
      '/?login=1&redirect=%2Forders%3Fp%3D2',
    );
  });

  it('首页 401 也打开登录弹层', () => {
    expect(() => handleError(unauthorized)).toThrow();
    expect(hardNavigate).toHaveBeenCalledWith('/?login=1');
  });

  it('已在登录弹层时 401 不自循环跳转', () => {
    window.history.replaceState(null, '', '/?login=1&redirect=%2Fa');
    expect(() => handleError(unauthorized)).toThrow();
    expect(hardNavigate).not.toHaveBeenCalled();
  });

  it('非 401 错误不清 token、不跳转', () => {
    localStorage.setItem('token', 't-1');
    expect(() => handleError({ response: { status: 500 } })).toThrow();
    expect(localStorage.getItem('token')).toBe('t-1');
    expect(hardNavigate).not.toHaveBeenCalled();
  });
});

describe('showType 请求错误统一分发', () => {
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let notifySpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest
      .spyOn(message, 'warning')
      .mockImplementation(() => undefined as never);
    errorSpy = jest
      .spyOn(message, 'error')
      .mockImplementation(() => undefined as never);
    notifySpy = jest
      .spyOn(notification, 'error')
      .mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    notifySpy.mockRestore();
  });

  const body = (showType: string, errorMessage = '保存失败') => ({
    response: { status: 500, data: { errorMessage, showType } },
  });
  const noMessage = (showType: string) => ({
    response: { status: 500, data: { showType } },
  });

  it('WARN_MESSAGE 走 message.warning', () => {
    expect(() => handleError(body('WARN_MESSAGE'))).toThrow();
    expect(warnSpy).toHaveBeenCalledWith('保存失败');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('缺省 errorMessage 的兜底文案取自 locales（zh-CN）', () => {
    expect(() => handleError(noMessage('WARN_MESSAGE'))).toThrow();
    expect(warnSpy).toHaveBeenCalledWith(zhCN['app.request.failed']);
    expect(() => handleError(noMessage('ERROR_MESSAGE'))).toThrow();
    expect(errorSpy).toHaveBeenCalledWith(zhCN['app.request.failed']);
  });

  it('缺省 errorMessage 的通知标题与描述取自 locales（en-US 同键对译）', () => {
    mockedGetIntl.mockReturnValue(intlFor('en-US'));
    expect(() => handleError(noMessage('NOTIFICATION'))).toThrow();
    expect(notifySpy).toHaveBeenCalledWith({
      message: enUS['app.request.failedTitle'],
      description: enUS['app.request.failed'],
    });
  });

  it('ERROR_MESSAGE 走 message.error', () => {
    expect(() => handleError(body('ERROR_MESSAGE'))).toThrow();
    expect(errorSpy).toHaveBeenCalledWith('保存失败');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('NOTIFICATION 走 notification.error 并带描述', () => {
    expect(() => handleError(body('NOTIFICATION'))).toThrow();
    expect(notifySpy).toHaveBeenCalledWith(
      expect.objectContaining({ description: '保存失败' }),
    );
  });

  it('SILENT 与无 showType 不出任何 UI', () => {
    expect(() => handleError(body('SILENT'))).toThrow();
    expect(() =>
      handleError({ response: { status: 500, data: {} } }),
    ).toThrow();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(notifySpy).not.toHaveBeenCalled();
  });

  it('skipErrorHandler 请求不分发（页面四态自承载）', () => {
    const opts = { request: { options: { skipErrorHandler: true } } };
    expect(() => handleError(body('ERROR_MESSAGE'), opts)).toThrow();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
