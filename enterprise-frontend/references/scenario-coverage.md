# 场景覆盖矩阵（scenario-coverage）

> 四场景 → 规范条目映射矩阵（顺序：非地图 CRUD → 地图工作台 → 存量页面修改 →
> 规范审查）。SKILL.md Workflow 判定场景后读本篇，按行取必读锚点与自查钩子。
> 矩阵只做映射不复制条文——约束条文的单一真源在各规范文档与
> [engineering](engineering.md) 禁令表。

## 用途与读法

- 每行 = 一个工作面：**必读锚点**（`references/<doc>.md#<标题原文>`，锚点口径 =
  标题原文锚）→ **关键约束条目**（指向各文档节内容）→ **禁令子集** →
  **自查钩子**（可执行命令）。
- **B1–B7 恒全局适用**（禁令全局硬执行，与 [engineering](engineering.md) 全局
  执行面一致）：任何场景、任何仓库现状都不豁免；本矩阵「禁令子集」列**仅示该
  场景高发/侧重项**，不是适用性边界——未列入的禁令同样适用。
- 工作面之间不互斥：一个任务可同时命中多个工作面，逐行取用；地图场景额外叠加
  两篇地图文档（SKILL.md 路由表条件加载）。
- 自查钩子中的 `<目标>` 代指本轮改动面路径（目录或文件）；规范审查场景的钩子
  即本仓工具（ban_scan）的执行命令。

### 非地图 CRUD

