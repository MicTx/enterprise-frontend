# 视觉基线 v1 复采记录

- 复采日期：2026-11-18
- 基线：v1（source_pack: `2026-11-15_fix-theme-contrast-accessibility`，source_commit: `f22a1bbc07ae2e13aefd9fe3d9af810857331c09`）
- 复采命令：`env VISUAL_EVIDENCE_DIR=/tmp/ef-visual-only npm --prefix template run e2e -- e2e/visual.spec.ts`
- 复采范围：`visual.spec.ts` 8 格（4 路由 × light/zh-CN + realDark/en-US，1280×800）
- 比对命令：`python3 scripts/visual_baseline_check.py --baseline docs/visual-baselines/v1 --capture /tmp/ef-visual-only`
- 比对结果：8/8 match，差异 0/1024000，RESULT: pass（exit 0）
- Playwright 输出：8 passed；比对阈值 0.1%

## 逐图哈希与像素差异

| 文件 | 路由 | 主题 | 语言 | sha256 | 差异像素 | 占比 | 结果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 403-light-zh-CN.png | /403 | light | zh-CN | `34b9c1fbbf17ceb6b043c33bd66af7942018748f36830816e08af331c5b63368` | 0 | 0.0000% | match |
| 403-realDark-en-US.png | /403 | realDark | en-US | `c521f22de49d5dab43a43d15ddd29dc5fd0d691818dd1d6ac8fee90795d603d8` | 0 | 0.0000% | match |
| 404-light-zh-CN.png | /404 | light | zh-CN | `ca902e8a75171367ac7c9c2bdd60c3afdf55192db71cac7d0b20e85ff29d5e01` | 0 | 0.0000% | match |
| 404-realDark-en-US.png | /404 | realDark | en-US | `c6efc6537cad0652e3de8de5e6b168a652f011f3be00dd82984e4648ddd08e7f` | 0 | 0.0000% | match |
| home-light-zh-CN.png | /?login=1 | light | zh-CN | `b4991fbb6e389fdb7c7edf6015e957a22f46d580816b96f0da61c1f3316e71e2` | 0 | 0.0000% | match |
| home-realDark-en-US.png | /?login=1 | realDark | en-US | `819d7885241fe1822274f9cf115932fb70813a72972d6256c7d17547a9d3e21c` | 0 | 0.0000% | match |
| projects-light-zh-CN.png | /projects | light | zh-CN | `f817a1fa5e0b64f66adffeb79f4e4c86b1f1f02b06077d34f9b4fb6115166a07` | 0 | 0.0000% | match |
| projects-realDark-en-US.png | /projects | realDark | en-US | `8982fe2fa175a098286e7fcaa58cad27e491444f298f20b82a89561fa4b3d9e9` | 0 | 0.0000% | match |

## 环境

| 项 | 值 |
| --- | --- |
| viewport | 1280x800 |
| dpr | 1 |
| browser | chromium 159.0.8154.6（Playwright 1.65.1，headless） |
| os | Ubuntu 24.04.3 LTS / linux 6.14.0-37-generic x64 |
| font_env | fonts-noto-cjk 1:20230817+repack1-3 + fonts-liberation 1:2.1.5-3 + fonts-noto-color-emoji 2.047（fontconfig 597 faces） |
| engine | Blink（headless new） |
| page_scale | 100% |
| frame | main |
| capture_scope | fullPage（8 张均 1280x800，页面无滚动，fullPage 高度未触及 8000px 上限） |

## 已知边界：全量 e2e 的 smoke 数据污染（2026-11-19 起消除）

此前 `npm --prefix template run e2e` 会先跑 `smoke.spec.ts`；其中「新建项目提交后列表出现新行」向共享 dev server 的 mock 内存态新增一行，随后 `visual.spec.ts` 的 projects 两格会包含该动态行（2026-11-18 实测差异 21,693 / 22,648 像素，2.12% / 2.21%），因此当次记录只能使用 `-- e2e/visual.spec.ts` 隔离采集面。

该缺口已在 mock 隔离层修复：`template/mock/projects.ts` 以 `SEED_PROJECTS` 为唯一真源，新增 dev-only `POST /api/__mock/reset/projects` 恢复 seed 列表与 nextId；`smoke.spec.ts` 与 `visual.spec.ts` 均在 `test.beforeEach` 中调用该端点，每条用例都从 seed 态起步，smoke 新建行不再泄漏给后续用例与视觉采集。

- 全量复采日期：2026-11-19
- 复采命令：`env VISUAL_EVIDENCE_DIR=/tmp/ef-visual-iso npm --prefix template run e2e`
- 比对命令：`python3 scripts/visual_baseline_check.py --baseline docs/visual-baselines/v1 --capture /tmp/ef-visual-iso`
- Playwright 输出：14 passed（smoke 6 + visual 8，smoke 先执行，单 worker）
- 比对结果：8/8 match，差异 0/1024000，RESULT: pass（exit 0）；projects 两格从 2.12% / 2.21% 回到 0.0000%
- 基线政策：8 张 PNG 与 manifest.json 字节不变，本次只记录全量复采结果（GVR-BASELINE-NO-AUTO-UPDATE）



## 基线推进 v1 → v2：随模板活样例 tailwind 接线的判定通过复采（2026-11-19）

- 推进包：`2026-11-19_baseline-advance-tailwind`（spec 包记录，本节即其 C3 证据）
- 来源包归因：`2026-11-19_template-live-example`（F2：`app.tsx` import `./tailwind.css`，
  Tailwind v4 preflight 基座重置随包生效）
- 现象：集成后全量 e2e 对 v1 比对，`projects-light-zh-CN.png` 差异 6912/1024000（0.6750% > 0.1% 阈值）
  判 FAIL；其余 7 格差异 83–415 像素（0.0081%–0.0405%），均低于阈值
- 归因证据：两次独立全量复采（集成 main 与本包 worktree）差异逐像素一致（互差 0 像素，
  确定性渲染变化，非 flake）；差异簇为 actions 列（详情/编辑/删除）等 light 主题文字
  整体上移 1px（逐簇 +1px 垂直对齐后差异归零），dark 主题对应簇无此位移——
  preflight 的 font/line-height 基座重置在 light 主题下的亚像素取整差异
- 判定：v1 基线早于 tailwind 接线，属「已验收交付改变渲染」的基线过时，非回归、非污染；
  按 visual-review §基线生命周期（判定通过的复采推进 + spec 包记录）推进到 v2
- v2 基线：`docs/visual-baselines/v2/`（8 PNG + manifest.json，schema_version 1，
  version v2，source_pack `2026-11-19_template-live-example`，
  source_commit 为本包 worktree HEAD）；`--manifest --validate-only` RESULT: ok
- 复采命令：`env VISUAL_EVIDENCE_DIR=/tmp/ef-v2-capture npm --prefix template run e2e`
  （全量 14 passed，smoke 在前）；比对 `python3 scripts/visual_baseline_check.py
  --baseline docs/visual-baselines/v2 --capture /tmp/ef-v2-capture` → 8/8 match、
  差异 0/1024000、RESULT: pass（exit 0）
- v1 处置：**只读留存**——v1 的 8 张 PNG 与 manifest.json 字节不变（本节落笔后再次
  `--validate-only` 自证），历史比对记录见上文各节
