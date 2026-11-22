# Changelog

This file records current released design decisions. Git history is the source for superseded implementation detail.

The format follows Keep a Changelog headings so the packaging step can extract version notes.

## [Unreleased]

This section is a preview, not part of the v1.6.0 release.

### Added

- **页面布局系统（layout-system）**：新增 `references/layout-system.md`，把页面布局
  从「骨架建议」升级为结构契约——业务页面内容区必须按 Layout（显式 rows × cols /
  areas）→ 每区域一个 Cell → 每 Cell 一个 Card → Card `content` 内容组件的四层落地；
  并补齐布局配方（single / stack / stats-content / main-aside / master-detail /
  dashboard / map-workbench / long-form）、Card 内容组件选型、高度链与滚动归属、
  响应式收缩顺序、例外白名单与审查钩子。SKILL Success Definition / Workflow /
  Decision Rules / Anti-Patterns / Review Loop / References 路由表同步接线，
  README 设计原则由五条增至六条。
- **模板布局原语与页面迁移**：`template/src/components/PageLayout.tsx` 导出
  `PageLayout` / `PageCell` / `PageCard`（开发态校验 Layout 只接 Cell、一 Cell
  一 Card、Card content 必须是具名组件、areas 矩阵对齐、响应式 span）；`theme/tokens.ts`
  增 `layoutTokens` 间距真源；Home / Projects 迁移到 Layout → Cell → Card →
  content；新增组件单测与页面布局契约测试（业务页面不得直接 import antd Card、
  不得写页面级栅格类）。
- **布局规则注册与行为夹具**：rule_registry 增 5 条布局硬约束（GP-LAYOUT-GRID /
  CELL-CARD / CARD-CONTENT / HEIGHT / RESPONSIVE，since=unreleased 哨兵），
  rule-traceability 视图再生成；evals 增 3 个布局场景夹具（裸 div 拼页、
  一区域多卡、Card content 裸 div）与推导锚点；`docs/layout-research-2026-11.md`
  记录 Ant Design Pro / shadcn-admin / next-shadcn-dashboard-starter /
  soybean-admin / vben / tabler / refine 的布局共性调研与取舍。
- **响应式截图基线 r1**：`template/e2e/visual.spec.ts` 增 `VISUAL_RESPONSIVE=1`
  采集开关与 xl/lg/md/sm 四档结构断言（布局节点、侧栏、单列与无横向溢出）；
  `docs/visual-baselines/r1/` 固化 `/` 与 `/projects` 8 张 PNG + manifest +
  fix-reverified 证据包 + CAPTURE.md。`visual_baseline_check.py` 增响应式
  `breakpoint` / `viewport` 与 PNG 尺寸一致性校验；新增
  `scripts/tests/test_responsive_baseline.py`、rule_registry 条目
  `GVR-RESPONSIVE-BASELINE`、evals 场景与 visual-review §响应式基线结构断言；
  `gate.sh` / CI 新增第 6 门 manifest 自证，全量门禁由 7 门增至 8 门。

## [1.6.0] - 2026-11-15

### Added

- **约束基线（本版复核）**：公开页面章节与内容真实性等既有约束本轮未触碰、
  继续有效；`THIRD_PARTY_NOTICES.md` 许可声明随依赖变化保持更新（本轮无新
  依赖）。P8 视觉走查的 4 条 findings 已全部修复并复采闭环（见 Fixed）。

### Added

- **视觉走查证据包（visual-review 协议首次真实运行）**：`template/e2e/visual.spec.ts`
  8 组合截图（4 路由 × 亮色+zh-CN / 暗色+en-US 两口径，1280×800，networkidle
  就绪）+ 合规 `visual-review.json` 证据包（runtime-confirmed 级，8/8 截图
  sha256 与包内一致，`visual_review_check.py` 校验退出 0）；逐张读图 +
  页内 getComputedStyle 双通道量测。**如实记录 4 条 open findings**（暗色下
  多处文本对比度趋近 1:1；/projects 操作列 en-US 溢出 12px；状态 Tag 与亮色
  次要文本低于 AA）——修复走后续主题/无障碍修复包并附复采对比；证据包
  coverage 节登记未采口径与复采前提（先重启 dev server）。
