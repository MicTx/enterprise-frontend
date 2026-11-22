# enterprise-frontend

约束驱动的企业级前端规范执行器：企业级中后台前端工作（新建/扩展/迁移/审查）默认执行 `SKILL.md` 的硬约束清单——禁令全局硬执行，token 与结构约定跟随目标仓库真源。

Read `SKILL.md` for the full contract: eight-layer workflow, the conditional-loading routing table over `references/`, and the B1–B7 ban list (single source of truth in `references/engineering.md`). This file is an entry pointer, not a second rule set.

地图/GIS 约束为条件加载章节：仅地图场景任务按路由表读取对应文档。

公开落地页/营销页/活动页/定价对比页为条件叠加页面类型：仅命中公开页面时读取
`references/public-pages.md`，中后台任务不读；四个核心场景判定不变。

截图像素级审查/视觉走查/视觉回归复验/e2e 修改意见为条件叠加工作面：仅命中时读取
`references/visual-review.md`，纯代码任务不读；四个核心场景判定不变。该篇是规范中
唯一以运行页面截图证据为验收面的章节，视觉/像素结论必须由其协议产物支撑。
响应式截图基线 r1 属于同一证据面：manifest 逐图 `breakpoint` / `viewport` 与 PNG 尺寸
由 `scripts/visual_baseline_check.py` 校验，fix-reverified 证据包由
`scripts/visual_review_check.py` 校验；细则见 `references/visual-review.md`。

每次改动另受两条全局硬约束：界面删减（`references/general-pages.md`）与三方体验账
（`references/engineering.md`，UX / DX / AX 三方都变好、现有功能零破坏）。

页面布局为结构硬约束：业务页面内容区一律 `Layout`（rows × cols / areas）→ 每区域
一个 `Cell` → 每 `Cell` 一个 `Card` → Card `content` 用内容组件；裸 div 栅格、空
Cell、一 Cell 多卡、Card 套 Card 均违规。细则见 `references/layout-system.md`。

## 本仓库工程事实

- 模板请求运行时配置的真源是 `template/src/app.tsx` 的 `request` 导出；`baseURL`、
  认证拦截器与 401 处理不能放回 `template/config/config.ts`，后者的 `request` 只配置
  `dataField`。请求约定见 `references/data-layer.md`。
- `install.sh` 与 `scripts/build_package.py` 均按 `manifest.json` 的 `runtime` 白名单收集。
  从本仓库根目录安装或打包时，runtime 目录内新增的交付文件须先 `git add`；未跟踪且未忽略
  的文件会导致拒绝。不要将两者的 Git 判定泛化为一致：安装器支持受跟踪的 monorepo 子目录源，
  打包器的 Git 跟踪模式仅在源目录为仓库顶层时启用。
- 本仓库禁令自扫运行 `python3 scripts/ban_scan.py template/`，快照另扫 `library/`。
  只含文档的 `references/` 扫描面为零，退出码为 2，不能作为禁令检查通过的证据。
