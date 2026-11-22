# my-admin 模板 · Agent 操作面

面向在本模板上工作的 AI Agent 与新成员：命令、接线流程、自查钩子。规范真源在
skill 的 `references/`（本文件随模板交付，就近生效；与 skill 规范冲突时以规范为准）。

## 页面布局（Layout → Cell → Card → content）

- 业务页面内容区一律 `PageShell` → `PageLayout` → `PageCell` → `PageCard` → 内容组件。
- `PageLayout` 必须显式给 `rows` / `cols`（或 `columns`）；非 1×1 布局给 `areas`
  矩阵或每格 `row/col/span`。行列轨道与布局配方见 skill `references/layout-system.md`。
- 每个 `PageCell` 只能承载一个 `PageCard`；`PageCard` 的 `content` 只放具名内容组件
  （ProTable / Descriptions / Form / 图表组件 / List / Empty 等），不写裸文本或 div 内容堆。
- `PageCard variant`：表格、地图、通栏图表用 `flush`；KPI / 紧凑列表用 `compact`；
  其余 `default`。Card 不自带 margin，间距由 Layout `gap` 承担。
- 403 / 404 / 登录引导 / 打印页等全屏结果页可 `PageShell + Result` 直接承载，不包 Card。

## 命令表

| 场景                                            | 命令（在本目录下）           |
| ----------------------------------------------- | ---------------------------- |
| 安装依赖（prepare 钩子生成框架类型）            | `npm install`                |
| 本地开发（mock 生效，无需后端）                 | `npm run dev`                |
| 质量门 = Biome + 类型（提交前必过）             | `npm run lint`               |
| 测试（Jest 串行受限内存，提交前必过）           | `npm run test:ci`            |
| e2e 冒烟（需先装 chromium，dev server 自动起）  | `npm run e2e`                |
| 生成服务层（openapi.json 改后重跑；目录勿手改） | `npm run openapi`            |
| 单测快速定位                                    | `npm test -- <路径或关键字>` |
| 响应式基线采集                                  | `VISUAL_RESPONSIVE=1 VISUAL_EVIDENCE_DIR=<目录> npm run e2e -- e2e/visual.spec.ts --grep "响应式"` |

Playwright 浏览器下载被墙时走镜像：
`PLAYWRIGHT_DOWNLOAD_HOST=https://cdn.npmmirror.com/binaries/playwright npx playwright install chromium`。
本机 8000 端口被占用时，用 `PLAYWRIGHT_BASE_URL=http://localhost:8300` 让 dev server
与 Playwright 对齐到同一端口；采集后按 skill `references/visual-review.md` 的响应式
基线结构断言跑 `visual_baseline_check.py --manifest ... --validate-only` 与复采比对。

禁令自扫（在本模板项目目录内）：`python3 <skill-root>/scripts/ban_scan.py src/`，
退出码 0 = 干净（`<skill-root>`＝含 SKILL.md 的 skill 根目录；禁令真源
`references/engineering.md` B1–B7）。

## mock 账号（仅本地演示）

- `admin / admin123` —— admin 角色，含 `projects:manage` 权限码（可见新建/编辑/删除）
- `viewer / viewer123` —— user 角色，无权限码（只读：仅详情）

## 新页面四步接线（顺序执行，每步有验收物）

1. **建组件**：`src/pages/` 下建页面文件（含同目录同名 `*.test.tsx`）。
2. **路由真源**：`config/routes.ts` 追加 `{ path, name, component, access? }`；
   例外页/兜底路由补 `hideInMenu: true`。
3. **导航真源**：`src/nav/navViews.ts` 声明视图、角色白名单与菜单可见路径
   （`app.tsx` 的 `menuDataRender` 消费）；按角色裁剪分组（菜单只控可见性，
   隐藏菜单 ≠ 删除深链）。
4. **权限与测试**：权限键入 `src/access.ts`（权限真源），页面经 `useAccess`/`<Access>`
   消费；测试文件与源文件同目录同名。

完成后跑质量门：`npm run lint && npm run test:ci`；构建后 `git status --short`
确认无生成物混入。

## 四态自查（每个数据驱动区块，缺任一即违规）

- 加载：Skeleton 骨架族（首屏）+ 表格 loading（刷新）
- 空：Empty（表格/详情空态）
- 错误：ErrorBoundary 兜底 + 请求层统一分发（`showType`）或页面内联 Alert+重试
- 禁用：控件 disabled 视觉走主题 token，不写一次性禁用样式

## 界面删减自查钩子（候选清单，逐处做删除试读）

```bash
grep -rn -e "<Tag" -e "<Badge" -e "subTitle=" -e "tooltip=" -e "description=" -e 'type="secondary"' src/
```

保留判定：承载状态/数量/权限差异的 Tag 与 Badge 保留；复述字段名的说明文字删除。
被删的是可见赘字，不是可访问名称（aria-label 必须保留）。

## 请求通道（B1 正面模式）

- 运行时请求配置真源：`src/app.tsx` 的 `request` 导出（`/api` 前缀、同源 Bearer、
  401 收敛、showType 分发）；`config/config.ts` 的 request 只配 `dataField`。
- 页面/组件不 import axios：HTTP 走 `src/utils/apiClient.ts` 或框架 `request`。
- 双轨定位：`src/services/api/` = OpenAPI 生成层（`npm run openapi` 生成入 git，
  接真实后端时替换 `config/openapi.ts` 的 schemaPath 重跑即用）；
  `src/services/openapiAdapter.ts` = 生成层的解包消费层（生成目录外，按 `dataField='data'`
  契约解包，返回形状与演示层一致——页面接生成层时经 adapter，不直接拿 `{ data }` 包装）；
  `src/services/projects.ts` = 模板内置演示层。生成目录勿手改（重生成即清空，
  生成物豁免 Biome——风格归生成工具）；spec 路径不含 `/api` 前缀，前缀归 baseURL。
- React Query 键族单源：`src/services/queryKeys.ts`（invalidate 只打 root key）。

## 运行时偏好与语言

- 主题 token 真源：`src/theme/tokens.ts`（应用面 = `ThemeProvider`，随暗色偏好切
  algorithm）；不要在 `config.ts` 再配一份 theme。
- 偏好持久化：`src/theme/settings.ts`（localStorage `my-admin.settings`，读时合并
  默认值）。rootContainer 层组件不可用 useModel / FormattedMessage（模型与 Intl
  Provider 均在其内层）——偏好变更走 `subscribeSettings` 订阅通道。
- 文案：全部走 `src/locales/` + FormattedMessage（defaultMessage=中文兜底）；语言切换
  用 SelectLang。`app.tsx` 启动时把 `window.g_locale` 钉到 umi 语言（pro-components
  布局文案自判语言）。

## 禁令速查（完整表见 skill `references/engineering.md`）

B1 不直接 import axios ｜ B2 不用 react-router 族做页面路由 ｜ B3 不用
import.meta.env ｜ B4 不装 ESLint/Prettier（唯一 Biome）｜ B5 不引第二地图引擎 ｜
B6 地图资产同源同步、禁运行时 CDN ｜ B7 overlay 样式走唯一真源。
