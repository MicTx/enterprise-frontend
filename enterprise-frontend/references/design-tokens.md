# 设计 token 与主题（design-tokens）

> 基础 token 清单、组件级 token 与 why 注释惯例、布局参数、样式分层与真源跟随
> 规则。SKILL.md 路由表「颜色、间距、字号、主题、样式方案选择」场景读本篇。

## 用途与触发场景

选色、调间距、定控件尺寸、选样式方案、新建项目初始化主题时读本篇；禁用态视觉
与四态承载的交叉见 [general-pages](general-pages.md)；「token 跟随真源」裁决规则
的落地条目（裁决总表见 SKILL.md Decision Rules）。

## 基础 token 清单

真源：主题配置文件的 theme.token 段（`cssVar: true` 开启 CSS 变量模式）。
清单值即维度默认值（真源跟随规则见下）：

| 维度 | 默认值 |
| --- | --- |
| colorPrimary / colorInfo | `#1677ff` |
| colorSuccess | `#16a34a` |
| colorWarning | `#d97706` |
| colorError | `#dc2626` |
| colorBgLayout | `#f5f7fa` |
| colorBgContainer | `#ffffff` |
| colorText | `#0f172a` |
| colorTextSecondary | `#475569` |
| colorBorderSecondary | `#e2e8f0` |
| borderRadius / borderRadiusLG | `12` / `16` |
| controlHeight | `36` |
| fontSize / Heading3 / Heading4 | `14` / `24` / `20` |
| lineWidth | `1` |
| fontFamily | 系统字体栈（-apple-system 起） |

## 组件级 token 与 why 注释惯例

真源同上（theme.components 段）：

| 组件 | token |
| --- | --- |
| Layout | bodyBg `#f5f7fa`、headerBg `rgba(255,255,255,0.88)`、siderBg/triggerBg `#ffffff` |
| Card | borderRadiusLG `16`、paddingLG `20` |
| Table | headerBg `#f8fafc`、rowHoverBg `#f8fbff` |
| Form | itemMarginBottom `20` |
| Button | colorBgContainerDisabled `#f5f5f5` |

**why 注释惯例**：token 偏离默认值必须带原因注释，讲清「默认值在什么场景出什么
问题、为什么走主题 token 而不是自定义 CSS」。样板即 Button 禁用态：默认
`rgba(0,0,0,0.04)` 半透明底叠在地图浮层上等于透底，浮层按钮会整体「消失」；改为
不透明浅灰走主题 token。该案例同时是四态-禁用态的交叉条目
（[general-pages](general-pages.md) §四态一致承载）。

## 布局参数

真源：布局配置文件（ProLayout 类布局默认项）：

- layout `side`、siderWidth `240`、fixedHeader、fixSiderbar、contentWidth `Fluid`。
- 菜单形态：type `group` + defaultOpenAll + autoClose `false`（分组标题不可点击、
  子项平铺）。
- header 高 `56`（`heightLayoutHeader: 56`，与内容区高度链 `calc(100dvh - 56px)`
  对齐——高度链细则见 [general-pages](general-pages.md) §布局骨架）。
- 菜单态 token：文字 `#475569`、选中文字 `#1677ff`、选中底 `rgba(22,119,255,0.12)`、
  hover 底 `rgba(22,119,255,0.08)`。
- pageContainer padding 归零：间距归内容壳，不靠页容器默认内边距。
- 主题形态：navTheme `light`（浅色）；本规范不强制暗色模式，目标仓库
  自行决策。

## 样式四层优先级

优先级从高到低：**原子 CSS（Tailwind 类）→ CSS-in-JS（antd-style）→ CSS Modules →
全局 less**。选择规则：跟随组件/主题的动态样式用 antd-style；静态布局类用原子类；
全局样式只留字体、高度链、骨架类。

规则：新样式先问归属层（动态？静态？全局骨架？），不层层叠加兜底；同一元素
跨层覆盖要有注释讲明层级理由。

## 字体链纪律

全局样式声明 @font-face 外部字体、而 token fontFamily 为系统字体栈——两处声明
并存时实际生效字体存疑。规范表述：

- 字体族以 config token 为准（真源单点）。
- 引入自定义字体必须 @font-face 声明并核验实际加载生效，不以声明存在代替
  运行证据。

## 真源跟随规则

- **目标仓库已有主题真源**（config token / 主题文件）→ 读真源沿用其值；本篇清单
  只作**维度完备性对照**（缺哪个维度补哪个维度，值跟随真源）。
- **新建项目无真源** → 本篇清单值即默认值，直接落地。
- **禁止**：在目标仓库开第二套 token 体系（双主题并行）、散落硬编码色值/尺寸
  绕过 token——偏离必须改真源并带 why 注释（见组件级 token 节惯例）。

## 交叉引用

- 禁令与质量规则裁决 → SKILL.md Decision Rules（分层总表）。
- 禁用态视觉与四态承载 → [general-pages](general-pages.md)。
- 样式分层与质量门 → [engineering](engineering.md)。
- SKILL.md References 层路由表指向本篇。

## 验证边界声明

本篇 token 值为规范默认值（静态清单）；颜色对比度、渲染结果、字体实际
生效、布局视觉效果均以目标仓库运行页面证据为准。本规范不以文档存在代替视觉
证据；凡声称视觉效果的验收要求运行页面证据，不属本篇验证范围。