- **token 一致性机检**：新增 `scripts/token_scan.py`（页面/组件层裸样式字面量
  扫描：hex 3/6/8 位精确匹配且排除 URL 锚点续符、`rgb()`/`rgba()` 函数、
  `px` 字面量（calc 括号配平段与 0px 豁免）；白名单 token 真源文件与测试文件；
  退出码 0/1/2 + `--json`）+ 14 夹具 + 23 用例；接入 ·gate.sh 第六门与 CI
  （gate.sh/ci.yml/test_ci_gates 三处同步，六门同源）。`design-tokens` 篇
  「真源跟随」条文自此有机械面；`template/config/defaultSettings.ts` 的
  colorPrimary 改为从 `src/theme/tokens.ts` 单源引用（消除第二份色值字面量）。
  registry 注册 `DT-TOKEN-SINGLE-SOURCE`（enforcement=auto，since=unreleased
  哨兵——定版时回填；`rule_coverage` 因此支持 `unreleased` 哨兵值）。
- **规则生命周期元数据**：`rule_registry` 增可选 `status`（active/deprecated）/
  `since`/`supersedes`/`reason`；`rule_coverage` 校验生命周期约束（since ∈ 已
  发布版本集合、supersedes 存在/非自指/两跳内无环、deprecated 须有替代链或
  理由）；追溯视图增「生效版本/状态」两列；18 条 since 依 CHANGELOG 与 git
  取证逐条回填（1.0.0 ×13 / 1.2.0 ×2 / 1.3.0 ×2 / 1.4.0 ×1）。
- **视觉回归基线机制（回归层）**：新增 `scripts/visual_baseline_check.py`（stdlib
  zlib PNG 解码 + alpha 感知比对，复用 visual_review_check 政策；尺寸不符即
  失败、阈值 0.1%、退出码 0/1/2、`--json`、`--manifest --validate-only` 自证
  模式）+ 38 用例；基线 v1 固化为 `docs/visual-baselines/v1/`（8 张
  fix-reverified 截图 + manifest 含 sha256，版本只增不改）；`visual-review.md`
  新增「基线回归机制」节（基线只能随判定通过的复采推进，禁止自动更新/原地
  覆盖）；registry 增纪律条目 `GVR-BASELINE-NO-AUTO-UPDATE`；
  `template/e2e/visual.spec.ts` capture 目录支持 `VISUAL_EVIDENCE_DIR` 覆盖。
  真机验收：fresh capture 与基线 v1 比对 8/8 match、零差异（六门全绿）。

### Fixed

- **主题对比度与无障碍（P8 视觉走查 F1–F4 修复 + 复采闭环）**：token 拆
  base/light/dark 三层（`resolveTheme` 按 navTheme 选套），修复暗色下文本对比度
  趋近 1:1 的阻断级缺陷（菜单项 1.05→8.37、弹层标题 1.08→12.14、Empty 描述
  1.00→8.21、403/404 副文案 1.03→8.63）；操作列 160→176 消除 en-US 溢出；
  状态 Tag 对比 2.47→4.97:1（亮）/4.08→6.71:1（暗）；Result 副文案与 Empty
  描述改走 colorTextSecondary 真源（3.31→7.06、3.35→7.58:1）。新视觉证据包
  verdict=pass、level=fix-reverified、4 findings 全 fixed 附前后实测值；三轮
  复采 8/8 sha256 稳定，亮色除有意提升外像素级不变。

## [1.5.0] - 2026-11-15

### Added

- **约束基线（本版复核）**：公开页面章节与内容真实性等既有约束本轮未触碰、
  继续有效；新增依赖（`@playwright/test`、`@umijs/max-plugin-openapi`，均
  非 B4 黑名单项）许可声明已由 `THIRD_PARTY_NOTICES.md` 统一承载。
- **模板 OpenAPI 服务层生成**：接 `@umijs/max-plugin-openapi`（devDep，MIT）——
  手写最小 `openapi.json`（projects 五端点，与 mock 同形；spec 路径不带 `/api`
  前缀防与运行时 baseURL 双拼），`npm run openapi`（UMI_ENV=openapi 变体）生成
  `src/services/api/` 类型化服务层（生成物入 git、幂等、`import` 框架 request
  B1 合规）；与手写演示层 `services/projects.ts` 双轨并存（codegen = 接真实
  后端工作流，替换 schemaPath 即用）；生成目录 biome 豁免（风格归生成工具，
  tsc strict 仍覆盖）+ 冒烟测试 2 例；`template/AGENTS.md` 命令与双轨定位同步。
