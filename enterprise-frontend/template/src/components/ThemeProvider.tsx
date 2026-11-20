import { getLocale } from '@umijs/max';
import { theme as antdTheme, ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  type AppSettings,
  readSettings,
  subscribeSettings,
} from '@/theme/settings';
import { resolveTheme } from '@/theme/tokens';

/**
 * 主题应用面（唯一）：token 真源 + 随偏好切换 algorithm 与颜色套，并同步 antd
 * 组件文案 locale（内层 Provider 会覆盖框架层 ConfigProvider，locale 必须在此续接）。
 * 暗色判定 = 设置的 navTheme === 'realDark'（SettingDrawer 的暗色开关产物）。
 * 颜色 token 亮/暗分两套（tokens.ts），暗色套以 darkAlgorithm 派生为基底、仅覆盖
 * 必要项——algorithm 与颜色套必须同源切换，否则亮色字面量会漏进暗色（旧证据包 F1）。
 * 本组件在 rootContainer 层（model Provider 之外），不能用 useModel；
 * 偏好变更经 src/theme/settings.ts 的订阅通道同步（语言切换默认整页刷新，无需订阅）。
 */
export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => readSettings());

  useEffect(() => subscribeSettings(setSettings), []);

  const dark = settings.navTheme === 'realDark';
  const locale = getLocale() === 'en-US' ? enUS : zhCN;
  // 合并结果按 dark 记忆：token 合并对象每次新建会触发 antd 全量样式重算
  const resolvedTheme = useMemo(() => resolveTheme(dark), [dark]);

  return (
    <ConfigProvider
      locale={locale}
      theme={{
        ...resolvedTheme,
        algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      }}
    >
      {children}
    </ConfigProvider>
  );
}
