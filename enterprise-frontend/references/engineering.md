# 工程规约与质量门（engineering）

> 质量纪律、全局禁令表（B1–B7）、新页面接线流程与构建环境约束。本篇是禁令表的
> **唯一真源**：SKILL.md 只持 ID 与一句话语义；扫描规则表（`scripts/ban_rules.json`）
> 逐 ID 与本表同源核对。

## 用途与触发场景

SKILL.md 路由表「质量门、禁令、新页面接线、构建环境」场景读本篇。典型触发：
新增页面/组件前的接线确认、提交前质量门执行、依赖引入评审、构建或测试环境选择、
扫描工具结果异议裁决（以本表为准回改工具侧）。

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
- 版本无关：工具名与纪律入规范，版本号不入（由各仓库 lockfile 锁定）。

## 全局禁令表（B1–B7，唯一真源）

| ID | 禁令（通用表述） | 检查级 | 静态可查 |
| --- | --- | --- | --- |
| B1 | 页面/组件代码不直接 import axios；HTTP 走框架 request 或统一 apiClient | import | 可扫 |
| B2 | 不用 react-router-dom 做页面路由/导航（黑名单命名导出：BrowserRouter/HashRouter/Link/NavLink/useNavigate/useLocation/useSearchParams/useHistory）；MemoryRouter+Route+Routes 仅限组件内嵌渲染（如 route modal），允许 | import（命名导出黑名单） | 可扫 |
| B3 | 不用 import.meta.env；环境配置走框架 config/代理通道 | 表达式 | 可扫 |
| B4 | 不安装 ESLint/Prettier；质量工具唯一 Biome（依赖名黑名单：精确 `eslint` / `prettier`，前缀 `eslint-` / `prettier-` / `@eslint/`；仅限 package.json 直接声明，lockfile 传递依赖不在此列） | 依赖 | 可扫 |
| B5 | 不引入第二地图引擎（模块/依赖名黑名单：精确 `maplibre-gl` / `ol` / `cesium` / `leaflet` / `mapbox-gl`（`ol` 仅精确或 `ol/` 子路径，禁子串匹配）+ 前缀 `@maplibre/` / `@cesium/` / `@mapbox/`；清单以本表为真源，扩充须同步本行） | import + 依赖 | 可扫 |
| B6 | 地图 SDK 静态资产必须同源同步（构建/安装期同步脚本），禁运行时 CDN 引用 | 字符串（URL 字面量，受限） | 可扫（限源码字面量） |
| B7 | 业务页面不硬编码地图 overlay 颜色/透明度/线宽；overlay 样式走唯一真源（mapStyles 类文件） | — | **不扫**（结构推断不做；文档纪律项） |

契约条款：

- **ID 稳定**：B1–B7 不增删改义；新增禁令走评审后追加 B8+；语义修改视为破坏
  契约，须同步扫描规则表与地图章节一致性核对。
- **B2 语义收窄是设计结论**：react-router-dom 是元框架生态常见传递依赖，组件内
  嵌渲染（route modal）合法使用 MemoryRouter——全量 import 禁令会误伤合法模式，
  故禁令精确到页面路由 API 的命名导出黑名单。扫描规则表若与本表不一致，
  以本表为准回改。
- **扫描边界**：B1–B6 可扫（检查级见表）；B7 因需结构推断明示不扫，只作文档纪律
  人工复查项（最小化纪律：不做结构推断，避免误报）。

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

## 交叉引用

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
