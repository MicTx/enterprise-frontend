// 系统减动效偏好真源（state-transitions 篇「减动效首帧即生效」）：
// prefers-reduced-motion 经 matchMedia 读取——SSR/无 window 环境下回落 no-preference；
// 运行中系统侧切换经 change 事件即时跟随，不另加应用内开关。
// 消费面在 ThemeProvider：偏好进 ConfigProvider token.motion（真源单一，与
// resolveTheme 的颜色套/algorithm 同源切换）。
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(REDUCED_MOTION_QUERY).matches
  );
}

export function subscribeReducedMotion(listener: () => void): () => void {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return () => {};
  }
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  // jsdom 与旧 Safari 缺 addEventListener 时用 addListener；两者都缺的
  // 环境（setupTests 打桩）返回无操作，保持渲染不炸、偏好静态。
  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', listener);
    return () => {
      query.removeEventListener('change', listener);
    };
  }
  if (typeof query.addListener === 'function') {
    query.addListener(listener);
    return () => {
      query.removeListener(listener);
    };
  }
  return () => {};
}
