# enterprise-frontend

参考驱动的企业前端 agent skill:在 React / Ant Design 存量代码库上做扩展、迁移与评审。

**简体中文** | [English](./README.en.md)

## 目录

- [这是什么](#这是什么)
- [安装](#安装)
- [使用](#使用)
- [仓库地图](#仓库地图)
- [维护与评估](#维护与评估)
- [许可](#许可)

## 这是什么

AI 编程 agent 在存量企业前端里加一个页面,常见结果是:页面能跑,风格是别人的。agent 按通用最佳实践从零生成,自带一套请求封装、状态管理和样式写法;评审的人要逐行分辨哪些是仓库既有约定、哪些是新发明。

enterprise-frontend 把顺序倒过来:先在目标仓库里找一条走得通的同类用户旅程,照着它改。新页面从第一天起就继承仓库的路由、权限、请求与反馈写法,改动收敛在这条旅程内部。适用对象是后台系统、仪表盘、CRUD 页面、设置页、地图工作台这类 React / Ant Design(含 Pro Components)代码库;机制不挑栈,内置参考资料偏 Ant Design。

三种模式:

| 模式 | 场景 |
|---|---|
| **Adopt** | 初始化地基,或按参考仓库做整体迁移 |
| **Extend** | 新增或改造一条用户旅程,交付一条完整的纵切片 |
| **Align** | 评审或修复:先行为与集成,再交互、布局与可访问性,最后视觉细节 |

和相邻 skill 的分工:

| Skill | 管什么 |
|---|---|
| Anthropic `frontend-design` | 从零开始的设计与美学:布局、排版、视觉表达 |
| Ant Design 官方 `antd-skill` | 组件 API 与版本知识 |
| 本仓库 | 存量企业前端工程:在既有约定内扩展、迁移、评审 |

它不做的事,先说清:

- 不安装任何前端运行时依赖,不改目标仓库的技术选型;
- 不拿内置资料压目标仓库:仓库的约定、主题与已装版本始终优先,内置默认只兜底没有答案的问题;
- 结构校验(工具链)验证的是打包与安装契约,不是模型效果;行为评测方法见 [`evals/README.md`](./evals/README.md),当前场景集尚未作为执行的基准跑过。

想知道每条规则为什么长这样,读 [`docs/why-reference-driven.md`](./docs/why-reference-driven.md);agent 侧完整规则在 [`SKILL.md`](./SKILL.md)。

## 安装

要求 Bash 3+、Python 3.9+、常规 Unix 工具,和一个支持 skill 的编程 agent。本 skill 不安装任何前端依赖。

```bash
git clone https://github.com/MicTx/enterprise-frontend.git
cd enterprise-frontend
./install.sh
```

默认目标:Codex、Claude Code 加检测到的兼容工具,含 Pi(`~/.pi/agent/skills/enterprise-frontend`)。

```bash
./install.sh --codex-only    # 或 --claude-only
./install.sh --all           # 所有支持的目标
./install.sh --dry-run       # 只打印目标,不写盘
./install.sh --help          # 全部选项与环境变量覆盖
```

已存在的安装先备份到 gitignore 的 `.install-backups/` 目录,再替换;每个目标独立暂存与恢复,安装不是全目标事务。细节与开关见 `./install.sh --help`。Windows 原生 PowerShell 见 [`docs/windows.md`](./docs/windows.md)。

要分发可安装归档而不是整个仓库:

```bash
python3 scripts/build_release.py
```

产物落在 gitignore 的 `dist/`,附带校验和与发布说明;接收方解压后运行 `./install.sh`。发布流程见 [`RELEASE.md`](./RELEASE.md)。

验证目标已装好,然后重启 agent:

```bash
test -f ~/.claude/skills/enterprise-frontend/SKILL.md
# Codex 目标改用 ~/.codex/skills/enterprise-frontend/SKILL.md
```

## 使用

直接提前端需求即可;`$enterprise-frontend` 或 `/enterprise-frontend` 是可选的显式调用。

```text
参考客户管理页的完整流程,新增供应商管理。
从这个参考仓库迁移未完成的前端,保留我们的 API 和品牌。
修掉地图工作台在窄屏下的溢出,不要换它的页面骨架。
```

完整页面改编示例见 [`examples/adapt-existing-slice.md`](./examples/adapt-existing-slice.md)。遇到陌生或版本敏感的 Ant Design API,查 [`references/antd-facts.md`](./references/antd-facts.md);目标仓库的已装版本优先于内置离线镜像。

## 仓库地图

```text
README.md / README.en.md       双语仓库说明
SKILL.md / AGENTS.md           agent 运行规则 / 入口
agents/openai.yaml             host 元数据
examples/adapt-existing-slice.md
references/
  adaptation-playbook.md       复杂迁移决策
  verification.md              测试/浏览器/残留检查方法
  default-profile.md           未决产品选择的默认值
  antd-facts.md                版本感知的 API 查证
  antd/llms-index.md           离线索引
  antd/llms-full.txt           不可变版本化镜像
manifest.json                  runtime 发布边界与版本
install.sh                     多工具安装器
scripts/
  package_skill.py             确定性 runtime 打包
  build_release.py             版本化 dist 打包
  validate_project.py          结构/引用/打包/评测/索引校验
  index_antd.py                离线索引再生与检查
  test_tooling.py              打包/校验/安装回归
evals/                         场景定义与对比记录
docs/
  windows.md                   Windows 原生 / WSL 安装
  why-reference-driven.md      设计依据(中文)
CONTRIBUTING.md                维护与校验命令
RELEASE.md                     版本化产物与发布清单
CHANGELOG.md                   变更历史
LICENSE                        PolyForm Noncommercial 1.0.0
```

只有 `manifest.json` 列出的条目会安装;脚本、评测、文档和 Git 状态都留在 runtime 之外。

## 维护与评估

[`CONTRIBUTING.md`](./CONTRIBUTING.md) 管维护与校验命令。[`evals/README.md`](./evals/README.md) 讲行为评测方法,[`evals/evals.json`](./evals/evals.json) 持有场景。结构校验不是模型效果结果。

## 许可

代码按 [PolyForm Noncommercial 1.0.0](./LICENSE)(SPDX: `PolyForm-Noncommercial-1.0.0`)授权:非商业用途可自由使用、修改与分发;商业使用需另行取得书面授权。
