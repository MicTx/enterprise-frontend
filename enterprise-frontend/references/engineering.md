---
load_when: "质量门、禁令、新页面接线、构建环境；每次改动收尾的三方体验账"
rule_ids: ["B1","B2","B3","B4","B5","B6","B7"]
depends_on: ["general-pages.md","data-layer.md","design-tokens.md","map-layers.md","map-interaction.md"]
size_budget: 180
---

# 工程规约与质量门（engineering）

> 质量纪律、全局禁令表（B1–B7）、新页面接线流程与构建环境约束。本篇是禁令表的
> **唯一真源**：SKILL.md 只持 ID 与一句话语义；扫描规则表（`scripts/ban_rules.json`）
> 逐 ID 与本表同源核对。

## 用途与触发场景

SKILL.md 路由表「质量门、禁令、新页面接线、构建环境」场景读本篇。典型触发：
新增页面/组件前的接线确认、提交前质量门执行、依赖引入评审、构建或测试环境选择、
扫描工具结果异议裁决（以本表为准回改工具侧）、每次改动收尾的三方体验账。

## 质量纪律

- **提交门槛 = Lint + 类型**：`biome check .`（lint 与格式双检）与 `tsc --noEmit` 双过；
  聚合脚本 `lint` 即两者串联，先 Biome 后类型；`template/` 起始模板同款门禁，格式漂移在提交前拦截。
- **格式化统一 Biome**：`biome check --write` 是唯一格式化入口；不引入第二格式化
  工具（B4 依赖侧禁令对应纪律面）。
- **测试纪律**：Jest 串行受限内存模式（`test:ci`：`--expose-gc` +
  `--max-old-space-size=1536` + `--runInBand`）；测试全局初始化集中在 setup 文件，
  模块 mock 写在测试文件内。
- **测试文件形态惯例**：`*.test.ts(x)` 与被测源文件同目录同名；断言可读源码的
  契约（如样式契约测试直接读样式源断言）。
- **扫描器验收以退出码为准**：禁令自扫与 spec 包的 verify 命令直接依赖进程
  退出码（0/1/2）；禁止经 `| grep <子串>` 判定结果——违规输出里包含该子串时
  管道会吞掉非零退出码造成假绿。
- **质量门可编排执行（dev-only）**：上述各门可经一键门禁 `scripts/gate.sh`（本地；
  dev-only——开发仓库编排面，不随发布包）或 CI 工作流（`.gitea/workflows/ci.yml`，
  dev-only）串联执行，两者同一命令组；编排不改变验收口径——仍以各命令进程
  退出码逐条判定。
- 版本无关：工具名与纪律入规范，版本号不入（由各仓库 lockfile 锁定）。

## 全局禁令表（B1–B7，唯一真源）

| ID | 禁令（通用表述） | 检查级 | 静态可查 |
| --- | --- | --- | --- |
| B1 | 页面/组件代码不直接 import axios；HTTP 走框架 request 或统一 apiClient | import | 可扫 |
| B2 | 不用 react-router 族（`react-router-dom` / `react-router` 及其子路径）做页面路由/导航（白名单：只放行 `MemoryRouter` / `Route` / `Routes` 与 type-only 导入，`Route` / `Routes` 须与 `MemoryRouter` 同文件导入，仅限组件内嵌渲染如 route modal；白名单外的命名、default、namespace 导入、re-export 与动态 `import()` 一律违规，按导入名判定） | import（命名导入白名单） | 可扫 |
| B3 | 不用 import.meta.env；环境配置走框架 config/代理通道 | 表达式 | 可扫 |
| B4 | 不安装 ESLint/Prettier；质量工具唯一 Biome（依赖名黑名单：精确 `eslint` / `prettier`，前缀 `eslint-` / `prettier-` / `@eslint/`；仅限 package.json 直接声明的 dependencies / devDependencies / optionalDependencies，lockfile 传递依赖与 peerDependencies 不在此列） | 依赖 | 可扫 |
| B5 | 不引入第二地图引擎（模块/依赖名黑名单：精确 `maplibre-gl` / `ol` / `cesium` / `leaflet` / `mapbox-gl` + 包装库 `react-leaflet` / `react-map-gl` / `@vis.gl/react-maplibre`（`ol` 仅精确或 `ol/` 子路径，禁子串匹配）+ 前缀 `@maplibre/` / `@cesium/` / `@mapbox/` / `@react-leaflet/`；样式面 `@import '~…'` 同查；清单以本表 B5 行为真源，先改本行再同步 `scripts/ban_rules.json` 与 `scripts/rule_registry.json`（二者为派生副本）） | import + 依赖 | 可扫 |
| B6 | 地图 SDK 静态资产必须同源同步（构建/安装期同步脚本），禁运行时 CDN 引用 | 字符串（URL 字面量，受限；含 html/ejs 模板） | 可扫（限源码与模板字面量） |
| B7 | 业务页面不硬编码地图 overlay 颜色/透明度/线宽；overlay 样式走唯一真源（mapStyles 类文件） | — | **不扫**（结构推断不做；文档纪律项） |

