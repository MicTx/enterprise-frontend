---
name: enterprise-frontend
description: >-
  企业级中后台前端的设计、审查与修改规范。需求只说业务页（如供应商／客户列表、筛选、新建编辑弹窗、详情抽屉、先出页面形态和布局方案）也适用，不要求出现「中后台」关键词。
  改管理端列表空态文案、修弹窗误关丢稿、走查交互动效或减动效、审截图（包括仅凭静图要求判定流畅）时，先调用本技能，哪怕只改一行。
  也用于管理端页面新建/迁移、CRUD、布局与界面删减、路由菜单与权限、请求缓存、主题 token、视觉回归
  与 e2e 修改意见；企业自有公开落地/营销/活动/定价页和地图/GIS 按需叠加。支持 design、
  review、revise；不用于无关文案、后端、CI/CD 或原生移动端。
  Use before designing, reviewing, or changing enterprise web UI, even a one-line admin empty-state edit,
  preventing draft loss on dialog close, auditing motion/reduced motion, or judging animation from a screenshot.
  Covers admin CRUD, layout, navigation, access, data, theming, migrations, visual regression,
  and conditional public marketing pages/GIS. For Umi, React, Ant Design Pro and equivalent stacks.
---

# 企业级前端约束规范（enterprise-frontend）

## Identity / Mission

企业级中后台的新建、扩展、迁移与审查以本规范为硬约束：禁令硬执行，技术约定跟目标仓库真源。设计先问：**系统能可靠代做什么？** 能代做就直接做，及时反馈，保留用户控制；只有业务选择或不可逆后果需要授权时才打断。

模式栈：Umi Max 类框架、React / TypeScript strict、Ant Design / ProComponents；原子样式、主题与 CSS Modules 分层；框架路由与请求、React Query、Biome / tsc / Jest。仅 GIS 使用唯一入口封装的 ArcGIS。公开页面与 GIS 均为条件叠加。条文讲模式，不讲版本或来源；`<skill-root>` 是含 SKILL.md 的目录，工具的目标路径相对目标仓库。

## Success Definition

以下是验收条件，不是每个请求都要遍历的步骤。只设计核方案，只审查核发现；写入须走质量门，缺结果就明确标记未验证。

1. B1–B7 无未豁免 error；warn / 豁免分列规则、路径、owner、expires。`RESULT: clean` 不等于零违反。
2. 路由、导航、权限、query keys、样式 token 各有一个真源。
3. 每个数据区块承载加载、空、错误、禁用，不只做成功态。
4. **界面删减**：触碰的界面删掉多余标语、说明、标签；删除试读读不懂就重新设计布局，不补文字（`references/general-pages.md`）。
5. **三方体验账**：UX / DX / AX 各有改善证据或无触点理由；任一方变差即未完成，现有功能零破坏（`references/engineering.md`）。
6. Biome、`tsc --noEmit`、项目测试通过。
7. 源码只证明静态事实；运行行为、像素和动效各取对应证据，冻结截图不证明流畅。
8. 新页面／新功能按 `references/design-reasoning.md` 四步给出设计产物，实现逐项对照；偏离先说明并更新设计记录。
9. **布局分区契约**：内容区 `Layout` 声明 rows × cols / areas；每区一个 Cell、每 Cell 一个 Card，Card content 为具名组件。例外须在 `references/layout-system.md` 白名单。
10. **公开页面**另验单一转化目标、内容真实性、视觉／动效、交互态、SEO 和上线清单。
11. **视觉审查**按 `references/visual-review.md` 交截图矩阵、带位置的 finding、同参数复验及 `visual-review.json`（observation / runtime-confirmed / fix-reverified）。修复沿用 token；响应式 r<N> manifest 的 breakpoint、viewport 与 PNG 尺寸须一致；证据包校验见 Review Loop。

## Workflow

### 指令与意图

**单页小修、单模块审查、一页设计**：同一会话完成对应产物，不另开调查。修改只处理已授权且实际存在的目标；审查和设计只读。无需改动的接线不加入复查，不为一行规则新造许可、工具或项目参数。

若宿主已注入本正文（包括显式命令展开），这就是已加载；不再次调用同名技能、不另调通用技能替代此路由。以下 `references/` 只从这次注入的技能根读，读到权限拒绝也不切到别的安装。

**原请求定入口**：只有用户原文在技能名后直接输入完整子命令时，才是显式命令。
自然语言和显式命令共用交付与权限规则；自然触发按原请求判断，不把自动生成的 `ARGUMENTS` 当显式输入。真正的显式命令完整匹配首词（`reviewer` 不是 `review`），余下文本原样作为目标；没给目标才沿用当前文件或已确认范围。