- **SKILL 路由表补行与对账双向收紧**：References 路由表 10→11 行
  （`scenario-coverage` 入表，场景=场景覆盖自查/覆盖缺口核对，措辞与该篇
  frontmatter `load_when` 精确一致）；`check_references_meta` 撤销 P6-R2 的
  INFO 降级，恢复「SKILL 引用文档集合 == references 目录集合」双向等式——
  任一侧多/少即退出 1 并点名文件；`test_spec_docs` 扩展「路由表行数 == 篇数」
  断言。条件加载路由自此为完备映射，漂移即红。
- **规则追溯视图**：`rule_coverage` 新增 `--emit-doc`（opt-in；校验失败退出 1
  且零写入、原子写出、确定性输出禁含时间戳）生成 `docs/rule-traceability.md`
  ——按 ban/hard/discipline 三节的七列规则表 + 人工复查项清单 + 统计，头注
  「生成物勿手改」；幂等测试锁定「入库文件与当前 registry 再生成逐字节一致」，
  registry 漂移未再生成即红。docs/ 不入 manifest runtime（内部维护面）。
- **references 元数据与路由表对账**：11 篇 `references/*.md` 首部新增 frontmatter
  （`load_when` / `rule_ids` / `depends_on` / `size_budget`，正文零改动）——条件
  加载场景、规则关联与体积预算（现状 ceil10×1.2，最大 360 行）机器可读；新增
  `scripts/check_references_meta.py`（键集/类型/行数预算/SKILL.md 路由表与引用
  对账 check-only 校验，退出码 0/1/2，`--json`）。假设「frontmatter 不破坏
  wiring 断言」经全量单测验证成立（208 → 零回退）。
- **禁令豁免台账**：`ban_scan` 规则支持 severity（error 缺省/warn——warn 级
  违规带 `[warn]` 标记且不计入退出码）；新增 `--waivers <file>` 豁免台账
  （`{rule, path_pattern, owner, reason, expires}`，fnmatch 匹配、命中降为
  warn 输出并附 owner、过期即失效并在 stderr 提示复核、坏台账退出 2），存量
  仓库可登记豁免接入扫描而不静默放水；模板 `scripts/waivers.example.json`。
  无 `--waivers` 路径人读与 `--json` 输出与现状逐字节兼容（金样测试 + cmp
  双保险锁定）；`ban_scan` 既有 29 用例零回退、新增 8 用例。
- **规则可追溯注册表**：新增 `scripts/rule_registry.json`（18 条硬约束：B1–B7
  与 `ban_rules.json` 逐 ID 同源 + 11 条 GP-/ENG-/DL- 非禁令硬约束，doc_anchor
  全部锚定真实小节）与 `scripts/rule_coverage.py`（id 唯一/枚举/锚点折叠/检查器
  与夹具路径存在校验 + 人工复查项清单报告，`--json`/`--root`，退出码 0/1/2）。
  每条 MUST 可回答「文档锚点在哪、谁检查、夹具/测试在哪」；无检查项显式浮出
  （当前人工复查项 9 条）。
- **skill 行为场景夹具**：新增 `evals/scenarios.json`（10 条提示→期望行为场景：
  B1/B2/B4/B5/B6 触发、四态缺失、Tooltip 代删减、公开页误读边界、无证据视觉
  断言拒绝、queryKeys 前缀分裂）与 `evals/README.md` 运行协议（结果不倒写，失败
  走 spec 包回写规范）；`scripts/tests/test_skill_evals.py` 结构校验（schema、
  id 唯一、引用文件与规则 id 与真源核对，rule_registry 联动为条件断言）。
  evals/ 不入 manifest runtime（开发内部夹具，与 scripts/tests 同口径）。

## [1.4.0] - 2026-11-14

### Added

- **约束基线（本版复核）**：公开页面章节与内容真实性等既有约束本轮未触碰、
  继续有效；模板 mock 示例数据按内容真实性标注（人名与项目均为虚构示例）；
  新增 devDep `@playwright/test`（Apache-2.0），许可声明仍由
  `THIRD_PARTY_NOTICES.md` 统一承载。