契约条款：

- **ID 稳定**：B1–B7 不增删改义；新增禁令走评审后追加 B8+；语义修改视为破坏
  契约，须同步扫描规则表与地图章节一致性核对。
- **B2 用白名单是设计结论**：react-router 族是元框架生态常见传递依赖，组件内嵌渲染
  （route modal）合法使用 MemoryRouter——全量 import 禁令会误伤合法模式；命名导出
  黑名单又挡不住 `Navigate` / `createBrowserRouter` / `useParams` 等同类 API，故只放行
  内嵌渲染所需的三个组件；`Route` / `Routes` 须与 `MemoryRouter` 同文件导入，单独使用即在
  框架路由之外做 URL 驱动的子路由。扫描规则表若与本表不一致，以本表为准回改。
- **扫描边界**：B1–B6 可扫（检查级见表）；B7 因需结构推断明示不扫，只作文档纪律
  人工复查项（最小化纪律：不做结构推断，避免误报）。
- **severity 与豁免台账**：规则可标 severity（error/warn，warn 级违规不计退出
  码）；存量仓库经 `ban_scan --waivers <file>` 登记
  `{rule, path_pattern, owner, reason, expires}` 豁免——命中降为 warn 输出并附
  owner，过期即失效并在 stderr 提示复核。豁免是带 owner 与期限的受审对象，
  禁止无期限豁免与注释性放水；模板见 `scripts/waivers.example.json`。工具必须在
  输出中给出「未关闭例外」摘要（规则 / 路径 / owner / expires）；完成判定只表示
  「无未豁免 error」，不得表述为「禁令零违反」。
- **正则不覆盖的人工复查项**：`require()` 解构导入、`import.meta` 别名取值、页面裸
  `fetch`（data-layer 的「第三条通道」）、MemoryRouter 是否只用于组件内嵌渲染、经 CDN URL
  加载的第二地图引擎。
  ban_scan clean 只证明机器项无违规，人工项按 Review Loop 逐条复查。
- **退出码**：0 干净 / 1 有违规 / 2 用法或 IO 错误；扫描面零文件、任一文件读取失败或
  package.json 解析失败一律退出 2（路径写错不得假绿）。

## 新页面四步接线流程

新页面/模块按序接线，每步有明确验收物；步骤细节与页面骨架规范互链
[general-pages](general-pages.md)（布局与四态承载）与 [data-layer](data-layer.md)
（请求层接线）：

1. **建组件**：`src/pages/` 下建页面组件文件。验收物：组件文件存在且可渲染。
2. **路由真源加路由**：在路由配置真源追加路由项（path/component/access）。
   验收物：路由项入库。
3. **导航真源同步菜单**：导航视图真源同步菜单项（导航只控可见性，不承载路由定义；
   隐藏菜单不等于删除深链，授权在后端）。验收物：菜单项与分组归属正确。
4. **补权限与测试**：权限键入权限真源；同名测试文件落地（`*.test.ts(x)` 与源文件
   同目录同名）。验收物：access 键 + 测试文件。

质量钩子：四步完成后跑质量门（lint + tsc + test:ci）；构建后 `git status --short`
确认无生成物混入（见下节）。

## 构建与环境约束

- **共享内存容器内不对运行中前端容器 exec 类型检查/测试/构建**（共享内存有限，
  会拖垮容器）；测试用受限内存串行模式（`test:ci`）或一次性容器。
- **清理框架生成目录后先跑框架 setup 再做类型检查**：框架生成类型是 `tsc` 的输入，
  直接跑会大面积误报。
- **构建/生成后 `git status --short` 检查**：不提交产物、生成物、缓存。
- **地图项目的依赖安装钩子同步地图资产**：postinstall 挂资产同步脚本（构建/安装期
  完成同源同步，B6 的执行机制）；非地图基座模板不含该钩子，地图场景引入时自建。

