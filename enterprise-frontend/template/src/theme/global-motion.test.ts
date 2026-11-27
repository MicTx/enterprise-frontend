import fs from 'node:fs';
import path from 'node:path';

/**
 * global.less 的减动效兜底契约（state-transitions 篇 + design-tokens 篇口径：
 * 「prefers-reduced-motion: reduce 时移除位移/缩放，保留必要透明度变化」）。
 *
 * token.motion=false 只覆盖 rc-motion enter/leave（Modal/Drawer 打开关闭）
 * 与 antd 走 motionDuration* 的 CSS 动画；Skeleton 的 shimmer 用独立组件 token
 * （skeletonLoadingMotionDuration，antd 6 默认 '1.4s' 无限循环），漏网。
 * 这是真实缺口——静默动画无限跑对用户是持续位移噪声，与「减动效首帧即生效」
 * 冲突。落到 global.less 唯一的 reduced-motion 块：停掉骨架位移动画，保留
 * 静态渐变底（仍是占位骨架，识别度不变）。
 */
const GLOBAL_LESS = path.join(process.cwd(), 'src', 'global.less');

describe('global.less 减动效兜底（仅补 antd 漏网的第三方 overlay）', () => {
  it('存在 prefers-reduced-motion 媒体块', () => {
    const source = fs.readFileSync(GLOBAL_LESS, 'utf8');
    expect(source).toMatch(/@media\s*\(prefers-reduced-motion\s*:\s*reduce\)/);
  });

  it('块内对 antd 骨架 shimmer 停掉无限位移动画、保留静态占位', () => {
    const source = fs.readFileSync(GLOBAL_LESS, 'utf8');
    const block = source.match(
      /@media\s*\(prefers-reduced-motion\s*:\s*reduce\)\s*\{([\s\S]*?)\}\s*\}\s*$/,
    );
    expect(block).not.toBeNull();
    const body = block?.[1] ?? '';
    // 必须有针对 .ant-skeleton 的规则
    expect(body).toMatch(/\.ant-skeleton/);
    // 必须禁掉 animation（骨架用 backgroundPosition 做位移动画）
    expect(body).toMatch(/animation[^;{]*none/);
  });
});