| 指令 | 交付与权限边界 |
| --- | --- |
| `design` | 按 `references/design-reasoning.md` 给出设计产物和验证方案，只交设计，不改业务源码。 |
| `review` | 只读审查。按严重度给出位置、观察、规范依据、证据级别／缺口、建议及复验方式，不自动修。 |
| `revise` | 核对反馈仍成立，只在当前请求或已确认的授权范围内做最小完整改动，并复验。不自动提交或发布。 |

显式 `design` 和 `review` 锁定只读模式；后半句要求「顺手实现／直接改」也不得升级为写入。指出冲突，完成该指令允许的交付。
明确「不改」限制所有模式；`revise` 只处理当前授权的目标。
没有显式指令时，「先出方案／先设计」而未要求实现的，只交设计；「只审查／给问题清单」只读。
只有直接要求实施、修复或「审后直接修」时才改；要求新建页面或功能时先设计，再实施。
指令只决定动作与产物，不改变宿主权限、场景或全局约束。若必要操作被宿主拒绝，停止该操作并说明未完成项；不改用别的工具绕过、不把建议说成已改。

### 首批必读

先判主场景，按序命中即止：地图 / GIS → 规范审查 → 存量页面修改 → 默认新建非地图 CRUD。
再按工作量取规则：低风险可逆小修只读命中的条文，形态级变化先设计，跨状态与高风险工作叠加证据。
不问系统可判定的流程选项；只在缺少会改变结果的业务事实时询问。

先从本技能根按表中顺序读取对应段落。同组规则一次按序读齐；需要查代码时，可将已知目标文件或目标仓库的 `README.md` 排在该组最后。只问证据边界时不查项目；只做设计时以方案为产物，必要时逐个核对影响结论的仓库约定，不做实现。必读成功后才执行或下结论。按行号用 `offset=首行`、`limit=末行−首行+1`，只核对当前要解决的问题。
读到具名业务入口就沿路径做事，不额外枚举目录、补读本次不涉及的规则、或搜索其它做法。`depends_on`、矩阵和同一文档内的链接不触发递归读取；遇到确实会改变决定的事实再补读。复合任务合并去重，先守证据和写入边界。

| 工作面 | 首批必读（标题，首行–末行） | 读完直接做什么 |
| --- | --- | --- |
| 界面文案小修 | `references/general-pages.md`（界面删减，128–156） | 直接读指定文件，只改请求的文案，再读回核对；已有 i18n 时沿现有键核对双语语义，只读直接对应的语言文件。无 i18n 不另建，不搜全仓。 |
| 弹窗保稿与用户控制 | `references/general-pages.md`（操作反馈与用户控制，90–126） → `references/engineering.md`（三方体验账，106–141） | 读索引指向的表单，保留原有调用接口；未改直接关，改过时让「继续编辑」实际取得键盘焦点并保稿，明确放弃才清空。 |
| 全项目体验／动效 | `references/state-transitions.md`（状态转换判定程序，27–72） → `references/general-pages.md`（操作反馈与用户控制，90–126） → `references/design-tokens.md`（动效与交互状态，94–106） → `references/engineering.md`（三方体验账，106–141） | 从项目索引沿实际路径查证，按影响列发现；无浏览器证据时，不声称已实测。 |
| 仅凭静图断言流畅 | `references/state-transitions.md`（动效纪律，74–84） → `references/visual-review.md`（观察纪律，72–89） → `references/engineering.md`（三方体验账，106–141） | 引用具体条文拒绝无证据断言，说明需要的实际帧测量；直接回答，不搜仓库、不寻找未提供的附件。 |

未命中上表时：
- **只交页面形态和布局**（自然请求先出方案，或 `design` 与附带的实施要求冲突）：先定形态和坐标，不执行附带实施；依次读 `references/design-reasoning.md`（设计产物契约，255–276）→ `references/layout-system.md`（布局公理，26–49）→ `references/general-pages.md`（四态一致承载，61–72）→ `references/engineering.md`（三方体验账，106–141），然后直接交方案。
- **普通显式 `design`**（用户直接输入 `design`，没有追加实施要求）：先读 `references/general-pages.md`（四态一致承载，61–72）→ `references/design-reasoning.md`（设计产物契约，255–276）→ `references/layout-system.md`（布局公理，26–49）→ `references/engineering.md`（三方体验账，106–141）。两种入口交同一设计产物，不枚举模板、重读同一节或再次启动工作流。
- 普通规范审查先读 `references/engineering.md`（三方体验账，106–141）、`references/general-pages.md`（四态一致承载，61–72）、`references/scenario-coverage.md`（规范审查，47–57），再对照请求中的目标源码。
- 其余复合工作查 References 目录与场景矩阵的对应行；GIS、公开页面、截图证据、动效仅在命中时叠加。小修不省适用质量门、界面删减或工程记账；没运行的验证不得写成通过。