## 三方体验账

- **三方各看什么**：UX 看终端用户完成任务的步数、阅读量、出错率与反馈；DX 看开发者
  读码、改码、调试、跑质量门的成本，是否沿用真源、有没有多出平行体系；AX 看 AI Agent
  的两个面：读码改码（规则短且可判定、真源单点、可机检、报错可定位）与操作界面
  （可访问树精简、role + name 稳定、点击目标无歧义）。
- **记账格式**：交付说明里每方一行，写「变好了什么 + 证据」；确无触点写「无触点：理由」，
  不得编造改善。任一方变差即未完成，回改后重跑。
- **不转嫁**：以下做法看似改善一方，实为转嫁，不算数——把说明文字挪进 Tooltip 或
  折叠区（UX 多一次操作，AX 看不见）；为界面干净删掉可访问名称（读屏与 Agent 的
  定位失效）；为过测试删掉或放宽既有断言（DX 的安全网变薄）；为 Agent 好改另起
  平行 token 或第二套封装（真源漂移）。
- **零破坏证据**：
  1. 质量门全绿：`biome check .`、`tsc --noEmit`、`test:ci` 的命令输出，不是口头声明。
  2. 行为覆盖不减、断言不放宽。断言若只证明某句被删的装饰文案存在，随文案移除并在
     交付说明里点明；断言若借该文案定位行为（点击、校验、状态），改为 role + name
     或可访问名称。
  3. 公开契约不变：路由 path、queryKeys 键形、权限键、接口形状。需要变动就是破坏，
     单独评审，不夹带在体验改动里。
  4. 禁令自扫 clean，四态承载不回退（逐数据区块复查）。
- **证据形态**：UX 以静态证据为准——文案与组件的 diff、四态 grep；不声称视觉或交互
  已实测，运行页面证据另算。DX 以质量命令输出为准。AX 以「被删文案的断言可由
  role + name 复现」与「规则带可执行钩子」为准。
- **证据准入三条硬规则**：
  1. 功能检查通过不能覆盖体验失败或证据缺失——体验项失败或缺证即未交付；
  2. 未运行 / 待完成的自动审查不得计为完成，运行中的 agent 审查同样不算；
  3. 缺证据保留 needs-evidence 结论，不倒写历史、不把「未录入」表述为「无问题」。

交付说明按下列四行填写（界面类改动同时附 [general-pages](general-pages.md) 的删减结论）：

```text
UX：<变好了什么 + 证据 | 无触点：理由>
DX：<变好了什么 + 证据 | 无触点：理由>
AX：<变好了什么 + 证据 | 无触点：理由>
零破坏：lint + tsc + test:ci 输出；公开契约（路由 path / queryKeys / 权限键 / 接口形状）未变
```

## 交叉引用

- 规则追溯面（id → 文档锚点 → 检查器 → 夹具 → 测试）真源为
  `scripts/rule_registry.json`，覆盖校验 `python3 <skill-root>/scripts/rule_coverage.py`
  （`<skill-root>` 定义见 SKILL.md 命令约定，下同）；新增硬约束须同步注册条目并保持
  coverage 通过。references 各篇的加载条件、规则关联与体积预算见篇首 frontmatter，
  对账校验 `python3 <skill-root>/scripts/check_references_meta.py`。
- 界面删减（标语、说明文字、次要标签的删除试读与保留清单）→ [general-pages](general-pages.md)。
- 页面骨架、四态承载、Route modal 终层规则 → [general-pages](general-pages.md)
  （本篇接线流程第 1/2 步的页面侧细则）。
- 请求通道、apiClient、401 收敛、query keys 模式 → [data-layer](data-layer.md)
  （B1 的正面模式承载）。
- 设计 token 与主题真源 → [design-tokens](design-tokens.md)。
- 地图章节的图层/交互/资产约束 → map-layers / map-interaction（条件加载）；
  B5/B6/B7 的场景化展开在该章节，禁令语义以本表为准。
- SKILL.md References 层路由表指向本篇路径 `references/engineering.md`（已钉死）。

## 验证边界声明

「可扫」禁令以扫描工具静态结果为准；工具结果异议以本表为裁决真源。凡涉及视觉、
交互、运行时表现的断言不在本篇验证范围内，不以文档存在代替运行证据。
