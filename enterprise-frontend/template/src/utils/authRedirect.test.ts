import {
  buildLoginUrl,
  isLoginOpen,
  isSameOrigin,
  readRedirect,
  safeRedirect,
} from './authRedirect';

const ORIGIN = 'http://localhost:8000';

describe('safeRedirect', () => {
  it.each([
    ['//evil.example/x'],
    ['/\\evil.example'],
    ['https://evil.example/'],
    ['javascript:alert(1)'],
    [''],
    [null],
    [undefined],
  ])('非同源或空值 %p 回退首页', (raw) => {
    expect(safeRedirect(raw, ORIGIN)).toBe('/');
  });

  it('同源路径保留 path/search/hash', () => {
    expect(safeRedirect('/orders?p=2#top', ORIGIN)).toBe('/orders?p=2#top');
    expect(safeRedirect(`${ORIGIN}/a`, ORIGIN)).toBe('/a');
  });
});

describe('登录弹层地址', () => {
  it('buildLoginUrl 带回跳目标，首页不带', () => {
    expect(
      buildLoginUrl({ pathname: '/orders', search: '?p=2', hash: '' }),
    ).toBe('/?login=1&redirect=%2Forders%3Fp%3D2');
    expect(buildLoginUrl({ pathname: '/', search: '', hash: '' })).toBe(
      '/?login=1',
    );
  });

  it('isLoginOpen 与 readRedirect 读回 buildLoginUrl 的参数', () => {
    const search = buildLoginUrl({
      pathname: '/a',
      search: '',
      hash: '',
    }).slice(1);
    expect(isLoginOpen({ pathname: '/', search })).toBe(true);
    expect(readRedirect(search, ORIGIN)).toBe('/a');
    expect(isLoginOpen({ pathname: '/', search: '?login=0' })).toBe(false);
    expect(isLoginOpen({ pathname: '/orders', search: '?login=1' })).toBe(
      false,
    );
  });

  it('指回登录弹层的 redirect 回退首页，其他页面的 login 参数保留', () => {
    expect(safeRedirect('/?login=1', ORIGIN)).toBe('/');
    expect(readRedirect('?redirect=%2F%3Flogin%3D1', ORIGIN)).toBe('/');
    expect(safeRedirect('/users?login=alice', ORIGIN)).toBe(
      '/users?login=alice',
    );
  });
});

describe('isSameOrigin', () => {
  it('相对地址与空值视为同源，外域与协议相对视为外域', () => {
    expect(isSameOrigin('/api/me', ORIGIN)).toBe(true);
    expect(isSameOrigin(undefined, ORIGIN)).toBe(true);
    expect(isSameOrigin('https://tiles.example/x', ORIGIN)).toBe(false);
    expect(isSameOrigin('//tiles.example/x', ORIGIN)).toBe(false);
  });
});
