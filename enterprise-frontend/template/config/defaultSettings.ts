import type { ProLayoutProps } from '@ant-design/pro-components';

// ProLayout 布局参数真源（design-tokens 篇 §ProLayout 布局参数）。
// 值偏离规范默认值时必须带 why 注释。
const Settings: ProLayoutProps & { title?: string } = {
  navTheme: 'light',
  colorPrimary: '#1677ff',
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
