# 地图交互与资产（map-interaction）

> 地图条件加载章节·下半：交互原则、地图信息组件模式、资产同源与引擎唯一入口。
> 仅当任务涉及地图/GIS/空间数据/图层时读本篇（SKILL.md 路由表）；图层选型/生命周期/
> 预算见 [map-layers](map-layers.md)（上半篇）。禁令本体在 [engineering](engineering.md)
> B5/B6/B7，本篇只引用不重定义。

## 用途与触发场景

地图交互开发（框选/绘制/标注/选择/高亮）、地图内告警与图例组件、地图 SDK 资产
接入与同步、引擎模块引用时读本篇。

## 交互原则

- **框选 = 宿主级附着器模式**：框选能力以附着器承载——激活态查询、完成回调
  （bounds 与 polygon 双形态）、取消/过小/投影错误独立回调、destroy 收尾；游标与
  交互锁配合。
- **绘制与在线标注 = 绘制宿主状态机**：绘制宿主（SketchHost 模式）承载工具态机
  （idle/polygon/rectangle/rotated_rectangle/select 五态）；旋转矩形（OBB）编辑走
  事件流——拖拽中 `commit=false` 预览、提交时 `commit=true`；绘制产物统一为
  WGS84 GeoJSON Polygon 结构。OBB 几何工具位于组件层、引擎单向引用（引擎不反向
  依赖组件）。
- **受控选择契约**：可见集/可选集分离的交互策略（policy 携带 visibleIds/selectableIds）
  + 选择事件（ids + replace/add/remove 操作语义）；无策略时退回自动单对象编辑。
- **高亮 = 样式真源语义令牌**：选中/高亮样式走样式真源的语义令牌（highlight 段），
  不改图层本体符号、不散落硬编码样式（B7 文档纪律的具体化）。
- **标注数据流 = 自动保存钩子 + 导入事务**：在线标注编辑走自动保存钩子模式；
  导入走事务模式（失败可回滚），不做半提交状态。

## 地图信息组件模式

- **底图告警 = 页内覆盖层 Alert**：地图加载失败信息以页内绝对定位 Alert 覆盖层
  承载（地图 Card 内），不弹全局 modal；内容 = 原因 + 下一步动作；管理入口按
  权限显隐；关闭走回调。
- **图例 = 分档色带 + 归一化 + 可访问性**：数值分档色带表（分档常量集中声明）+
  属性键轮询取值 + 归一化函数 + 可访问性（role/aria）+ `pointer-events:none`
  绝对定位不挡地图交互。业务色带数值属各仓库真源，不移植为本规范内容。

## 资产同源与引擎唯一入口

机制层条目（禁令本体 = [engineering](engineering.md) B5/B6，此处只引用不重定义）：

- **SDK 全局一次性配置**：assets/fonts 指向同源路径；portal 配置禁置空串（置空会
  使部分图层 load 走 loadFromPortal 分支而零瓦片）；在线 utility 显式切断；SDK
  版本常量仅作诊断标识，不用于拼接 CDN 地址。
- **同步脚本机制**：从依赖包目录整目录同步到静态目录，install/start/build 前置
  执行；同步目标目录不入版本库。
- **引擎唯一入口**：页面只从引擎门面模块 import，不直接 import SDK 内部模块；
  门面按域 re-export 全部公开 API。

## 交叉引用

- 图层选型、生命周期、渲染预算与降级 → [map-layers](map-layers.md)（上半篇）。
- 禁令（B5 第二引擎 / B6 资产同源 / B7 overlay 样式真源）→
  [engineering](engineering.md)（唯一真源）。
- 高度链与地图 Card 承载 → [general-pages](general-pages.md)。
- SKILL.md References 层路由表地图两行指向本篇与上半篇。

## 验证边界声明

交互状态机、事件流语义、组件模式为规范模式约定；交互手感、绘制流畅度、告警/
图例的视觉表现为运行时行为，不在本篇验证范围。本规范不以文档存在代替运行证据。
