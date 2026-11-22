---
load_when: "SKILL.md Workflow 完成场景判定后读本篇，按场景取必读锚点与自查钩子、核对四场景覆盖缺口"
rule_ids: []
depends_on: ["layout-system.md","engineering.md","design-reasoning.md","general-pages.md","data-layer.md","design-tokens.md","testing-guide.md","public-pages.md","map-layers.md","map-interaction.md","visual-review.md"]
size_budget: 144
---

# 场景覆盖矩阵（scenario-coverage）

> 四个核心场景 + 公开页面 / 视觉审查条件叠加 → 规范条目映射矩阵（顺序：地图工作台 →
> 规范审查 → 存量页面修改 → 非地图 CRUD；公开页面与视觉审查为条件叠加，不改变四场景主分类）。
> SKILL.md Workflow 判定场景后读本篇，按行取必读锚点与自查钩子。
> 矩阵只做映射不复制条文——约束条文的单一真源在各规范文档与
> [engineering](engineering.md) 禁令表。

## 用途与读法

- 每行 = 一个工作面：**必读锚点**（`references/<doc>.md#<标题原文>`，锚点口径 =
  标题原文锚）→ **关键约束条目**（指向各文档节内容）→ **禁令子集** →
  **自查钩子**（可执行命令）。
- **B1–B7 恒全局适用**（禁令全局硬执行，与 [engineering](engineering.md) 全局
  执行面一致）：任何场景、任何仓库现状都不豁免；本矩阵「禁令子集」列**仅示该
  场景高发/侧重项**，不是适用性边界——未列入的禁令同样适用。
- **界面删减与三方体验账同样恒全局适用**：前者作用于本次新增或触碰的界面，后者作用于
  每次改动的交付说明；二者是语义判定、不入 B 禁令与扫描规则表，矩阵只在各场景给入口行。
- 工作面之间不互斥：一个任务可同时命中多个工作面，逐行取用；地图场景额外叠加
  两篇地图文档（SKILL.md 路由表条件加载）；公开访客页面额外叠加公开页文档，中后台
  任务不读；截图像素级审查 / 视觉回归 / e2e 修改意见任务额外叠加视觉审查文档，
  纯代码任务不读。
- 自查钩子中的 `<目标>` 代指本轮改动面路径（目录或文件）；规范审查场景的钩子
  即本仓工具（ban_scan）的执行命令。

### 地图工作台

