# enterprise-frontend

约束驱动的企业级前端规范执行器：企业级中后台前端工作（新建/扩展/迁移/审查）默认执行 `SKILL.md` 的硬约束清单——禁令全局硬执行，token 与结构约定跟随目标仓库真源。

Read `SKILL.md` for the full contract: eight-layer workflow, the conditional-loading routing table over `references/`, and the B1–B7 ban list (single source of truth in `references/engineering.md`). This file is an entry pointer, not a second rule set.

地图/GIS 约束为条件加载章节：仅地图场景任务按路由表读取对应文档。

公开落地页/营销页/活动页/定价对比页为条件叠加页面类型：仅命中公开页面时读取
`references/public-pages.md`，中后台任务不读；四个核心场景判定不变。

每次改动另受两条全局硬约束：界面删减（`references/general-pages.md`）与三方体验账
（`references/engineering.md`，UX / DX / AX 三方都变好、现有功能零破坏）。
