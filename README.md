# enterprise-frontend

[中文](README.md) | [English](README.en.md)

**未发布快照**：本分支包含 v1.6.0 之后的改动；正式版请使用 [v1.6.0](https://github.com/MicTx/enterprise-frontend/releases/tag/v1.6.0)。

**约束驱动的企业级中后台前端规范** —— 把一套在生产环境验证过的技术栈、设计语言
与工程纪律，蒸馏为 AI 编码会话可直接执行的**硬约束清单**。

[![License: PolyForm Noncommercial](https://img.shields.io/badge/License-PolyForm_Noncommercial_1.0.0-lightgrey)](./LICENSE)

## 这是什么

`enterprise-frontend` 不是组件库，也不是脚手架。它是一个**面向 AI 编码会话的
前端工程规范（skill）**，由三部分组成：

1. **约束规范**——`SKILL.md` 八层主文 + 十二篇 `references/` 域文档：禁令、模式、
   接线纪律与自查钩子，全部写成「必须怎么做」，而不是「可以参考」。
2. **起始模板**——`template/` 非地图基座合规骨架（五真源 + 统一请求通道 +
   内容壳 + 质量门），新项目冷启动从复制随包模板开始，出厂即门禁全绿。
3. **工具链**——禁令扫描、视觉证据包校验、安装器与打包器；Python 工具仅依赖
   Python 3 标准库，安装器另需 bash ≥3.2 与 coreutils，接收方可以逐条复现验收。

它同时服务两类读者：**AI 会话**把它当作执行规范（装载即生效），**人类工程师**
把它当作一份企业前端工程约束手册。

## 六条设计原则

| 原则 | 含义 |
| --- | --- |
| **禁令硬执行** | B1–B7 禁令（不直连 axios、不绕框架路由、不装 ESLint/Prettier、不引第二地图引擎、资产同源……）在任何目标仓库、任何现状下都不让步 |
| **布局分区** | 业务页面内容区一律 Layout 行列分区 → 每区域一个 Cell → 每 Cell 一个 Card → Card content 用内容组件；裸 div 栅格、空 Cell、一 Cell 多卡、Card 套 Card 均为结构违规 |
| **真源跟随** | 设计 token、路由/导航/权限结构**跟随目标仓库的真源**——改真源，不开平行体系；新建项目复制随包模板即得默认真源 |
| **验收可复现** | 规范只讲模式不讲版本号、不引外部来源；验收 = 静态禁令扫描 + 质量命令（lint / tsc / test）+ 逐条自查钩子，命令输出即证据 |
| **界面做减法** | 新增或触碰的界面不留多余标语、说明文字与次要标签；删后读不懂说明布局有问题，直接重新设计，不补字（保留清单：四态文案、校验、单位、状态 Tag、可访问名称） |
| **三方体验账** | 每次改动同时让用户（UX）、开发者（DX）、AI Agent（AX）变好，现有功能零破坏；任一方变差或成本转嫁他方均不算完成，证据是命令输出 |

## 适用面与场景

适用于**通用企业中后台**前端；地图/GIS 是条件加载章节，非地图任务零负担。企业自有的
公开落地页/营销页/活动页/定价对比页作为**条件叠加页面类型**接入，不改变四个中后台
核心场景的判定，中后台任务不读公开页文档。
SKILL.md Workflow 按序判定四个核心场景，`references/scenario-coverage.md`
给出每个场景的必读锚点与自查钩子：

| 场景 | 侧重 |
| --- | --- |
| 地图工作台 | 图层选型与预算、框选/绘制/受控选择、告警与图例、资产同源 |
| 规范审查 | 禁令自扫、文档引用完整性、四态与接线复查 |
| 存量页面修改 | 最小完整变更、真源跟随、禁令回归、四态回归 |
| 非地图 CRUD | 列表/表单/详情、布局骨架、四态承载、接线与数据层 |

公开页面（落地页/营销页/活动页/定价对比页）是条件叠加工作面：策略、内容真实性、
交互态、动效、SEO 与上线清单见 `references/public-pages.md`，只在命中时读取。

截图像素级审查 / 视觉走查 / 视觉回归复验 / e2e 修改意见同为条件叠加工作面：
证据采集协议（截图矩阵 / 稳定协议 / 结构+坐标）、八维走查清单、发现准入与
finding 格式、修复复验闭环见 `references/visual-review.md`，只在命中时读取。

## 归档接收方：安装、使用与新建项目

本节适用于此公开快照和发布归档。

### 安装

宿主无关——不探测任何特定宿主目录，只安装到你指定的位置：

```bash
# 解包后在归档根目录执行（源 = 归档内 enterprise-frontend/ 目录）
./install.sh <目标目录>

./install.sh <目标目录> --dry-run   # 预览动作，不写盘
./install.sh <目标目录> --force     # 内容不同也强制替换
./install.sh --help                 # 完整用法与退出码
```

安装落点固定为 `<目标目录>/enterprise-frontend/`；重复安装相同内容输出
`already up to date`；替换旧安装默认保留备份。依赖：bash ≥3.2、
python3 ≥3.9、coreutils。

### 在宿主会话中使用

把 `<目标目录>/enterprise-frontend` 所在路径加入你的 AI 编码宿主的 skill 搜索面，
新开会话后自然语言描述任务即可触发（部分宿主支持显式 `$enterprise-frontend`
或 `/enterprise-frontend` 前缀）。会话将按 Workflow 判定场景 → 设计推理（新页面/新功能先产出形态·布局·
组件组成设计）→ 按路由表读取对应规范 → 执行约束 → 按自查钩子收尾。

### 验证安装

```bash
cd <目标目录>/enterprise-frontend
python3 scripts/ban_scan.py template/   # 禁令自扫 → RESULT: clean
```

### 从零新建项目

复制归档内的起始模板（五真源 + 统一请求通道 + 内容壳，已合规）：

```bash
cp -r enterprise-frontend/template/ my-admin
cd my-admin && npm install
```

详见 `template/README.md`。

## 规范体系

入口是 `SKILL.md`（八层骨架：Identity/Mission → Success Definition → Workflow →
Decision Rules → Boundaries → Anti-Patterns → Review Loop → References），
其中条件加载路由表规定了「什么任务读哪篇」：

| 文档 | 域 | 何时读 |
| --- | --- | --- |
| `references/design-reasoning.md` | 页面设计推理：需求 → 页面形态/布局/卡片-内容组件组成 + 三张最小骨架模式卡片 | 新页面/新功能实现前先读 |
| `references/layout-system.md` | 页面布局系统：Layout 行列分区 → Cell → Card → 内容组件，含布局配方、高度链与响应式细则 | 任何页面布局设计与实现（默认读） |
| `references/general-pages.md` | 页面规范：布局骨架、CRUD 模式、四态承载、界面删减、路由弹层、菜单接线 | 任何页面/组件/布局工作（默认先读） |
| `references/public-pages.md` | 公开页面：单一转化目标、页面结构、文案与内容真实性、视觉方向、交互态与动效、SEO 与上线清单 | 公开落地页/营销页/活动页/定价对比页（仅此时读） |
| `references/data-layer.md` | 请求与服务端状态：双通道、SSE、401 收敛、queryKeys 真源 | 涉及取数、缓存、登录态 |
| `references/design-tokens.md` | 设计 token 与主题：清单、why 注释、布局参数、真源跟随 | 涉及颜色/间距/主题/样式选型 |
| `references/engineering.md` | 工程规约：质量纪律、**全局禁令表 B1–B7（唯一真源）**、四步接线、三方体验账、构建环境 | 质量门、禁令、接线、构建环境、改动收尾记账 |
| `references/map-layers.md` | 地图图层：选型矩阵、生命周期、渲染预算与显式降级 | 任务涉及地图/空间数据（条件加载） |
| `references/map-interaction.md` | 地图交互：框选/绘制/选择/高亮、告警与图例、资产同源、引擎唯一入口 | 地图交互与资产（条件加载） |
| `references/visual-review.md` | 截图视觉审查与 e2e 修改意见：证据采集协议、八维走查、发现准入与像素 diff 语义、finding 格式、修复复验闭环（含分层验收、复验裁判一致性、flaky 重试协议） | 截图像素级审查/视觉回归/e2e 修改意见（条件加载） |
| `references/testing-guide.md` | 测试设计指南：五形态用例设计 + mock 模式 + 场景化清单 | 编写/评审测试 |
| `references/scenario-coverage.md` | 四个核心场景 + 公开页面条件叠加矩阵：场景 → 必读锚点 → 自查钩子 | 场景判定后取行 |

禁令表 B1–B7 的完整定义（检查级、黑名单字面量）唯一真源在
`references/engineering.md`；`SKILL.md` 只持 ID 与一句话语义；扫描规则表
`scripts/ban_rules.json` 与其同源。

## 许可与分发

本快照以 [PolyForm Noncommercial 1.0.0](LICENSE) 授权。**商业使用需另行书面授权**。第三方许可见 [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES.md)，变更见 [CHANGELOG](CHANGELOG.md)。