| 工作面 | 必读锚点 | 关键约束条目 | 禁令子集（高发/侧重） | 自查钩子 |
| --- | --- | --- | --- | --- |
| 新页面设计推理 | [design-reasoning](references/design-reasoning.md#页面形态判定矩阵) | 形态判定走地图工作台行；先设计后实现 | B5/B6/B7 高发场景先设计 | 设计产物 ↔ 实现对照复查 |
| 布局分区 | [layout-system](references/layout-system.md#布局公理layout--cell--card--content) | 地图页按 map-workbench 配方：地图 Card flush、侧栏独立 Cell；每 Cell 一 Card | — | `grep -n -e "<PageLayout" -e "<PageCell" -e "<PageCard" <目标>`（三件套齐备） |
| 图层选型 | [map-layers](references/map-layers.md#选型矩阵) | 五类触发场景对应路径；禁原生服务降级拼装 | B5 | `python3 <skill-root>/scripts/ban_scan.py <目标>` |
| 生命周期 | [map-layers](references/map-layers.md#图层生命周期与清理) | 宿主统一管理；destroy 链完整；WGS84 坐标边界 | B7 | `grep -n -e "map\\.add" -e "map\\.remove" <目标>`（应零命中） |
| 渲染预算 | [map-layers](references/map-layers.md#渲染预算与显式降级) | 三值预算（5000/300/200）；超预算显式降级；完成项移出地图 | — | `grep -n -e "MAX_TILES" -e "MAX_GRAPHICS" -e "MAX_LABELS" <目标>`（预算常量抽查） |
| 框选/绘制/选择 | [map-interaction](references/map-interaction.md#交互原则) | 宿主附着器；五态状态机；受控选择契约；高亮走语义令牌 | B7 | `grep -nE "MAP_STYLES" <目标>`（overlay 样式真源抽查） |
| 告警与图例 | [map-interaction](references/map-interaction.md#地图信息组件模式) | 页内覆盖层 Alert；分档色带 + 可访问性；pointer-events:none | — | 对照 basemap 告警 / 置信度图例组件既有形态 |
| 资产与入口 | [map-interaction](references/map-interaction.md#资产同源与引擎唯一入口) | assets 同源；同步脚本前置；只从门面 import | B5/B6 | `python3 <skill-root>/scripts/ban_scan.py <目标>` |

### 规范审查

| 工作面 | 必读锚点 | 关键约束条目 | 禁令子集（高发/侧重） | 自查钩子 |
| --- | --- | --- | --- | --- |
| 禁令审查 | [engineering](references/engineering.md#全局禁令表b1b7唯一真源) | B1–B6 机器扫；B7 结构推断不扫、人工复查 | 全量 | `python3 <skill-root>/scripts/ban_scan.py <目标>` |
| 文档引用完整性 | [engineering](references/engineering.md#交叉引用) | 各篇互链与章节锚点逐条存在 | — | 抽取文档互链路径逐条 `test -e` |
| 四态与接线复查 | [general-pages](references/general-pages.md#四态一致承载) | 逐区块四态；五真源 diff 无平行体系 | — | 四态 grep + 真源 diff（同上两行钩子） |
| 设计产物审查 | [design-reasoning](references/design-reasoning.md#设计产物契约) | 新页面/新功能的设计产物（形态·布局·决策记录·组件组成·删减检验·真源接线增量）与实现逐项对照；偏离未回写即审查不通过 | — | 设计产物 ↔ 实现对照复查 |
| 布局结构审查 | [layout-system](references/layout-system.md#布局公理layout--cell--card--content) | 逐页核对 Layout 行列矩阵、Cell 与 Card 一对一、Card content 内容组件化；例外页落白名单 | — | `grep -rn -e "<PageLayout" -e "<PageCell" -e "<PageCard" -e "grid-cols-" <目标页面目录>`（逐页判定） |
| 测试形态审查 | [testing-guide](references/testing-guide.md#反模式) | 同名同目录、有断言、四态覆盖、mock 未覆盖被测对象 | — | 对照反模式清单逐项复查 |
| 体验约束审查 | [engineering](references/engineering.md#三方体验账) | 交付说明 UX / DX / AX / 零破坏四行齐备；界面删减结论：保留项各落保留清单一条 | — | `grep -rn -e "<Tag" -e "<Badge" -e "subTitle=" -e "tooltip=" -e "description=" -e 'type="secondary"' <目标>` |

### 存量页面修改

| 工作面 | 必读锚点 | 关键约束条目 | 禁令子集（高发/侧重） | 自查钩子 |
| --- | --- | --- | --- | --- |
| 场景判定与最小变更 | [general-pages](references/general-pages.md#用途与触发场景) | 存量修改最小完整变更；禁令面内顺手修正不扩战线 | B1–B7 全量 | `python3 <skill-root>/scripts/ban_scan.py <目标>` |
| 真源跟随 | [design-tokens](references/design-tokens.md#真源跟随规则) | 读目标仓库真源沿用；不开平行体系；偏离改真源带 why | — | `git diff <目标>`（无平行主题/散落硬编码） |
| 布局回归 | [layout-system](references/layout-system.md#布局公理layout--cell--card--content) | 触碰页面保持 Layout → Cell → Card → content；改布局先回写设计产物布局坐标 | — | `grep -n -e "<PageLayout" -e "<PageCell" -e "<PageCard" <目标>`（三件套齐备） |
| 菜单与深链 | [general-pages](references/general-pages.md#菜单与路由接线) | 隐藏菜单 ≠ 删除深链；双真源分离同步 | — | 对照 `config/routes.ts` ↔ `src/nav/navViews.ts` diff |
| 四态回归 | [general-pages](references/general-pages.md#四态一致承载) | 触碰面逐数据区块核对四态 | — | `grep -n -e "Skeleton" -e "Empty" -e "ErrorBoundary" -e "disabled" <目标>` |
| 禁令回归 | [engineering](references/engineering.md#全局禁令表b1b7唯一真源) | 全局硬执行，不因现状让步 | B1–B7 全量 | `python3 <skill-root>/scripts/ban_scan.py <目标>` |
| 三方体验账 | [engineering](references/engineering.md#三方体验账) | 触碰面逐方记账；行为覆盖不减、断言不放宽；路由 path / queryKeys / 权限键 / 接口形状不变；界面删减只作用于触碰面 | — | `npm run lint && npm run test:ci`（目标仓质量门）+ `git diff <目标>`（无公开契约变动） |

### 非地图 CRUD

| 工作面 | 必读锚点 | 关键约束条目 | 禁令子集（高发/侧重） | 自查钩子 |
| --- | --- | --- | --- | --- |
| 新页面接线 | [engineering](references/engineering.md#新页面四步接线流程) | 四步接线与验收物；接线质量钩子 | B2 | `python3 <skill-root>/scripts/ban_scan.py <目标>` |
| 新页面设计推理 | [design-reasoning](references/design-reasoning.md#页面形态判定矩阵) | 先产出形态·布局·组件组成设计产物，实现后逐项对照 | — | 设计产物 ↔ 实现对照复查 |
| 布局分区 | [layout-system](references/layout-system.md#布局公理layout--cell--card--content) | 按 single / stats-content / main-aside 等配方声明 rows × cols / areas；每 Cell 一 Card | — | `grep -n -e "<PageLayout" -e "<PageCell" -e "<PageCard" <目标>`（三件套齐备） |
| 布局与内容壳 | [general-pages](references/general-pages.md#布局骨架) | 页头槽位废黜；内容壳锁视口；高度链；页滚例外显式声明 | — | `grep -n "pageHeaderRender={false}" <目标>` |
| 列表/表单/详情 | [general-pages](references/general-pages.md#CRUD-模式) | ProTable 列表（卡内滚）；Modal+Form 编辑；Descriptions 详情；Empty/Alert | — | 对照列表页 / 编辑弹层 / 详情抽屉既有形态 |
| 请求与缓存 | [data-layer](references/data-layer.md#双通道请求) | 通道二选一；apiClient 双认证；不直连 axios | B1 | `python3 <skill-root>/scripts/ban_scan.py <目标>` |
| 服务端状态 | [data-layer](references/data-layer.md#queryKeys-真源模式) | 单一真源键字典；四条键模式；invalidate 打 root | — | `grep -n "queryKeys\\." <目标>` |
| 登录态与推送 | [data-layer](references/data-layer.md#401-统一收敛) | 401 恒处理；不建独立登录路由页；SSE 走框架 | — | `grep -n "login=1" <目标>` |
| 主题与样式 | [design-tokens](references/design-tokens.md#真源跟随规则) | 真源跟随；禁双 token 体系；why 注释惯例 | — | `grep -nE "#[0-9a-fA-F]{6}" <目标>`（硬编码色值抽查） |
| 四态承载 | [general-pages](references/general-pages.md#四态一致承载) | 每数据区块加载/空/错误/禁用齐备 | — | `grep -n -e "Skeleton" -e "Empty" -e "ErrorBoundary" -e "disabled" <目标>` |
| 界面删减 | [general-pages](references/general-pages.md#界面删减) | 删除试读；读不懂则重新设计布局不补字；保留清单（四态文案 / 校验 / 单位 / 状态 Tag / 可访问名称） | — | `grep -rn -e "<Tag" -e "<Badge" -e "subTitle=" -e "tooltip=" -e "description=" -e 'type="secondary"' <目标>`（候选清单，逐处试读） |
| 测试编写 | [testing-guide](references/testing-guide.md#测试形态与用例设计) | 五形态用例设计 + mock 模式 | — | `npm run test:ci`（目标仓质量门） |
| 三方体验账 | [engineering](references/engineering.md#三方体验账) | UX / DX / AX 逐方记账；不转嫁；零破坏证据为命令输出 | — | `npm run lint && npm run test:ci`（目标仓质量门）+ 交付说明四行 |

### 公开页面（条件叠加）

仅在任务面向公开访客（落地页 / 营销页 / 活动页 / 定价对比页）时取用；不改变四个
核心场景的判定，也不把以下规则带入中后台。

| 工作面 | 必读锚点 | 关键约束条目 | 禁令子集（高发/侧重） | 自查钩子 |
| --- | --- | --- | --- | --- |
| 转化策略与结构 | [public-pages](references/public-pages.md#页面策略) | 一页一 offer / 一受众 / 一主行动；首屏单主 CTA；主张—证据—行动闭环 | B1/B2/B3 仍全局适用 | 对照页面大纲逐段检查主 CTA 唯一性与证据位置 |
| 文案与内容真实性 | [public-pages](references/public-pages.md#内容真实性) | 真实草稿；示例标注；不伪造客户/证言/指标；缺失证据写「待补证据」 | — | `grep -rn -e "lorem" -e "TODO" -e "标题写这里" <目标>`（候选清单，逐处试读） |
| 视觉方向与动效 | [public-pages](references/public-pages.md#视觉方向) + [design-tokens](references/design-tokens.md#动效与交互状态) | 单一视觉真源；只动画 transform/opacity；reduced-motion；IntersectionObserver | B7 仍适用（地图 overlay 另有真源） | `grep -n -e "addEventListener('scroll'" -e "prefers-reduced-motion" <目标>`（反例/正例抽查） |
| SEO 与上线清单 | [public-pages](references/public-pages.md#seo-与上线清单) | index/noindex 决策；title/meta；FAQ 真实问答；404/法务/alt/skip link | B1–B7 全量 | `grep -n -e "<title" -e "description" -e "alt=" <目标>`（入口文件抽查） |
| 交互态与可访问 | [general-pages](references/general-pages.md#交互态与可访问基线) | hover/active/focus-visible/disabled；focus ring 不移除；无死链 | — | `grep -n -e "focus-visible" -e "aria-current" -e "aria-label" <目标>` |
| 三方体验账 | [engineering](references/engineering.md#三方体验账) | 公开页同样逐方记账；零破坏证据为命令输出 | — | `npm run lint && npm run test:ci`（目标仓质量门）+ 交付说明四行 |

### 视觉审查（条件叠加）

仅在任务命中截图像素级审查 / 视觉走查 / 视觉回归复验 / e2e 修改意见时取用；
不改变四个核心场景的判定，纯代码任务不读视觉审查文档。

| 工作面 | 必读锚点 | 关键约束条目 | 禁令子集（高发/侧重） | 自查钩子 |
| --- | --- | --- | --- | --- |
| 证据采集 | [visual-review](references/visual-review.md#证据采集协议) | 视口×粒度×状态三维矩阵；稳定协议与环境元数据；结构+坐标采集；DPR 双采样；动态区域排除 | B1–B7 仍全局适用 | 截图产物的视口 / DPR / 状态元数据逐格核对 |
| 八维走查 | [visual-review](references/visual-review.md#八维走查清单) | 八维固定顺序走查；审查缺省值让位 token 真源；AI 味黑名单核对；装饰自减法 | — | 对照八维清单逐维核对审查产物 |
| 发现准入与记录 | [visual-review](references/visual-review.md#偏差判定) + [visual-review](references/visual-review.md#发现记录与-e2e-修改意见格式) | 准入四门（功能 / 无障碍 / 布局破损 / 违反设计约定）；感知色差双阈值与 AA 豁免；动态区域掩码清单化；还原度分层验收；**三级证据级别（observation / runtime-confirmed / fix-reverified）**；finding 强制字段与 fix 双分层；修复值走真源不发明新值 | — | finding 字段齐备性与「模糊表述」复查；掩码清单登记核对 |
| 修复与复验闭环 | [visual-review](references/visual-review.md#修复复验闭环) | 同参数同环境重截；前后对比排除误报；基线不可原地覆盖；复验裁判一致性（同一观察空间）；重试两级协议（采集稳定 + 判定，混合结果 flaky）；落地改动照常过质量门与三方体验账 | B1–B7 全量（落地改动面） | `npm run lint && npm run test:ci`（目标仓质量门）+ 交付说明四行 + 复验对比证据（含重试记录）+ `python3 <skill-root>/scripts/visual_review_check.py <证据包>`（退出码 0） |
| 响应式基线 | [visual-review](references/visual-review.md#响应式基线结构断言) | xl / lg / md / sm 四档逐图 `breakpoint` / `viewport` 与 PNG 实际尺寸一致；建立走 fix-reverified 证据包（verdict=pass、retries=pass）；r1 只读留存 | — | `python3 <skill-root>/scripts/visual_baseline_check.py --manifest docs/visual-baselines/r1/manifest.json --validate-only` + `python3 <skill-root>/scripts/visual_review_check.py docs/visual-baselines/r1/visual-review.json` |

## 覆盖缺口登记

构建本矩阵过程中的缺口逐条登记；处置类别 ∈ `resolved_current`（已回写至某文档
某节）/ `accepted_risk` / `non_actionable`（含理由）。**终态零 open 项。**

| 场景 | 工作面 | 缺口描述 | 处置类别 | 落点 |
| --- | --- | --- | --- | --- |
| 存量页面修改 | 最小变更原则 | 「最小完整变更/顺手修正不扩战线」的裁决语义归属 SKILL.md Decision Rules 分层表，references 不设对应节 | non_actionable | SKILL.md#decision-rules（映射归属 SKILL.md，非规范缺口） |
| 规范审查 | 工具使用说明 | ban_scan.py 的使用细节不设 references 专节 | non_actionable | SKILL.md#review-loop（工具落点已声明）；命令在本矩阵自查钩子列可执行，`--help` 即用法 |
| 非地图 CRUD / 地图工作台 | 全工作面锚点 | 各文档章节已覆盖全部行；未发现缺失约束 | resolved_current | 本矩阵四场景节（锚点解析通过，见验收证据） |
| 非地图 CRUD / 地图工作台 / 规范审查 / 存量页面修改 | 布局分区 | 布局结构契约原分散在 general-pages 与 design-reasoning，缺统一 Layout → Cell → Card → content 真源；已新增 layout-system 篇并在四场景矩阵接线 | resolved_current | `references/layout-system.md` 全篇 + 本节四场景布局行 |
| 公开页面 | 条件叠加 | 策略/文案/视觉/SEO/交互态已回写 public-pages 与相关横切文档 | resolved_current | `references/public-pages.md` 与本节各行 |

登记结论：**零 open 项**。
