import { getLocale } from '@umijs/max';
import { theme as antdTheme, ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { prefersReducedMotion, subscribeReducedMotion } from '@/theme/motion';
import {
  type AppSettings,
  readSettings,
  subscribeSettings,
} from '@/theme/settings';
import { resolveTheme } from '@/theme/tokens';

// Ant lazily installs its MotionProvider when a ConfigProvider first disagrees
// with its parent. Give our live provider a stable, opposite initial value so
// both first-paint preferences establish the boundary before the app mounts.
const MOTION_ON = { token: { motion: true } } as const;
const MOTION_OFF = { token: { motion: false } } as const;

/**
 * 主题应用面（唯一）：token 真源 + 随偏好切换 algorithm 与颜色套，并同步 antd
 * 组件文案 locale（内层 Provider 会覆盖框架层 ConfigProvider，locale 必须在此续接）。
 * 暗色判定 = 设置的 navTheme === 'realDark'（SettingDrawer 的暗色开关产物）。
 * 颜色 token 亮/暗分两套（tokens.ts），暗色套以 darkAlgorithm 派生为基底、仅覆盖
 * 必要项——algorithm 与颜色套必须同源切换，否则亮色字面量会漏进暗色（旧证据包 F1）。
 * 本组件在 rootContainer 层（model Provider 之外），不能用 useModel；
 * 偏好变更经 src/theme/settings.ts 的订阅通道同步（语言切换默认整页刷新，无需订阅）。
 *
 * 减动效（state-transitions 篇「减动效首帧即生效」）：
 * prefers-reduced-motion 真源在 matchMedia；订阅 change 事件在运行中即时跟随，
 * 不另加应用内开关。偏好接进 ConfigProvider token.motion——antd 把它同时用作
 * (a) MotionWrapper 的 MotionProvider 开关（弹层/抽屉进入退出动画的支持判定）与
 * (b) alias.ts 的 motionDuration*=0s 派生（骨架波、步骤条、折叠等仍走 CSS 的部分）。
 * token 真源单一：motion 不是第二套 token 体系，只是同一 resolveTheme 的又一个
 * 运行时输入。
 */
export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => readSettings());
  const [reducedMotion, setReducedMotion] = useState<boolean>(() =>
    prefersReducedMotion(),
  );
  const [motionBoundary] = useState(() =>
    reducedMotion ? MOTION_ON : MOTION_OFF,
  );

  useEffect(() => subscribeSettings(setSettings), []);
  useEffect(
    () =>
      subscribeReducedMotion(() => {
        setReducedMotion(prefersReducedMotion());
      }),
    [],
  );

  const dark = settings.navTheme === 'realDark';
  const locale = getLocale() === 'en-US' ? enUS : zhCN;
  // 合并结果按 dark 记忆：token 合并对象每次新建会触发 antd 全量样式重算
  const resolvedTheme = useMemo(() => resolveTheme(dark), [dark]);

  return (
    <ConfigProvider theme={motionBoundary}>
      <ConfigProvider
        locale={locale}
        theme={{
          ...resolvedTheme,
          // The outer provider seeds only MotionWrapper's topology. It does
          // not supply application tokens; this stays the single theme source.
          inherit: false,
          algorithm: dark
            ? antdTheme.darkAlgorithm
            : antdTheme.defaultAlgorithm,
          token: { ...resolvedTheme.token, motion: !reducedMotion },
        }}
      >
        {children}
      </ConfigProvider>
    </ConfigProvider>
  );
}