- **模板三项 M 级增强（对齐主流 admin 脚手架实践）**：
  - **运行时偏好（暗色 + 设置抽屉）**：主题 token 真源单点迁至
    `template/src/theme/tokens.ts`，运行时 `ThemeProvider`（rootContainer 层）统一应用
    cssVar+tokens 并随 `navTheme=realDark` 切换 algorithm、续接 antd locale；
    `src/theme/settings.ts` localStorage 命名空间持久化（读时合并默认值，免版本迁移）
    + 变更订阅通道（rootContainer 层不可用 useModel——模型 Provider 在其内层）；
    SettingDrawer 经 `childrenRender` 挂载，布局运行时接 `unAccessible`/`noFound`
    例外页。
  - **i18n 脚手架**：umi locale（默认 zh-CN、`antd:true` 同步 ConfigProvider、
    `baseNavigator:false` 保确定性）+ `src/locales/zh-CN|en-US` 双语目录 + 头部
    SelectLang 切换 + 路由 name 化取 `menu.*` 键；全部用户可见文案迁移
    FormattedMessage（defaultMessage=中文，jest 无 Provider 回落中文保既有断言零回退）；
    `window.g_locale` 启动时钉到 umi 语言（pro-components 布局文案自判语言与真源脱节）。
  - **Playwright e2e 冒烟**：`@playwright/test` devDep + `playwright.config.ts`
    （webServer 起 dev+mock）+ `e2e/smoke.spec.ts` 六条（登录回跳、列表渲染、新建提交、
    按钮级权限、401 收敛重定向、暗色偏好持久化、404 兜底）；jest
    testPathIgnorePatterns 隔离 e2e；chromium 走 npmmirror 镜像下载。
- **模板 CRUD 核心（规范的可执行证明）**：`template/` 补齐 CRUD 三件套——
  项目列表页（ProTable 卡内滚 + React Query 数据源 + 四态承载 + 行操作）、
  新建/编辑弹层（Modal + antd Form，必填校验/编辑回填）、详情抽屉
  （Descriptions 分区）；按钮级权限原语（`access.ts` 增 `canManageProjects`，
  写操作经 `<Access>` 消费，admin 隐含全部权限码）；umi mock 层
  （`mock/auth.ts` 角色权限双账号、`mock/projects.ts` 分页/详情/CRUD/可控 401，
  dev-only 零新依赖）；请求错误契约——`app.tsx` errorHandler 按响应 `showType`
  （SILENT/WARN_MESSAGE/ERROR_MESSAGE/NOTIFICATION/REDIRECT）统一分发（非 skip
  路径，apiClient 默认 skip 的页面四态通道不变）；壳层健壮性——
  `ErrorBoundary` + `OfflineBanner` 挂 rootContainer；`403`/`404` 例外页与路由
  兜底；`template/AGENTS.md` 面向 agent 的操作面（命令表、四步接线、四态与删减
  自查钩子、禁令速查）。`queryKeys` 落 projects 键族示例；测试新增 32 个用例。
- **CI 门禁与一键质量门**：新增 `.gitea/workflows/ci.yml`（Gitea Actions 双 job——
  python 门跑 `scripts/tests` 全量单测与 `ban_scan.py` 对 `template/`、`library/`
  自扫；template 门跑依赖安装 + `lint`（Biome+tsc）+ `test:ci`（Jest 串行受限内存））
  与 `scripts/gate.sh` 本地一键门禁（与 CI 同一命令组、同一真源，逐条以进程退出码
  判定，支持 `--skip-template` / `--list`）；`scripts/tests/test_ci_gates.py` 锁
  「CI 与 gate.sh 五门一致、npm 脚本名与 `template/package.json` 一致、gate.sh 无
  grep 管道判定」契约。CI 与 gate.sh 均不入 manifest runtime（内部工程设施）。
- **视觉审查协议纠错与可执行证据校验**：`visual-review` 修复七类误判/漏报——重试拆
  「采集稳定（连续两次截图哈希一致）+ 判定（混合结果 = `flaky`/`needs-evidence`，
  不得推进基线）」两级；就绪判定改为目标状态为主、网络空闲可选并对 SSE/长连接
  豁免；聚簇只排序不自动排除；透明资产保留原始 RGBA（同 RGB 异 alpha 判差异）；
  截图-only 定义三级证据级别（`observation / runtime-confirmed / fix-reverified`）；
  删除 56px 伪缺省值并改用真实 token 示例；八维表拆 WCAG 标准底线（24×24 CSS px
  AA、4.5:1/3:1）/ 项目 token 约定 / 审美建议三层。新增 `scripts/visual_review_check.py`
  证据包校验器（0/1/2 退出码）与协议语义单测、本地浏览器反例夹具（SSE、间歇遮挡、
  透明 alpha、截图-only）；`engineering` 补「扫描器验收以退出码为准」；来源→条款
  决策记录见 `docs/visual-review-provenance.md`（不入 runtime）。
