---
load_when: "任何页面布局设计与实现：Layout 行列分区、Cell 与 Card 承载、Card 内容组件、高度链与响应式细则"
rule_ids: ["GP-LAYOUT-GRID", "GP-LAYOUT-CELL-CARD", "GP-LAYOUT-CARD-CONTENT", "GP-LAYOUT-HEIGHT", "GP-LAYOUT-RESPONSIVE"]
depends_on: ["general-pages.md", "design-reasoning.md", "design-tokens.md", "visual-review.md"]
size_budget: 420
---

# 页面布局系统（layout-system）

> 中后台页面的结构契约：**Layout（行列分区）→ Cell（区域）→ Card（卡片）→
> 内容组件（content）**。业务页面先声明布局矩阵，再把内容组件放进 Card；页面
> 不允许用裸 `div` / flex / grid 自行拼区域，也不允许在 Cell 里直接铺内容。
> 本篇是布局结构的唯一真源；`general-pages` 只保留页面壳与 CRUD 的接线入口。

## 用途与触发场景

任何新建页面、页面布局改造、响应式调整、布局审查，在写 JSX 前先读本篇，并在
[design-reasoning](design-reasoning.md#设计产物契约) 的设计产物中写明布局坐标
（rows / cols / areas / cells）。触发信号：页面分区、栅格、卡片网格、统计行、
主从布局、工作台、仪表盘、地图工作台、表单页、详情页、列表页骨架。

公开落地页 / 营销页 / 活动页 / 定价对比页不适用本篇：公开页面按
[public-pages](public-pages.md) 分节组织，不套中后台 Layout → Cell → Card 配方。
403 / 404 / 登录引导 / 打印页等**全屏结果页**为显式例外，见 §例外与白名单。

## 布局公理（Layout → Cell → Card → Content）

业务页面的内容区必须从外到内保持四层，不得跳层、不得并行第二套结构：

```text
PageShell（视口壳：锁视口，不承担分区）
└─ PageLayout（Layout：rows × cols / areas 的行列分区）
   └─ PageCell（Cell：一个区域，Layout 的直接子节点）
      └─ PageCard（Card：一张卡片，Cell 的唯一子节点）
         └─ 内容组件（content：ProTable / Descriptions / Form / Chart / List / ...）
```

| 编号 | 公理 | 判定 |
| --- | --- | --- |
| L1 | **Layout 必选**：业务页面的内容区根节点必须是 `PageLayout`；`PageShell` 只提供视口与内边距，不承担分区 | 页面 JSX 出现裸 `div` + Tailwind `grid` / `flex` 自拼页面区域 → 违规 |
| L2 | **行列显式**：`PageLayout` 必须给出 `rows` 与 `cols`（或 `columns` 快捷列数）；非 1×1 布局必须给出 `areas` 矩阵或每格显式 `row/col/span` | 仅写 `display: grid` 而无轨道定义、或用子元素 `order` 决定位置 → 违规 |
| L3 | **区域唯一**：每个区域恰好一个 `PageCell`；`PageLayout` 的直接子节点只能是 `PageCell` | 在 Layout 下直接放内容、放两个 Cell 叠在同一区域 → 违规 |
| L4 | **一 Cell 一 Card**：每个 `PageCell` 必须且只能承载一个 `PageCard`；禁止空 Cell、一个 Cell 多张 Card、Card 内再套 Card | `PageCell` 下直接放 `div` / `ProTable` / 多张 Card → 违规 |
| L5 | **Card 内容组件化**：`PageCard` 的 `content` 必须是具名内容组件（见 §Card 内容组件）；禁止裸文本、裸 `div` 内容堆、卡片内自制页面骨架 | `content={<div>...</div>}` 承载业务内容、Card 内直接写说明文字代替组件 → 违规 |
| L6 | **单一页面级 Layout**：一个页面只允许一个 `PageLayout`；Card 内部的分组由内容组件自身承担，不再嵌套 `PageLayout` | Card 内出现第二个 `PageLayout` → 违规（内容组件内部自有布局不在此列） |

公理的作用是让页面结构可被机器与 Agent 稳定识别：Layout 是区域清单，Cell 是区域
身份，Card 是视觉与滚动边界，content 是业务组件入口。跳层会让滚动归属、四态承载、
可访问树与后续页面审查同时失去锚点。

## Layout 契约

随包模板提供 `template/src/components/PageLayout.tsx`，导出 `PageLayout`、
`PageCell`、`PageCard`。目标仓库已有等价布局组件时，按其真源适配，但必须保持
`Layout → Cell → Card → content` 的四层语义与 §布局公理 的判定不变。

### PageLayout

```tsx
<PageLayout
  rows={['auto', 1]}          // 行轨道：number = minmax(0, Nfr)，'auto' = 内容高
  columns={12}                 // 等宽列数快捷方式；与 cols 二选一
  gap={layoutTokens.gap}       // 间距走 layout token 真源
  collapse="md"                // 窄屏收缩档：none / sm / md / lg / xl
>
  <PageCell row={1} col={1} colSpan={3}>...</PageCell>
  <PageCell row={2} col={1} colSpan={8}>...</PageCell>
</PageLayout>
```

- `rows`: 行轨道数组；`number` 转成 `minmax(0, Nfr)`，`'auto'` 由内容决定。
- `cols`: 列轨道数组；与 `columns` 互斥。
- `columns`: 等宽列数快捷方式（常用 4 / 7 / 12），内部展开为等权 `minmax(0, 1fr)`。
- `areas`: 非平凡布局的命名区域矩阵，必须与 `rows × cols` 严格对齐；每个区域名
  只能由字母开头、由字母 / 数字 / `_` / `-` 组成。
- `gap`: 数值来自 `layoutTokens.gap`（默认 16），页面不写字面量间距。
- `collapse`: 默认 `md`（低于 768px 单列堆叠）；`none` 表示不收缩，仅用于已证明
  不需要响应式的固定工作台。

### PageCell

```tsx
<PageCell area="main">...</PageCell>            // 命名区域模式
<PageCell row={2} col={1} colSpan={8} rowSpan={1}>...</PageCell>  // 显式坐标模式
```

- `area` 与 `row / col / colSpan / rowSpan` 互斥；`area` 必须在 `areas` 矩阵中存在，
  且每个矩阵区域恰好被一个 Cell 使用。
- 不写坐标时按 DOM 顺序自动排布，但仍受 `cols` / `areas` 约束。
- `span` 可给出响应式跨列：`{ base: 3, lg: 3, md: 6, xs: 12 }`；未给的档位继承
  上一档。跨列总和在每一档不得超过该档列数。
- 运行时校验：`PageCell` 的直接子元素必须恰好是一个 `PageCard`；违反时开发态
  直接抛错，不静默降级。

### PageCard

```tsx
<PageCard
  title="项目列表"
  extra={<Button type="primary">新建</Button>}
  variant="flush"
  content={<ProTable ... />}
/>
```

- `title`: 区域标题；KPI / 纯指标卡可以省略，由内容组件自带标签。
- `extra`: 区域级操作（新建、刷新、筛选入口），不把行内操作放这里。
- `content`: 必填内容槽，只接内容组件；不接裸文本与页面级容器。
- `variant`: `default`（内容区滚动）/ `flush`（表格、地图、通栏图表，Card body 无
  内边距且不滚动）/ `compact`（KPI、紧凑列表，减小内边距）。
- Card 的高度由 Cell 决定；Card 不自带外边距，间距一律由 Layout `gap` 承担。

## 行列与区域规则

1. **列数刻度**：默认 12 列（可被 2 / 3 / 4 / 6 整除）；KPI 行可用 4 列；主次内容
   可用 7 列（4 + 3）。目标仓库已有 24 列栅格时按 2:1 折算到 12 列，不混用两套列数。
2. **轨道写法**：弹性轨道一律 `minmax(0, 1fr)`；不要让 `1fr` 裸写在 grid 子项上，
   否则长表格 / 长标题会把轨道撑破。固定宽度只允许来自目标仓库布局真源，不写
   页面级像素宽度。
3. **行轨道**：页头 / 统计行 / 工具行用 `'auto'`；主内容行用 `1`（即
   `minmax(0, 1fr)`）；最后一行必须吃掉剩余高度。不要给布局根写 `height: calc(...)`。
4. **区域命名**：语义化小写 kebab-case，按职责命名而非方位：`filters`、`summary`、
   `main`、`aside`、`activity`、`legend`；禁止 `left`、`right`、`top`、`bottom` 这类
   随响应式变化就失真的名字。
5. **阅读顺序**：DOM 顺序即阅读顺序。响应式堆叠后按 DOM 顺序自上而下排列；禁止
   用 `order`、`grid-area` 负下标或绝对定位制造与 DOM 不一致的视觉顺序。
6. **区域完整性**：`areas` 中的每个名字必须恰有一个 Cell；Cell 的 `area` 必须在
   矩阵中定义；矩阵行列数与 `rows` / `cols` 长度相等。缺失或重复都视为结构错误。
7. **禁止嵌套 Layout**：页面级只允许一个 `PageLayout`；Card 内的二级分组用
   内容组件自带布局（ProTable 的 toolbar、Descriptions 的分组、Tabs、List 分组），
   不再起第二个页面栅格。

## 布局配方

配方是**结构契约**，行列数与跨列是默认值；目标仓库已有布局真源时按真源替换数值，
但 Layout → Cell → Card → content 的层次不得改。

| 配方 | 结构 | 适用信号 | 关键规则 |
| --- | --- | --- | --- |
| 单区页 `single` | `rows=[1] cols=[1]` | 单一主内容区（列表 / 详情 / 设置） | 一张 Card 吃满内容区；Card body 是唯一滚动容器 |
| 纵向堆叠 `stack` | `rows=[auto, auto, 1] cols=[1]` | 多个独立区块、阅读顺序明确 | 每段一个 Cell / Card；不要在 Card 里再叠 Card |
| 统计 + 内容 `stats-content` | `rows=['auto', 1] columns=4` | 模块首页、运营概览 | 统计行 4 个 Cell 各 `colSpan=1`；主内容 Cell `row=2 colSpan=4` |
| 主次两栏 `main-aside` | `rows=[1] cols=[2, 1]` | 主内容 + 侧栏（活动、说明、快捷入口） | 主栏在前、侧栏在后；窄屏按 DOM 顺序堆叠 |
| 主从 `master-detail` | `rows=[1] cols=[1, 3]` | 左列表 + 右详情 | 列表 Card `variant="flush"`；详情 Card 空态用 Empty；不新开路由 |
| 仪表盘 `dashboard` | `rows=['auto', 'auto', 1] columns=12` | KPI + 图表 + 明细 | KPI `colSpan=3`；图表 `colSpan=8 / 4` 或 `6 / 6`；明细 `colSpan=12` |
| 地图工作台 `map-workbench` | `rows=[1] cols=[3, 1]` | 地图主画布 + 图例 / 图层 / 详情侧栏 | 地图 Card `variant="flush"`，地图组件在 Card content 内；侧栏每个区域独立 Cell |
| 长表单 `long-form` | `rows=['auto', 'auto'] cols=[1]` + `PageShell exception="long-form"` | 内容天然超屏的采集 / 向导 | 页滚必须由 `PageShell exception` 显式声明；Card 不承担页面级滚动 |

配方组合时保持一页一个 `PageLayout`：例如「统计 + 主次两栏」用同一个
`rows=['auto', 1]` 矩阵表达，统计行跨满，主内容行再分 `colSpan=8 / 4`，不嵌套第二个
Layout。

## Card 内容组件

Card `content` 只接**具名内容组件**。选型表：

| 内容 | 内容组件 | Card variant |
| --- | --- | --- |
| 数据表、列表 | `ProTable` / `Table` | `flush` |
| 只读详情 | `Descriptions` | `default` |
| 新建 / 编辑表单 | `Form`（Modal 承载时 Modal 内使用；页面级表单卡用 `default`） | `default` |
| KPI / 指标 | `Statistic` / `ModuleStatsRow` / `KpiStatRow` 类统计组件 | `compact` |
| 图表 | 图表卡组件（`@ant-design/charts` 封装） | `flush` 或 `default` |
| 活动 / 时间线 / 排行 | `List` / `Timeline` / 排行组件 | `default` |
| 地图画布 | 地图宿主组件（唯一引擎入口） | `flush` |
| 空态 | `Empty` | `default` |
| 加载态 | `Skeleton` 骨架族（首屏）/ 组件 loading（刷新） | `default` |
| 错误态 | `Alert` + 重试（区块内） | `default` |

内容组件纪律：

- **一个 content 一个主组件**：Card content 可以包含该组件所需的子元素，但不把
  表格 + 图表 + 表单拼成一个无名字段堆；需要多块内容时拆成多个 Cell / Card。
  `PageCard` 在开发态校验 `content` 必须是 React 组件节点（非裸文本、非原生
  `div` / `span`），违规直接抛错，不静默降级。
- **标题与操作归 Card**：区域标题、刷新、新建等放在 `title` / `extra`；内容组件
  内部只保留自身工具栏（搜索、列设置、分页等）。
- **四态在 Card 内闭环**：每个数据驱动 Card 的 content 必须给出加载 / 空 / 错误 /
  禁用四态（[general-pages](general-pages.md#四态一致承载)）；骨架形状要与 Card
  内容形态一致，不能全站一个转圈。
- **不套营销结构**：Card 内不出现 hero、口号、FAQ、主 CTA 等公开页结构；中后台
  任务不读 public-pages。

## 高度链与滚动

高度链的唯一目标是：**页面不滚，Card body 滚**。

1. `PageShell` 锁视口（`calc(100dvh - header)`），内容区高度 100%。
2. `PageLayout` 高度 100%、`min-height: 0`；`PageCell`、`PageCard` 及 Card body
   逐级 `min-height: 0`，否则 flex / grid 子项会被内容撑破。
3. 行轨道用 `'auto'` + `1`：`'auto'` 行按内容高，`1` 行吃剩余高度；不要写
   `height: calc(100% - 57px)` 这类页面级高度猜测。
4. 表格滚动归 `ProTable` / `Table` 的 `scroll={{ y }}` 或组件自身滚动容器；地图
   归地图宿主；图表按 Card 高度自适应；Card body `overflow: auto` 只用于普通内容。
5. 页面级滚动只能由 `PageShell exception="long-form" | "content-flow" | "debug-stream"`
   显式声明；声明后布局回到文档流，但 Card 内部仍保持自己的滚动边界。
6. 禁止在 Cell 或 Card 里写 `position: absolute` 的整页覆盖层来逃避高度链；禁止
   用 `100vh`（移动端浏览器地址栏会变化），统一走 `100dvh` 链。

## 响应式规则

断点与收缩顺序（按目标仓库 token 真源覆盖；无真源时用下列默认）：

| 档位 | 视口 | 行为 |
| --- | --- | --- |
| `xl` | ≥ 1200px | 完整行列矩阵；仪表盘 12 列、KPI 4 列 |
| `lg` | 992–1199px | 主次栏保留，KPI 可降到 2 列；图表主次可改 6 / 6 |
| `md` | 768–991px | 多列降为 2 列或单列；侧栏移到主栏之后 |
| `sm` | < 768px | 单列堆叠；Card 全宽；`PageLayout` 自身成为滚动容器 |

规则：

- `PageLayout collapse` 默认 `md`：低于 768px 自动单列，Cell 按 DOM 顺序堆叠。
- 跨列用 `PageCell span` 的 `base / lg / md / xs` 四档表达；每一档跨列总和不得超过
  列数，否则自动换行会破坏阅读顺序。
- 窄屏不横向溢出：表格用 `scroll={{ x }}` 或列裁剪，Card 不设固定宽度；最小可读
  宽度低于目标仓库基线时，优先减列 / 折叠次要信息，不缩字号。
- 禁止隐藏主要操作或把操作塞进悬浮按钮；可隐藏的只有非关键装饰与重复信息。
- 响应式只改变布局，不改变权限、查询参数与业务行为。
- **截图基线**：xl / lg / md / sm 四档的截图回归基线由
  [visual-review](visual-review.md#响应式基线结构断言) 的响应式基线协议承载；
  `docs/visual-baselines/r1/` 固化 `/` 与 `/projects` 的 8 张采集图，逐图带
  `breakpoint` / `viewport`，门禁按工具退出码与结构断言判定。

## 例外与白名单

- **全屏结果页**：403 / 404 / 登录引导 / 打印页可以用 `PageShell + Result` 直接
  承载，不强制 Card 包裹；但这些页面不得承载业务数据、表格或表单。新增此类页面
  必须在页面注释写明例外类别。
- **路由弹层 / Drawer**：Modal、Drawer 是页面级交互终层，内部表单 / 详情不套
  PageLayout；它们由触发页面的 Cell / Card 操作打开，不单独成为页面。
- **公开页面**：按 public-pages 分节，不套本篇配方。
- **目标仓库已有等价布局真源**：按其组件名与 token 适配（例如 `Row/Col`、
  `NGrid/NGi`），但必须保持一区域一 Cell、一 Cell 一 Card、Card content 组件化；
  不得因为组件名不同就退回裸 div 拼装。

## 审查钩子

```bash
# 1) 页面是否使用 Layout → Cell → Card（业务页面应全部命中）
grep -rn -e "<PageLayout" -e "<PageCell" -e "<PageCard" <目标页面目录>

# 2) 页面是否绕过 Card 直接用 antd Card / 裸栅格
grep -rn -e "import {.*Card.*} from 'antd'" -e "grid-cols-" -e "display: grid" <目标页面目录>

# 3) Card content 是否出现裸内容容器（候选，逐处人工判定）
grep -rn -e "content={<div" -e "content={<>" -e "<PageCard" <目标页面目录>
```

审查口径：钩子只做候选定位，最终以 §布局公理 的 L1–L6 逐条判定；例外页必须能
落到 §例外与白名单 的类别，否则按违规处理。

## 交叉引用

- 页面壳、四态、CRUD 模式、路由弹层 → [general-pages](general-pages.md)。
- 页面形态与设计产物（布局坐标必须写入设计产物）→
  [design-reasoning](design-reasoning.md#设计产物契约)。
- 间距、卡片内边距、断点与布局 token → [design-tokens](design-tokens.md#布局参数)。
- 截图审查的布局破损判定与八维走查 → [visual-review](visual-review.md)（条件加载）。
- 场景覆盖矩阵的布局自查行 → [scenario-coverage](scenario-coverage.md)。

## 验证边界声明

本篇定义布局结构与静态判定口径；行列轨道、Card 间距、响应式折叠的最终视觉效果
以目标仓库运行页面为准。涉及截图 / 像素结论时，唯一合法证据面是
[visual-review](visual-review.md) 的截图证据协议产物，不以文档存在代替视觉证据。