| 工作面 | 必读锚点 | 关键约束条目 | 禁令子集（高发/侧重） | 自查钩子 |
| --- | --- | --- | --- | --- |
| 新页面接线 | [engineering](references/engineering.md#新页面四步接线流程) | 四步接线与验收物；接线质量钩子 | B2 | `python3 scripts/ban_scan.py <目标>` |
| 新页面设计推理 | [design-reasoning](references/design-reasoning.md#页面形态判定矩阵) | 先产出形态·布局·组件组成设计产物，实现后逐项对照 | — | 设计产物 ↔ 实现对照复查 |
| 布局与内容壳 | [general-pages](references/general-pages.md#布局骨架) | 页头槽位废黜；内容壳锁视口；高度链；页滚例外显式声明 | — | `grep -n "pageHeaderRender={false}" <目标>` |
| 列表/表单/详情 | [general-pages](references/general-pages.md#CRUD-模式) | ProTable 列表（卡内滚）；Modal+Form 编辑；Descriptions 详情；Empty/Alert | — | 对照列表页 / 编辑弹层 / 详情抽屉既有形态 |
| 请求与缓存 | [data-layer](references/data-layer.md#双通道请求) | 通道二选一；apiClient 双认证；不直连 axios | B1 | `python3 scripts/ban_scan.py <目标>` |
| 服务端状态 | [data-layer](references/data-layer.md#queryKeys-真源模式) | 单一真源键字典；四条键模式；invalidate 打 root | — | `grep -n "queryKeys\\." <目标>` |
| 登录态与推送 | [data-layer](references/data-layer.md#401-统一收敛) | 401 恒处理；不建独立登录路由页；SSE 走框架 | — | `grep -n "login=1" <目标>` |
| 主题与样式 | [design-tokens](references/design-tokens.md#真源跟随规则) | 真源跟随；禁双 token 体系；why 注释惯例 | — | `grep -nE "#[0-9a-fA-F]{6}" <目标>`（硬编码色值抽查） |
| 四态承载 | [general-pages](references/general-pages.md#四态一致承载) | 每数据区块加载/空/错误/禁用齐备 | — | `grep -nE "Skeleton|Empty|ErrorBoundary|disabled" <目标>` |
| 测试编写 | [testing-guide](references/testing-guide.md#测试形态与用例设计) | 五形态用例设计 + mock 模式 | — | `npm run test:ci`（目标仓质量门） |

### 地图工作台

| 工作面 | 必读锚点 | 关键约束条目 | 禁令子集（高发/侧重） | 自查钩子 |
| --- | --- | --- | --- | --- |
| 新页面设计推理 | [design-reasoning](references/design-reasoning.md#页面形态判定矩阵) | 形态判定走地图工作台行；先设计后实现 | B5/B6/B7 高发场景先设计 | 设计产物 ↔ 实现对照复查 |
| 图层选型 | [map-layers](references/map-layers.md#选型矩阵) | 五类触发场景对应路径；禁原生服务降级拼装 | B5 | `python3 scripts/ban_scan.py <目标>` |
| 生命周期 | [map-layers](references/map-layers.md#图层生命周期与清理) | 宿主统一管理；destroy 链完整；WGS84 坐标边界 | B7 | `grep -nE "map\\.add|map\\.remove" <目标>`（应零命中） |
| 渲染预算 | [map-layers](references/map-layers.md#渲染预算与显式降级) | 三值预算（5000/300/200）；超预算显式降级；完成项移出地图 | — | `grep -nE "MAX_(TILES|GRAPHICS|LABELS)" <目标>`（预算常量抽查） |
| 框选/绘制/选择 | [map-interaction](references/map-interaction.md#交互原则) | 宿主附着器；五态状态机；受控选择契约；高亮走语义令牌 | B7 | `grep -nE "MAP_STYLES" <目标>`（overlay 样式真源抽查） |
| 告警与图例 | [map-interaction](references/map-interaction.md#地图信息组件模式) | 页内覆盖层 Alert；分档色带 + 可访问性；pointer-events:none | — | 对照 basemap 告警 / 置信度图例组件既有形态 |
| 资产与入口 | [map-interaction](references/map-interaction.md#资产同源与引擎唯一入口) | assets 同源；同步脚本前置；只从门面 import | B5/B6 | `python3 scripts/ban_scan.py <目标>` |

### 存量页面修改

| 工作面 | 必读锚点 | 关键约束条目 | 禁令子集（高发/侧重） | 自查钩子 |
| --- | --- | --- | --- | --- |
| 场景判定与最小变更 | [general-pages](references/general-pages.md#用途与触发场景) | 存量修改最小完整变更；禁令面内顺手修正不扩战线 | B1–B7 全量 | `python3 scripts/ban_scan.py <目标>` |
| 真源跟随 | [design-tokens](references/design-tokens.md#真源跟随规则) | 读目标仓库真源沿用；不开平行体系；偏离改真源带 why | — | `git diff <目标>`（无平行主题/散落硬编码） |
| 菜单与深链 | [general-pages](references/general-pages.md#菜单与路由接线) | 隐藏菜单 ≠ 删除深链；双真源分离同步 | — | 对照 `config/routes.ts` ↔ `src/nav/navViews.ts` diff |
| 四态回归 | [general-pages](references/general-pages.md#四态一致承载) | 触碰面逐数据区块核对四态 | — | `grep -nE "Skeleton|Empty|ErrorBoundary|disabled" <目标>` |
| 禁令回归 | [engineering](references/engineering.md#全局禁令表b1b7唯一真源) | 全局硬执行，不因现状让步 | B1–B7 全量 | `python3 scripts/ban_scan.py <目标>` |

### 规范审查

| 工作面 | 必读锚点 | 关键约束条目 | 禁令子集（高发/侧重） | 自查钩子 |
| --- | --- | --- | --- | --- |
| 禁令审查 | [engineering](references/engineering.md#全局禁令表b1b7唯一真源) | B1–B6 机器扫；B7 结构推断不扫、人工复查 | 全量 | `python3 scripts/ban_scan.py <目标>` |
| 文档引用完整性 | [engineering](references/engineering.md#交叉引用) | 各篇互链与章节锚点逐条存在 | — | 抽取文档互链路径逐条 `test -e` |
| 四态与接线复查 | [general-pages](references/general-pages.md#四态一致承载) | 逐区块四态；五真源 diff 无平行体系 | — | 四态 grep + 真源 diff（同上两行钩子） |
| 测试形态审查 | [testing-guide](references/testing-guide.md#反模式) | 同名同目录、有断言、四态覆盖、mock 未覆盖被测对象 | — | 对照反模式清单逐项复查 |

## 覆盖缺口登记

构建本矩阵过程中的缺口逐条登记；处置类别 ∈ `resolved_current`（已回写至某文档
某节）/ `accepted_risk` / `non_actionable`（含理由）。**终态零 open 项。**

| 场景 | 工作面 | 缺口描述 | 处置类别 | 落点 |
| --- | --- | --- | --- | --- |
| 存量页面修改 | 最小变更原则 | 「最小完整变更/顺手修正不扩战线」的裁决语义归属 SKILL.md Decision Rules 分层表，references 不设对应节 | non_actionable | SKILL.md#decision-rules（映射归属 SKILL.md，非规范缺口） |
| 规范审查 | 工具使用说明 | ban_scan.py 的使用细节不设 references 专节 | non_actionable | SKILL.md#review-loop（工具落点已声明）；命令在本矩阵自查钩子列可执行，`--help` 即用法 |
| 非地图 CRUD / 地图工作台 | 全工作面锚点 | 各文档章节已覆盖全部行；未发现缺失约束 | resolved_current | 本矩阵四场景节（锚点解析通过，见验收证据） |

登记结论：**零 open 项**。
