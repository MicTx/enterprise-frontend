# my-admin — 企业中后台起始模板

由 enterprise-frontend skill 提供的**合规起始模板**：五真源（路由 / 导航 / 权限 /
queryKeys / token）+ 统一请求通道 + 内容壳，全部符合规范禁令与质量纪律。
复制本目录后重命名 `package.json` 的 `name`，即可开始开发。

## 使用

```bash
cp -r template/ my-admin && cd my-admin
npm install        # 安装依赖（版本范围对齐快照栈；规范本身版本无关）
npm run prepare    # 框架 setup（生成类型，tsc 的输入）
npm run dev        # 启动开发服务
```

## 已含骨架

- `config/config.ts` — 框架配置 + 主题 token 真源 + 请求通道（baseURL /api、
  Bearer 拦截器、401 统一收敛跳首页）
- `config/defaultSettings.ts` — ProLayout 布局参数真源
- `config/routes.ts` — 路由真源（菜单可见性改 `src/nav/navViews.ts`，两处同步）
- `src/access.ts` — 权限真源（页面用 `useAccess()` 消费）
- `src/services/queryKeys.ts` — 查询键字典（四条键模式 + 反例注释）
- `src/utils/apiClient.ts` — 统一请求客户端（B1：页面不直连 axios）
- `src/components/PageShell.tsx` — 内容壳（锁视口 / 页滚例外声明）
- `src/pages/Home.tsx` — 形态示例（新页面先用 design-reasoning 推理再实现）

## 边界说明

- 本模板为**非地图基座**：地图能力按 `references/map-layers.md` 选型矩阵引入
  （含 SDK 资产同步脚本与 postinstall 钩子）。
- 质量门：`npm run lint`（Biome lint + 格式 + tsc）与 `npm run test:ci`（串行受限内存）；
  格式化统一走 `npm run biome`。
- 构建运行验证需接收方执行 `npm install`（模板交付为静态契约面）。