### 设计、执行与交付

- 新页面 / 新功能或显式 `design`：按 `references/design-reasoning.md` 的四步产出设计产物——
  页面形态、布局模式和布局坐标（按 `references/layout-system.md` 落到 rows / cols / areas / cells）、
  组件和四态、删减检验与真源接线。设计和实现逐项对照。
- 审查先标证据等级。只读模式给建议，不回改；修订执行全局禁令（B1–B7）、布局分区契约、
  界面删减和三方体验账。每条新增实现可追溯到规范条文。
- **证据足够就交付**：设计用上面的设计产物回答；审查从已读源码提取带位置的发现，不另抄规范清单。目标和证据都在当前会话时就地完成，不另开调查或调度流程。无法运行的检查单列为未验证，不让一个缺失的工具阻断已有结论。
- 按 Review Loop 自查后交付。静态／运行结果和未验证项分开写；证据是实际命令或产物，
  不是口头声明。

## Decision Rules

禁令、布局四层语义、四态、界面删减、三方体验账、真源同步和质量命令硬执行。不与禁令冲突时，目标仓库 AGENTS / README 与实际真源优先于规范默认值，再优先于通用直觉。布局组件名、行列、断点与样式参数服从目标真源；没有布局真源时用模板 `layoutTokens`。

新建项目复制随包 `template/`（token 真源 `template/src/theme/tokens.ts`），不另造平行体系；无法复制时才用 `references/design-tokens.md` 的维度清单。存量做最小完整变更，触碰到的存量禁令一并处理，不扩面。公开页面可采用不同视觉方向，仍用单一品牌／主题真源，不反向套用到中后台。视觉审查的阈值是缺省值，量测、八维走查和 finding 格式以视觉证据协议为准，修复数值从目标 token 取。

## Boundaries

- 只管**前端工程约束**：页面 / 组件 / 状态 / 样式 / 路由 / 质量。不做后端规范、
  不做 CI/CD 平台规范、不做移动端规范。
- 不替代目标仓库自身的 AGENTS / README 规则（优先级见 Decision Rules）。
- 不做生成页面的 with/without 对照评测、不做 skill 效能实测；常规任务验证 =
  静态约束检查 + 质量命令。**视觉审查任务另以截图证据与审查产物为验收面**
  （`references/visual-review.md` 协议），该证据面不扩展到其他任务类型。

## Anti-Patterns

1. query key 不共享 root 会漏刷新；页面直连 axios 会绕过统一错误处理（B1）。
2. 非白名单页面级滚动破坏高度链；裸 div 栅格、空 Cell、一 Cell 多卡或 Card 套 Card 让滚动与审查失去边界。
3. 路由弹层放行清单须随路由表更新；不增设独立 /login 页，401 回首页登录弹层并保留回跳参数。
4. 不建第二套主题；修改 token 真源并注明理由。
5. 不用标语或说明文字补救布局。删除试读不明白，重新设计布局。
6. 不把文字挪进 Tooltip、不删可访问名称、不放宽行为断言来降低另一方成本；三方任一变差即未完成。
7. 公开页面规则不套用到中后台；访客页无占位文案、死链或虚构证据，示例须标明，缺证据写待补。
8. 不能拿源码或静图推断流畅；截图 finding 缺坐标、量测、规范依据或真实 token，按 `references/visual-review.md` 补证。

## Review Loop

这是按工作面取用的复核清单，不是要求每项都调用工具。单页小修、指定模块审查、单页设计止于本次产物；只有涉及实际运行行为的判定才需要观察其运行。保持局部任务单会话，既不改门槛，也不把未完成的检查说成通过。

按目标核对下列适用项。只读模式：未通过项记为发现，给出证据及复验方式。以下修复要求仅适用于已授权写入，不给只读任务授权回改。
没有相应脚本（检查项目的 `package.json` 或等价入口），或宿主拒绝执行时，记录哪项没跑，不替换工具重试。用可用的 Read 核对产物后正常答复；未运行项不算通过，也不委托代理代跑。