- **视觉审查协议强化**（同行 issue/PR 启示蒸馏）：证据采集补环境元数据完整项
  （OS/浏览器/字体环境）、就绪时机超时兜底按失败、动画冻结前置、截图落盘与
  8000px 上限治理；偏差判定补动态区域掩码清单化、透明像素固定背景合成、
  尺寸不一致默认判失败（期望 vs 实际）；复验闭环补**复验裁判**一致性协议
  （同一观察空间）与 flaky 重试协议（N=2）；记录格式补还原度**分层验收**、
  协议违规单列、坐标回标复核。design-reasoning 补输入契约三分法（用户目标 /
  用户硬约束 / 执行者自选解法）与决策记录（更轻方案对比）；engineering 三方
  体验账补证据准入三条硬规则（needs-evidence 不倒写历史）。
- **截图视觉审查章节**：新增 `references/visual-review.md`（条件加载）——截图像素级
  审查 / 视觉走查 / 视觉回归复验 / e2e 修改意见任务的执行协议：证据采集（视口×粒度×
  状态三维截图矩阵、稳定协议与环境元数据、结构+坐标采集、DPR 双采样）、观察纪律
  （先读截图再判断、定量走脚本定性走截图、视觉→CSS→源码行回溯）、八维走查清单
  （含审查缺省阈值包，让位 token 真源）、发现准入四门与感知色差 / 抗锯齿豁免 /
  聚集度抗噪的像素比对语义、finding 强制字段与 fix 双分层（意图层 + 定位层）格式、
  同参数复验与基线不可原地覆盖的闭环纪律。该篇是规范中唯一以运行页面截图证据为
  验收面的章节。
- **接线与门面**：`SKILL.md` 增加视觉审查条件路由 / 成功定义第 9 条 / 决策规则 /
  反模式 11 / 复核项（无越界断言条目补视觉证据面）；`general-pages`、`design-tokens`、
  `testing-guide`、`scenario-coverage` 同步条件叠加；README 双语篇数与路由表、AGENTS
  与文档结构契约测试同步。方法论蒸馏来源的许可声明追加至 `THIRD_PARTY_NOTICES.md`，
  规范正文不携带外部来源线索。

### Fixed

- **e2e 首跑暴露的四处运行时缺陷**：① `app.tsx` 的 `queryClient` 非法运行时导出键
  （umi 注册器 register failed，白屏）——移入 `src/utils/queryClient.ts`；② 框架
  `request()` 直调不做 `dataField` 解包（仅 useRequest 生效）——`apiClient` 统一
  解包 `{data:...}`，否则登录 token 永远存不上；③ MFSU 分包双 React 副本使
  rootContainer 层 hooks 崩溃（dispatcher null）——`mfsu: false` + 偏好订阅通道；
  ④ 运行时内层 ConfigProvider 未续接 locale 且覆盖框架层——ThemeProvider 同步
  locale 与 `window.g_locale` 钉扎。
- **模板请求链生效**：运行时请求配置（`/api` 前缀、Bearer 拦截器、401 errorHandler）
  从 `config/config.ts` 迁到 `src/app.tsx` 的 `request` 导出；此前写在构建期配置里，
  框架只读取 `dataField`，三项全部不生效。Bearer 只附同源请求，外域不带用户凭证。
- **401 与回跳**：首页 `?login=1` 打开登录弹层，`redirect` 经同源校验后回跳（拒绝
  `//host`、`/\host`、`javascript:`、外域与指回登录弹层的目标），首页本身 401 也打开
  登录，已在首页登录弹层时不自循环；跳转用 `location.replace`，登录后后退不会回到
  锁屏弹层；集中在 `src/utils/authRedirect.ts`。data-layer 规范同步为「薄封装 +
  同源双认证 + 回跳同源」，删除与模板矛盾的 `fetch` + `credentials: 'include'` 形态。
- **安装器交付面**：`install.sh` 按 `manifest.runtime` 白名单复制（与打包器同口径）；
  此前全量复制再按黑名单删除，从开发仓库安装会带出 `.git`、`.spec`、agent 状态目录。
  manifest 缺 runtime、条目缺失或越界时退出 2 且不写盘。
  源目录的 SKILL.md 受 git 跟踪时（仓库顶层或 monorepo 子目录）只装已跟踪文件，runtime
  内有未跟踪且未忽略的文件则拒绝安装；解包在其他仓库未跟踪目录里的归档按文件系统复制。

