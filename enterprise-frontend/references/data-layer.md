---
load_when: "请求、数据获取、缓存、登录态、SSE"
rule_ids: ["B1"]
depends_on: ["engineering.md","general-pages.md"]
size_budget: 120
---

# 请求与服务端状态（data-layer）

> 双通道请求、SSE、401 收敛、查询键真源模式、状态归属三分。SKILL.md 路由表
> 「请求、数据获取、缓存、登录态、SSE」场景读本篇。

## 用途与触发场景

页面需要取数、提交、轮询/推送、登录态处理时读本篇；页面四态承载的错误态与
本篇错误收敛互为表里（承载面见 [general-pages](general-pages.md)）；HTTP 通道
禁令（B1）的正面模式在本篇，禁令语义真源在 [engineering](engineering.md)。

## 双通道请求

- **两个入口，一条管线，页面不直连 axios**（B1）：框架 request 与统一 apiClient 并行可用，
  共用同一份运行时请求配置；页面/组件代码不 import axios。
- **运行时配置唯一生效处**：应用运行时入口（`src/app.tsx`）导出的 `request` 承载 `/api`
  前缀、认证拦截器与 401 errorHandler；构建期配置的 `request` 只声明 `dataField`，
  写在构建期配置里的拦截器与 errorHandler 不生效。
- **apiClient 模式**（统一客户端的固定形态）：框架 request 的薄封装，不另建请求实例、
  不用裸 `fetch`；默认 `skipErrorHandler`，业务错误由调用方四态承载，不在页面散落提示。
- **双认证通道**：同源 cookie（同源请求自动携带）+ `Authorization: Bearer <token>`。
  Bearer 只附同源请求，外域（地图服务、第三方 API）不带用户凭证；需要跨域带 cookie
  时显式开启凭证并要求后端 CSRF 防护（SameSite 或 CSRF token），不默认开启。
- **选型口径**：常规 CRUD 走框架 request；需要双通道认证或绕过默认错误处理的
  场景走 apiClient；两通道之外的「第三条通道」（页面裸 fetch/axios）一律违规。

## SSE（服务端推送）

- **统一走框架 `streamSSE()`**，不手写 EventSource、不用轮询模拟推送。
- 规范只讲使用模式（订阅、消息分流、断连归框架），不讲具体业务事件语义；
  事件契约属后端 API 设计，不在本篇。

## 401 统一收敛

- **401 恒处理**：即使该请求 `skipErrorHandler`，401 仍由统一入口处理——清 token +
  整页替换跳转（`location.replace`，登录弹层地址不留在历史里）到
  `<home>?login=1&redirect=<encodeURIComponent(pathname + search + hash)>`
  （首页本身省略 redirect）。已在首页登录弹层（首页且 `login=1`）时不再跳转，登录接口
  自身的 401 不自循环；其他页面带 `login=1` 照常跳转。
  理由：登录态过期必须清 token + 跳登录页，否则用户在长驻页面会持续看到业务提示
  却永远登不出去。
- **不建独立 /login 路由页**：登录入口收敛为首页 Modal（`login=1` 参数聚焦登录区，
  `redirect` 参数登录后回跳）。
- **回跳只放行同源**：`redirect` 经同源校验（`new URL(raw, origin).origin === origin`）
  才回跳，协议相对 `//host`、反斜杠 `/\host`、`javascript:`、外域与指回登录弹层的目标
  一律回退首页；
  token 键、登录地址拼装、同源判定集中在一个工具模块（如 `src/utils/authRedirect.ts`）。
- **子路径部署与 hash 路由**：目标仓库配置了 base 前缀或 hash history 时，登录地址与
  redirect 必须按其真源拼装，不沿用根路径写法。

## queryKeys 真源模式

服务端状态全走 React Query；查询键字典**全仓单一真源文件**，文件头即设计原则。

四条键模式：

1. **每后端资源一个 root key**（如 `models`、`rule-layers`）；invalidate 只打 root key
   （前缀匹配），保证所有变体同步失效。
2. **带参变体用 selector 形式共享 root 前缀**：`queryKeys.models()` 全量与
   `queryKeys.models({ forSelect: true })` 下拉简化共享 `models` 前缀，invalidate
   `['models']` 一并失效。
3. **单实体 = `[root, id]`**：`queryKeys.project(id)` → `['projects', id]`。
4. **跨页聚合键**：一个聚合资源（如系统设置）驱动多个页面时单键复用，invalidate
   一次全部刷新。

反例入规范：独立 query key 前缀不共享 root → invalidate 失联（见 SKILL.md
Anti-Patterns）。

按域 service 文件与 queryKeys 分层：服务定义按域拆文件（`src/services/*.ts`
目录形态），键字典单独成文件，不混写。

## 状态归属三分

| 状态类别 | 归属 |
| --- | --- |
| 应用初始态（currentUser / settings / 导航视图偏好） | 框架 initialState（启动时组装） |
| 服务端状态（业务数据缓存） | React Query（queryKeys 真源模式） |
| UI 持久化偏好（导航视图偏好等） | localStorage，**key 常量集中声明** |

规则：三类状态不串位——服务端数据不进 initialState（走 React Query 缓存）；
UI 偏好不进服务端状态；localStorage key 不散落字符串字面量（集中常量声明）。

## 交叉引用

- B1 禁令语义与检查级 → [engineering](engineering.md)（禁令表唯一真源）。
- 四态错误态承载 → [general-pages](general-pages.md)。
- 服务端数据 consumed by 列表/详情页模式 → [general-pages](general-pages.md) CRUD 节。
- SKILL.md References 层路由表指向本篇。

## 验证边界声明

通道选型、SSE 模式、401 收敛以静态约束检查与质量命令为验收面。运行时认证行为、
推送稳定性、缓存失效时序不在本篇验证范围；本规范不以文档存在代替运行证据。
