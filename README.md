# enterprise-frontend

[中文](README.md) | [English](README.en.md)

**约束驱动的企业级中后台前端规范** —— 把一套在生产环境验证过的技术栈、设计语言
与工程纪律，蒸馏为 AI 编码会话可直接执行的**硬约束清单**。

[![License: PolyForm Noncommercial](https://img.shields.io/badge/License-PolyForm_Noncommercial_1.0.0-lightgrey)](./LICENSE)

## 这是什么

`enterprise-frontend` 不是组件库，也不是脚手架。它是一个**面向 AI 编码会话的
前端工程规范（skill）**，由三部分组成：

1. **约束规范**——`SKILL.md` 八层主文 + 九篇 `references/` 域文档：禁令、模式、
   接线纪律与自查钩子，全部写成「必须怎么做」，而不是「可以参考」。
2. **起始模板**——`template/` 非地图基座合规骨架（五真源 + 统一请求通道 +
   内容壳 + 质量门），新项目冷启动从复制模板开始，出厂即门禁全绿。
3. **工具链**——禁令扫描、安装器与打包器，全部仅依赖 Python 3 标准库，
   接收方可以逐条复现验收。

它同时服务两类读者：**AI 会话**把它当作执行规范（装载即生效），**人类工程师**
把它当作一份企业前端工程约束手册。

## 三条设计原则

| 原则 | 含义 |
| --- | --- |
| **禁令硬执行** | B1–B7 禁令（不直连 axios、不绕框架路由、不装 ESLint/Prettier、不引第二地图引擎、资产同源……）在任何目标仓库、任何现状下都不让步 |
| **真源跟随** | 设计 token、路由/导航/权限结构**跟随目标仓库的真源**——改真源，不开平行体系；新建项目无真源时才使用规范默认值 |
| **验收可复现** | 规范只讲模式不讲版本号、不引外部来源；验收 = 静态禁令扫描 + 质量命令（lint / tsc / test）+ 逐条自查钩子，命令输出即证据 |

## 适用面与场景

适用于**通用企业中后台**前端；地图/GIS 是条件加载章节，非地图任务零负担。
SKILL.md Workflow 按序判定四个场景，`references/scenario-coverage.md`
给出每个场景的必读锚点与自查钩子：

| 场景 | 侧重 |
| --- | --- |
| 非地图 CRUD | 列表/表单/详情、布局骨架、四态承载、接线与数据层 |
| 地图工作台 | 图层选型与预算、框选/绘制/受控选择、告警与图例、资产同源 |
| 存量页面修改 | 最小完整变更、真源跟随、禁令回归、四态回归 |
| 规范审查 | 禁令自扫、文档引用完整性、四态与接线复查 |

## 快速开始

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

**从零新建项目**：不装 skill，而是复制随包的 `template/` 起始模板（五真源 +
统一请求通道 + 内容壳，已合规）——`cp -r template/ my-admin` 后按模板 README
执行 `npm install`。详见 `template/README.md`。

### 在宿主会话中使用

把 `<目标目录>/enterprise-frontend` 所在路径加入你的 AI 编码宿主的 skill 搜索面，
新开会话后自然语言描述任务即可触发（部分宿主支持显式 `$enterprise-frontend`
或 `/enterprise-frontend` 前缀）。会话将按 Workflow 判定场景 → 设计推理（新页面/新功能先产出形态·布局·
组件组成设计）→ 按路由表读取对应规范 → 执行约束 → 按自查钩子收尾。

### 验证安装

```bash
cd <目标目录>/enterprise-frontend
python3 scripts/ban_scan.py references/   # 禁令自扫 → RESULT: clean
```

## 规范体系

入口是 `SKILL.md`（八层骨架：Identity/Mission → Success Definition → Workflow →
Decision Rules → Boundaries → Anti-Patterns → Review Loop → References），
其中条件加载路由表规定了「什么任务读哪篇」：

| 文档 | 域 | 何时读 |
| --- | --- | --- |
| `references/design-reasoning.md` | 页面设计推理：需求 → 页面形态/布局/卡片-内容组件组成 + 三张最小骨架模式卡片 | 新页面/新功能实现前先读 |
| `references/general-pages.md` | 页面规范：布局骨架、CRUD 模式、四态承载、路由弹层、菜单接线 | 任何页面/组件/布局工作（默认先读） |
| `references/data-layer.md` | 请求与服务端状态：双通道、SSE、401 收敛、queryKeys 真源 | 涉及取数、缓存、登录态 |
| `references/design-tokens.md` | 设计 token 与主题：清单、why 注释、布局参数、真源跟随 | 涉及颜色/间距/主题/样式选型 |
| `references/engineering.md` | 工程规约：质量纪律、**全局禁令表 B1–B7（唯一真源）**、四步接线、构建环境 | 质量门、禁令、接线、构建环境 |
| `references/map-layers.md` | 地图图层：选型矩阵、生命周期、渲染预算与显式降级 | 任务涉及地图/空间数据（条件加载） |
| `references/map-interaction.md` | 地图交互：框选/绘制/选择/高亮、告警与图例、资产同源、引擎唯一入口 | 地图交互与资产（条件加载） |
| `references/testing-guide.md` | 测试设计指南：五形态用例设计 + mock 模式 + 场景化清单 | 编写/评审测试 |
| `references/scenario-coverage.md` | 四场景映射矩阵：场景 → 必读锚点 → 自查钩子 | 场景判定后取行 |

禁令表 B1–B7 的完整定义（检查级、黑名单字面量）唯一真源在
`references/engineering.md`；`SKILL.md` 只持 ID 与一句话语义；扫描规则表
`scripts/ban_rules.json` 与其同源。

## 工具链

| 工具 | 职责 | 自测 |
| --- | --- | --- |
| `scripts/ban_scan.py` + `ban_rules.json` | 禁令静态检查（最小化：模式匹配，注释行豁免；规则表与规范禁令表同源，B7 显式不扫） | `python3 scripts/tests/test_ban_scan.py` |
| `install.sh` | 宿主无关安装器（暂存 → 幂等检测 → 备份 → 原子就位 → 校验 → 回滚） | `python3 scripts/tests/test_install_sh.py` |
| `scripts/build_package.py` | 按 manifest v2 组装发布树与 tar.gz/zip 归档 + 清单 | `python3 scripts/tests/test_build_package.py` |

禁令自扫：`python3 scripts/ban_scan.py <目标路径>`——对规范文档与模板自扫应恒为
clean；扫描面天然排除文档与测试夹具。

## 打包与分发

```bash
python3 scripts/build_package.py          # 产出 dist/（发布树 + tar.gz + zip + SHA256SUMS + 清单）
python3 scripts/build_package.py --expect-version 1.0.0
```

排除即缺省：`manifest.json` 的 `runtime` 是闭式清单，不列清单即不入包——内部规划
记录、证据档案与测试夹具（如 `scripts/tests/`）天然排除。产物布局与校验规则见
`scripts/build_package.py` 模块文档。

## 维护速查

| 动作 | 命令 |
| --- | --- |
| 禁令扫描 | `python3 scripts/ban_scan.py <路径>` |
| 打包 | `python3 scripts/build_package.py` |
| 全部测试 | 依次运行 `scripts/tests/` 下三套 unittest |

## 许可与分发

本仓库自著内容（`SKILL.md`、`references/`、`template/`、`scripts/`、安装器与
门面文档）以 [PolyForm Noncommercial 1.0.0](LICENSE) 授权（SPDX:
`PolyForm-Noncommercial-1.0.0`）——非商业使用自由，**商业使用需另行书面授权**。

分发渠道：私有 Gitea 真源与随行压缩包；任何公开快照须另行授权。

变更历史见 [CHANGELOG](CHANGELOG.md)。