### Changed

- **B2 改白名单**：`react-router-dom` 与 `react-router`（含子路径）只放行 `MemoryRouter`、
  与其同文件导入的 `Route` / `Routes`，以及 type-only 导入；白名单外的命名、default、
  namespace 导入、re-export 与动态 `import()` 一律违规，按导入名判定（`as` 别名不能
  绕过；`import type, {…}` 里作默认绑定的 `type` 按值导入判定；同行 `;` / `}` 之后的 import
  同查）。此前的命名导出黑名单放行 `Navigate`、`createBrowserRouter`、`useParams` 与
  `react-router` 主包。
- **ban_scan 覆盖面**：B1/B5 识别 `export … from` re-export；B5 新增包装库
  （`react-leaflet`、`react-map-gl`、`@vis.gl/react-maplibre`、`@react-leaflet/`）、扫描
  样式面并识别 less 的 `~` 前缀；B6 扫描 html/ejs 模板；B4/B5 依赖扫描纳入
  `optionalDependencies`（peerDependencies 仍不扫）。修复无分号代码 B2 跨语句误报与
  注释行 import 误报；行内块注释之后的活代码、`import{…}from'…'` 紧凑写法、less 的
  `@import (reference)` 与 `@import url()` 均能识别。
- **ban_scan 退出码**：文件读取失败、package.json 解析失败、扫描面零文件一律退出 2，
  已收集的 findings 照常输出；`--json` 增加 `scanned` 与 `errors`。对只含文档的目录
  扫描不再报 clean，README 自扫示例改为 `template/`。

## [1.3.0] - 2026-10-31

### Added

- **公开页面章节**：新增 `references/public-pages.md`（条件加载）——单一转化目标、
  页面结构与布局、转化文案、内容真实性、视觉方向、交互态与动效、SEO/AEO 与上线
  清单。公开落地页/营销页/活动页/定价对比页为条件叠加页面类型，不改变四个中后台
  核心场景，中后台任务不读该章节。
- **横切交付纪律**：`general-pages` 新增「交互态与可访问基线」与「内容真实性」
  （hover/active/focus-visible、skip link、aria、alt、不交付占位文案/不伪造证据）；
  `design-tokens` 新增「动效与交互状态」真源（transform/opacity、reduced-motion、
  IntersectionObserver、动效 token 跟随）。
- **接线与门面**：`SKILL.md` 增加公开页条件路由/成功定义/决策规则/反模式/复核项；
  `design-reasoning`、`scenario-coverage`、`testing-guide` 同步条件叠加；
  README 双语、AGENTS 与文档结构契约测试同步。上游 MIT 许可声明落根级
  `THIRD_PARTY_NOTICES.md`，规范正文不携带外部来源线索。

## [1.2.0] - 2026-10-30

### Added

- **界面删减**：general-pages 新增 §界面删减（删除对象 / 删除试读 / 保留清单 / 自查钩子）——
  新增或触碰的界面不留多余标语、说明文字与次要标签，删后读不懂则重新设计布局、不补文字；
  design-reasoning 设计产物契约增「删减检验」行。
- **三方体验账**：engineering 新增 §三方体验账——每次改动对用户（UX）、开发者（DX）、
  AI Agent（AX）逐方记账，三方都变好、现有功能零破坏，任一方变差即未完成。
- **入口接线**：SKILL.md 的 Success Definition / Anti-Patterns / Review Loop 同步记入两条
  约束，scenario-coverage 增 4 行；八层与 B1–B7 契约不变，不新增 B 禁令。
- **文档结构契约测试**：`scripts/tests/test_spec_docs.py`，锁住八层标题、B-ID 三方同源、
  链接与锚点可解析、篇数与原则数声明、规范层来源线索零泄漏，以及两条约束的接线。

### Fixed

- **模板构建兼容**：Umi 配置启用 `esbuildMinifyIIFE`，避免多 chunk 压缩后的 esbuild helper
  命名冲突，出厂 `npm run build` 恢复通过。
