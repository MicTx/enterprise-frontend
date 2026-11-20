import { defineConfig } from '@umijs/max';
import zhCN from 'antd/locale/zh_CN';
import defaultSettings from './defaultSettings';
import routes from './routes';

// 主题 token 真源已迁 src/theme/tokens.ts（单一应用面 = 运行时 ThemeProvider，
// 随暗色偏好切换 algorithm）；此处 configProvider 只留 locale 兜底，不再应用第二份。
export default defineConfig({
  hash: true,
  esbuildMinifyIIFE: true,
  routes,
  ignoreMomentLocale: true,
  fastRefresh: true,
  // 关 MFSU：src 分包与 vendor 分包的双 React 副本会让 rootContainer 层的
  // useModel 报 dispatcher null；模板体量小，常规编译的 dev 启动成本可接受。
  mfsu: false,
  model: {},
  initialState: {},
  access: {},

  title: defaultSettings.title,
  layout: { locale: true, ...defaultSettings },

  // 默认 zh-CN 且不随浏览器漂移（测试/e2e 确定性）；antd:true 同步 ConfigProvider
  locale: { default: 'zh-CN', antd: true, baseNavigator: false },

  antd: {
    appConfig: {},
    configProvider: { locale: zhCN },
  },

  // 构建期 request 插件只读 dataField；baseURL / 拦截器 / 401 errorHandler 是运行时配置，
  // 只在 src/app.tsx 的 `request` 导出里生效（data-layer §双通道请求）。
  request: { dataField: 'data' },
});