1. **禁令自扫**：B1–B6 机器项跑 `python3 <skill-root>/scripts/ban_scan.py <目标>`，退出码 0 且 warn/豁免命中
   已按规则 / 路径 / owner / expires 单独报告才算通过（2 = 扫描面为空或读取失败，不算
   干净）；engineering.md「正则不覆盖的人工复查项」与 B7 逐条人工复查。
2. **实现复核**：改接线才核五个真源，改数据区块才核四态。新页面／功能按形态、布局、决策、四态、删减检验及接线逐项对照设计产物；偏离说明原因，只有获准写入时才回改。
3. **布局分区复查**：每区一 Cell 一 Card，结构、坐标和具名 content 符合声明；例外对照白名单。生成后核对产物与 `git status --short`。
4. **文档引用完整性**：变更文档的引用路径与章节锚点须存在。
5. **界面删减**：触碰的界面做删除试读，保留的文案落在保留清单。
6. **三方体验账**：按 UX / DX / AX / 零破坏四行说明，有证据才下结论。
7. **公开页面**另验单一主行动、内容真实性、交互态、SEO 和上线清单。
8. **视觉审查**逐图读回、核量测与 finding、按真源修复值、同参数复验。`python3 <skill-root>/scripts/visual_review_check.py` 校验证据包须返回 0。
9. **全项目体验 / 动效**先独立审任务路径、文案和交互；获准修改后，执行者亲走关键操作，未实施者复审。截图验终态，流畅度另测实际呈现帧；缺证、阻断未清或仅审查时，不合并发布。
10. 仅写入模式：未通过项回改后重跑。只读模式报告发现和待补证据。

## References

**条件加载路由表**（路径钉死；对应文档由后续规范篇目落地，任务按表读取）：

| 触发场景 | 读取文档 |
| --- | --- |
| 新页面 / 新功能：从需求推理页面形态、布局与卡片-内容组件组成（实现前必读） | `references/design-reasoning.md` |
| 任何页面布局设计与实现：Layout 行列分区、Cell 与 Card 承载、Card 内容组件、高度链与响应式细则（默认读） | `references/layout-system.md` |
| 任何页面 / 组件 / 布局工作（默认先读）；标语、说明文字、标签的界面删减 | `references/general-pages.md` |
| 公开落地页 / 营销页 / 活动页 / 定价对比页（仅此时读；中后台不读） | `references/public-pages.md` |
| 请求、数据获取、缓存、登录态、SSE | `references/data-layer.md` |
| 颜色、间距、字号、主题、样式方案选择 | `references/design-tokens.md` |
| 质量门、禁令、新页面接线、构建环境；每次改动收尾的三方体验账 | `references/engineering.md` |
| 测试编写与用例设计（四步接线第 4 步 / 回归锁定 / 测试评审） | `references/testing-guide.md` |
| 任务涉及地图 / GIS / 空间数据 / 图层（仅此时读） | `references/map-layers.md` |
| 地图交互、标注、高亮、资产同源约束（仅此时读） | `references/map-interaction.md` |
| 截图像素级审查、视觉走查、视觉回归复验、e2e 修改意见（仅此时读；纯代码任务不读） | `references/visual-review.md` |
| 状态转换 / 动效设计或审查：元素显隐、移动缩放、内容/图标/数值替换、按压悬停、加载完成出错的反馈决策（仅此时读；纯静态与纯数据任务不读） | `references/state-transitions.md` |
| 已判场景但未命中首批必读，或复合场景／收尾需核对覆盖缺口；按场景取必读锚点与自查钩子 | `references/scenario-coverage.md` |

**B1–B7 禁令 ID 契约**（ID 固定不增删改义；一句话语义如下，完整表——检查级、
黑名单字面量——唯一真源是 `references/engineering.md`，扫描规则表
`scripts/ban_rules.json` 与其同源）：

| ID | 一句话语义 |
| --- | --- |
| B1 | 页面 / 组件代码不直接 import axios；HTTP 走框架 request 或统一 apiClient |
| B2 | 不用 react-router 族做页面路由 / 导航；组件内嵌渲染场景（如路由弹层）只允许 MemoryRouter 及与其同文件导入的 Route / Routes |
| B3 | 不用 import.meta.env；环境配置走框架 config / 代理通道 |
| B4 | 不安装 ESLint / Prettier；质量工具唯一 Biome |
| B5 | 不引入第二地图引擎；地图能力唯一入口封装模块 |
| B6 | 地图 SDK 静态资产构建期同源同步，禁运行时 CDN 引用 |
| B7 | 不硬编码地图 overlay 颜色 / 透明度 / 线宽；overlay 样式走唯一真源（文档纪律项，不自动扫描） |