- **打包器只收已跟踪文件**：`build_package.py` 在 git 工作树顶层按已跟踪文件收集目录条目，
  被 `.gitignore` 忽略的本地生成物、锁文件与 `.DS_Store` 不再入包；目录内未跟踪且未忽略的
  文件使构建以 exit 2 失败，避免无声漏包或本地状态进入发布载荷。
- **发布隐私门禁与产物卫生**：组装后的发布树逐文件扫描家目录绝对路径、仓库 git 远端里的
  私有主机名与常见凭据格式，命中即 exit 2，只报文件、行号与规则名；tar 条目不再带构建者的
  用户名与 uid；每次构建先清理 `dist/` 旧产物，失败不留归档；manifest 的 skill 名或版本号
  格式不对时拒绝构建。

## [1.1.0] - 2026-10-14

### Changed

- **规范层去引用源自洽化**：SKILL.md 与九篇 references/ 不再携带任何外部证据
  引用与来源仓库线索，条文以自洽抽象表述（禁令语义、模式、默认值单文自足）；
  Review Loop 引用完整性门改查规范文档自身互链。`library/` 证据档案、
  `LICENSE-LIBRARY` 及快照工具（index_library/verify_snapshot）退出交付面：
  manifest.runtime 闭式清单移除，安装器暂存净化同步排除；仓库内部保留档案，
  不随安装与打包分发。授权面回归单层 PolyForm Noncommercial。

### Fixed

- **起始模板质量门修复**：出厂即门禁全绿（`npm run lint && npm run test:ci`）。
  ① 七个源文件 biome 格式对齐，`biome.json` 换用 `rules.preset`（2.x 弃用键
  `recommended`），诊断清单换键前后逐条一致；② 删除 `apiClient.ts` 未使用类型
  `ApiFn`（唯一 lint error）；③ 测试链三处接线修复（setupTests 移入
  `setupFilesAfterEnv`、esbuild JSX 对齐 `react-jsx`、tsconfig types 补
  jest-dom），并新增 Home 渲染冒烟测试（此前 0 测试致 `test:ci` exit 1）；
  ④ 门禁硬化：`lint` 改用 `biome check .`，格式漂移提交前拦截。

### Added

- **起始模板 `template/`**：非地图基座合规骨架（五真源 + 统一请求通道 +
  内容壳 + Home 形态示例），随包分发；新项目冷启动从复制模板开始。

## [1.0.0] - 2026-10-14

### Changed

- **全量重做为约束型 skill**：抛弃「参考驱动」方案（Source Precedence 阶梯、Final Gate、
  示例与评测面），SKILL.md 重写为八层骨架约束主文；一切企业级前端工作默认执行规范，
  禁令全局硬执行、token 与结构约定跟随目标仓库真源；规范条文全部可追溯至 library/ 快照证据。

### Added

- **规范域七篇**：general-pages（页面）、data-layer（请求与服务端状态）、design-tokens
  （设计 token）、engineering（工程规约与禁令表 B1–B7）、map-layers / map-interaction
  （地图条件章节）、scenario-coverage（四场景映射矩阵）。
- **library/ 静态快照**：248 文件逐字节快照 + SNAPSHOT.json（全量 SHA-256）+ SOURCE 采集
  记录 + SNAPSHOT-MANIFEST/SNAPSHOT-REVIEW 收录边界与逐文件审查 + INDEX 自动索引。
- **工具链五件 + 测试**：verify_snapshot.py（快照完整性校验）、ban_scan.py + ban_rules.json
  （禁令静态检查，规则表与规范禁令表同源，B7 显式不扫）、index_library.py（确定性索引重建）、
  install.sh（宿主无关安装器）、build_package.py（发布打包），各配 unittest 矩阵。
- **双许可载体**：LICENSE-LIBRARY（派生源码快照的 AGPL-3.0 全文 + 上游 MIT 归属，独立于
  PolyForm）；双语 README（中英互链）。

### Removed

- **旧发布面**：宿主耦合安装器、旧 manifest schema v1、build_release / package_skill /
  index_antd / test_tooling / validate_project 五件旧工具、examples/、evals/、docs/、agents/、
  RELEASE.md、CONTRIBUTING.md。

## [0.3.0] - 2026-10-04

### Added

- Added `README.en.md` as the English mirror of the rewritten Chinese-primary `README.md`; both share one structure and cross-link at the top.
- Added `docs/why-reference-driven.md`, a Chinese design-rationale article explaining vertical slices, source precedence, the smallest complete change, and the Final Gate.
- Release archives now ship `README.md`, `README.en.md`, and `LICENSE` at the archive root, so a distributed package carries its own documentation and license without the authoring repository.

