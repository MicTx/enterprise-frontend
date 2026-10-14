// 路由真源：维护 path/component/access；菜单可见性归 src/nav（导航真源），
// 两处同步修改（general-pages §菜单与路由接线）。隐藏菜单 ≠ 删除深链，授权在后端。
export default [{ path: '/', component: './Home' }];
