// 路由真源：维护 path/component/access；菜单可见性归 src/nav（导航真源），
// 两处同步修改（general-pages §菜单与路由接线）。隐藏菜单 ≠ 删除深链，授权在后端。
export default [
  // name 供 layout locale 菜单取 menu.* 键渲染
  { path: '/', name: 'home', component: './Home' },
  {
    path: '/projects',
    name: 'projects',
    component: './projects/Projects',
    access: 'isLoggedIn',
  },
  { path: '/403', component: './403', hideInMenu: true },
  { path: '/404', component: './404', hideInMenu: true },
  { path: '*', component: './404', hideInMenu: true },
];