### Changed

- Rebuilt `README.md` as the Chinese-primary document ordered by a reader question chain: what/why with a neighboring-skill comparison and explicit non-goals, install, use, repository map, license.
- Switched the license from an unsupported "MIT" mention to PolyForm Noncommercial 1.0.0: added the official `LICENSE` text and updated the License section of both READMEs; commercial use now requires separate written authorization.
- Allowed `LICENSE` and `README.en.md` as repository root entries in `scripts/validate_project.py`, keeping the root inventory closed.

## [0.2.0] - 2026-10-04

### Changed

- Renamed the skill from `dawud-ui` to `enterprise-frontend`. The old name was an unsearchable personal brand plus a generic word; the new one matches how users look for this capability ("enterprise frontend") and follows agent-skill naming guidance (descriptive, lowercase, hyphenated). Install paths, release artifact names, the invocation syntax (`$enterprise-frontend` / `/enterprise-frontend`), and the publication contract now use the new name. This intentionally breaks the installer destination contract: existing `dawud-ui` installations are not migrated automatically — reinstall and remove the old directories. The rename decision record, including the keyword research and recommended public-repository topics, lives in the repository internal decision records.
- Allowed `.zcode/` as ignored local agent state alongside `.agents/` so repository validation tolerates session-local plan files.
- Aligned `scripts/` with the current ruff 0.16 rule set so the release gate passes again: explicit `check=False` on `subprocess.run`, combined context managers, import ordering, bare `raise` in the restore path, and executable bits for shebanged scripts. No behavior change; the violations predated this release.

## [0.1.0] - 2026-09-21

### Added

- Added `scripts/build_release.py` to emit versioned `dist/` artifacts (`tar.gz`, `zip`, `SHA256SUMS`, `RELEASE_NOTES.md`) with `VERSION` and `BUILD_INFO` stamps.

### Changed

- Consolidated the runtime into one scope-aware workflow; local fixes no longer imply full-repository discovery or a new vertical slice, and absent analogues fall back to target primitives and explicit contracts.
- Removed duplicate entry-point, migration, evaluation and maintenance checklists; each rule has one owner, equivalent verification is not rerun without changed inputs, and evaluation scenarios now cover local fixes and missing analogues.

- Kept malformed URL and fixture-path errors inside validator diagnostics, rejected control characters before filesystem resolution, and recognized protocol-relative external links; added regression coverage for invalid inputs and path-resolution failures.

- Fixed validation after installation by pruning local backup/cache trees; included SKILL resource links and runtime dependency closure in validation.
- Unified strict manifest validation between packaging and repository checks, rejecting malformed JSON shapes, unsafe cross-platform paths, symlink ancestors, and special files.
- Made installer staging destination-local, cleaned candidates on failure/skip, protected backup destinations, added unique backup containers and Pi detection, and kept dry-run free of Python bytecode writes.
- Added portable offline-index regeneration with exact-byte fingerprint and section checks; removed the GNU awk requirement and corrected stale API flags.
- Added evaluation contract validation and clarified that scenario definitions are not executed behavioral benchmarks.

- Reframed dawud-ui as a reference-driven frontend adaptation skill.
- Established source precedence: user intent, target repository, supplied reference, closest target-local example, framework facts, then fallback defaults.
- Added Adopt, Extend, and Align operating modes.
- Added one complete vertical-slice adaptation example and focused migration, verification, fallback, and Ant Design references.
- Separated runtime skill content from repository maintenance content through `manifest.json`.
- Made packaging deterministic with `scripts/package_skill.py`; installation now replaces stale runtime trees instead of overlay-copying files.
- Co-located the Ant Design offline mirror and its index under `references/antd/`.
- Consolidated the evaluation contract into `evals/README.md`.
- Rewrote user, maintainer, agent, and Windows documentation against the final structure and executable commands.
- Hardened packaging and installation against symlink path escapes, dangling destinations, and failed replacement commits; added transactional restore behavior and standard-library tooling regression tests.
- Extended repository validation to check local Markdown image references as well as ordinary links.

### Removed

- Fixed cross-project style contracts and mandatory page topology guidance.
- Obsolete component/pattern catalogs, visual cases, training decks, golden prose outputs, and historical task archives.
- Duplicate installation file lists and duplicate evaluation documentation.
