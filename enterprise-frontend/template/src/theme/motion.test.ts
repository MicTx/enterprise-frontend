import { prefersReducedMotion, subscribeReducedMotion } from './motion';

interface FakeMql {
  matches: boolean;
  media: string;
  listeners: Set<() => void>;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
  addListener: (listener: () => void) => void;
  removeListener: (listener: () => void) => void;
}

function fakeMql(matches: boolean): FakeMql {
  const listeners = new Set<() => void>();
  return {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    listeners,
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
    addListener: (listener) => listeners.add(listener),
    removeListener: (listener) => listeners.delete(listener),
  };
}

// matchMedia 打桩放本文件内（模块 mock 写在各测试文件内的纪律）：
// 记录每个 query 实例，方便模拟「运行中系统偏好切换」。
let currentMql: FakeMql;
const originalMatchMedia = window.matchMedia;

beforeEach(() => {
  currentMql = fakeMql(false);
  // 测试只需要 matchMedia 返回这一份 query 实例；其他 DOM MQL 字段用不到，
  // 与 jsdom 环境的真实签名差异用 unknown 中转收窄（测试纪律：test 文件内打桩）。
  window.matchMedia = ((query: string) => {
    void query;
    return currentMql;
  }) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

function fireChange() {
  for (const listener of currentMql.listeners) listener();
}

describe('系统减动效偏好（prefers-reduced-motion）', () => {
  it('系统无减动效偏好时为 false', () => {
    currentMql.matches = false;
    expect(prefersReducedMotion()).toBe(false);
  });

  it('系统开启减动效时首读即为 true（首次渲染前生效的前提）', () => {
    currentMql.matches = true;
    expect(prefersReducedMotion()).toBe(true);
  });

  it('运行中系统偏好切换即时通知订阅者', () => {
    const spy = jest.fn();
    const unsubscribe = subscribeReducedMotion(spy);
    expect(spy).not.toHaveBeenCalled();

    currentMql.matches = true;
    fireChange();
    expect(spy).toHaveBeenCalledTimes(1);

    currentMql.matches = false;
    fireChange();
    expect(spy).toHaveBeenCalledTimes(2);
    unsubscribe();
    fireChange();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('退订后不再收到变更（无泄漏订阅）', () => {
    const spy = jest.fn();
    const unsubscribe = subscribeReducedMotion(spy);
    unsubscribe();
    fireChange();
    expect(spy).not.toHaveBeenCalled();
  });
});
