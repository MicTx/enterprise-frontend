import type { ProLayoutProps } from '@ant-design/pro-components';
import { theme } from '../src/theme/tokens';

// ProLayout 布局参数真源（design-tokens 篇 §布局参数）。
// 值偏离规范默认值时必须带 why 注释。色值从 token 真源单源引用（config→src
// 方向无环）：布局参数不再维护第二份十六进制字面量。
const Settings: ProLayoutProps & { title?: string } = {
  navTheme: 'light',
  colorPrimary: theme.token?.colorPrimary as string,
  layout: 'side',
  splitMenus: false,
  contentWidth: 'Fluid',
  fixedHeader: true,
  fixSiderbar: true,
  siderWidth: 240,
  colorWeak: false,
  title: '示例中后台',
  iconfontUrl: '',
  // 分组标题不可点击、子项平铺（group 菜单模式）
  menu: {
    type: 'group',
    defaultOpenAll: true,
    autoClose: false,
  },
};

export default Settings;
