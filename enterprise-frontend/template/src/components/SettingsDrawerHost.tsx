import { type ProSettings, SettingDrawer } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import {
  type AppSettings,
  readSettings,
  writeSettings,
} from '@/theme/settings';

/**
 * 设置抽屉宿主：SettingDrawer（pro-components 自带，零新依赖）。
 * 变更即持久化（localStorage）并回写 initialState——ThemeProvider 的 algorithm
 * 与 ProLayout 的 navTheme 都由同一份 settings 驱动，单一真源。
 * （AppSettings 是 ProLayoutProps 的超集，收窄喂给 SettingDrawer 的 ProSettings。）
 */
export default function SettingsDrawerHost() {
  const { initialState, setInitialState } = useModel('@@initialState');
  const settings: AppSettings = {
    ...readSettings(),
    ...initialState?.settings,
  };

  return (
    <SettingDrawer
      enableDarkTheme
      settings={settings as ProSettings}
      onSettingChange={(next) => {
        const merged = next as AppSettings;
        writeSettings(merged);
        setInitialState((prev) => ({ ...prev, settings: merged }));
      }}
    />
  );
}
