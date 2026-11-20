// 登录态 URL 真源（data-layer §401 统一收敛）：token 键、登录弹层地址、同源判定集中于此。

export const TOKEN_KEY = 'token';

const LOGIN_PARAM = 'login';
const REDIRECT_PARAM = 'redirect';

function toSameOriginUrl(raw: string, origin: string): URL | null {
  try {
    const url = new URL(raw, origin);
    return url.origin === origin ? url : null;
  } catch {
    return null;
  }
}

export function isSameOrigin(
  url: string | undefined,
  origin = window.location.origin,
): boolean {
  return !url || toSameOriginUrl(url, origin) !== null;
}

// 只放行同源目标：协议相对 //evil、反斜杠 /\evil、javascript: 与外域一律回退首页；
// 指回首页登录弹层的目标也回退首页，避免登录成功后再弹登录。
export function safeRedirect(
  raw: string | null | undefined,
  origin = window.location.origin,
): string {
  const url = raw ? toSameOriginUrl(raw, origin) : null;
  if (!url || isLoginOpen(url)) return '/';
  return `${url.pathname}${url.search}${url.hash}`;
}

// 登录弹层只挂在首页：其他页面带 login=1 不算已在登录弹层。
export function isLoginOpen(
  location: Pick<Location, 'pathname' | 'search'>,
): boolean {
  return (
    location.pathname === '/' &&
    new URLSearchParams(location.search).get(LOGIN_PARAM) === '1'
  );
}

export function readRedirect(
  search: string,
  origin = window.location.origin,
): string {
  return safeRedirect(new URLSearchParams(search).get(REDIRECT_PARAM), origin);
}

export function buildLoginUrl(
  location: Pick<Location, 'pathname' | 'search' | 'hash'>,
): string {
  const target = `${location.pathname}${location.search}${location.hash}`;
  const params = new URLSearchParams({ [LOGIN_PARAM]: '1' });
  if (target !== '/') params.set(REDIRECT_PARAM, target);
  return `/?${params.toString()}`;
}

// 整页替换跳转：重新执行 getInitialState，登录态与 access 一并刷新；
// 登录弹层地址不留在历史里，登录后按后退不会回到锁屏弹层。
export function hardNavigate(url: string): void {
  window.location.replace(url);
}
