# 地图图层与渲染预算（map-layers）

> 地图条件加载章节·上半：图层选型矩阵、图层生命周期与清理、渲染预算与显式降级。
> 仅当任务涉及地图/GIS/空间数据/图层时读本篇（SKILL.md 路由表）；禁令本体在
> [engineering](engineering.md) B5/B6/B7，本篇只引用不重定义。

## 用途与触发场景

地图页新建/扩展、图层接入、底图服务切换、大数据量上图方案、渲染性能与降级设计
时读本篇；交互（框选/绘制/标注/高亮）、告警与图例组件、资产同步与引擎入口见
[map-interaction](map-interaction.md)（下半篇）。

## 选型矩阵

5 类触发场景对应 5 种图层路径：

| 触发场景 | 图层类型 | 要点 |
| --- | --- | --- |
| ArcGIS Server 原生服务（缓存瓦片 / 动态 export） | 原生 TileLayer / ImageryTileLayer / MapImageLayer / ImageryLayer | 服务类型判定链决定缓存 vs 动态；`tile_url_template` 类字段不抢占原生路径；禁止把原生服务降级成手工 tileInfo 拼装 |
| 普通 XYZ/模板瓦片 | WebTileLayer | 仅非 ArcGIS 服务走此路径；空间参数/LOD 从服务元数据推导；copyright 署名走常量模式（常量集中声明，不硬编码散落） |
| 临时/编辑/框选/选中/高亮/在线标注/瓦片状态等小规模动态图形 | GraphicsLayer | 幂等取层（存在即复用）、overlay 按分组 id/前缀管理、隐藏态不进图层列表交互（listMode hide） |
| 远程 FeatureServer 要素 | FeatureLayer（on-demand） | url 必须是图层资源 URL（layer resource），禁直接 /query；出站请求由后端同源代理，前端不直连外部服务 |
| 持久化大规模业务要素 | 后端 metadata/style/MVT + VectorTileLayer | style URL 同源；点击详情走 API，选中态用少量 Graphics 高亮；投影 view 下 style 需带 view 坐标系参数（SDK 对 tileInfo SR 固定 3857 的整层不渲染判定） |

## 图层生命周期与清理

全部图层生命周期由引擎宿主（MapHost 模式）统一管理，页面不直接维护跨页面
Layer 清理和排序：

1. **页面经宿主 API 读写 overlay 分组**，不自行 map.add/remove。
2. **销毁链完整**：页面卸载/组件销毁必须调用宿主 destroy——标签画布销毁 →
   `view.destroy()` → `map.destroy()`。
3. **业务 operational 栅格与 basemap 分离**：upsert 按 id + URL 比对复用已有图层，
   避免重复创建抖动。
4. **坐标边界**：页面与引擎之间只传 WGS84 经纬度 GeoJSON，投影换算归引擎投影
   模块。

## 渲染预算与显式降级

预算三值表（数值为规范纪律值；落地形态按项目实现如实表述，不虚构常量）：

| 预算 | 数值 | 性质 | 降级/提示路径 |
| --- | --- | --- | --- |
| MVT/切片任务规模（单任务 tile 数） | ≤ 5000 | 纪律值；落地为代码常量（系统设置可覆盖，钳制 100–50000） | 超限拒绝/提示，不静默扩量 |
| 实时动态结果图形（Graphics） | ≤ 300 | 纪律值 | 超预算必须显式降级/提示；禁静默把完整数据转 Graphics |
| DOM/画布标签 | ≤ 200 | 纪律值；落地为画布绘制 + 分桶截断 | 截断 + 图例/提示，不静默 |

降级原则：

1. **超预算必须有明确降级或提示**（Alert/图例/计数提示）；静默全量转 Graphics
   视为违规。
2. **动态状态叠加只保留活动项**，完成项移出地图（完成情况以页面进度组件为真源）
   ——反例教训：完成项全累积会使 Graphic 数量随任务线性膨胀，卡顿甚至崩溃。
3. **标签刷新走原地 refresh 不重绑**，避免清桶闪烁。

## 交叉引用

- 禁令（第二引擎 B5、资产同源 B6、overlay 样式真源 B7）→
  [engineering](engineering.md)（唯一真源，本篇不重定义）。
- 地图交互、告警与图例组件、资产同步、引擎唯一入口 →
  [map-interaction](map-interaction.md)（下半篇）。
- 高度链与内容壳 → [general-pages](general-pages.md)。
- SKILL.md References 层路由表地图行指向本篇（仅地图场景读）。

## 验证边界声明

预算三值为规范纪律值，各项目代码侧落地程度可以不同（常量可配置 / 截断实现 /
纯纪律值），须如实表述不虚构常量。渲染性能与降级效果为静态约束面，运行核验
以目标仓库运行页面为准；本规范不以文档存在代替运行证据。
