# Changelog

This file records current released design decisions. Git history is the source for superseded implementation detail.

The format follows Keep a Changelog headings so the packaging step can extract version notes.

## [1.1.0] - 2026-10-14

### Changed

- **规范层去引用源自洽化**：SKILL.md 与九篇 references/ 不再携带任何外部证据
  引用与来源仓库线索，条文以自洽抽象表述（禁令语义、模式、默认值单文自足）；
  Review Loop 引用完整性门改查规范文档自身互链。`library/` 证据档案、
  `LICENSE-LIBRARY` 及快照工具（index_library/verify_snapshot）退出交付面：
  manifest.runtime 闭式清单移除，安装器暂存净化同步排除；仓库内部保留档案，
  不随安装与打包分发。授权面回归单层 PolyForm Noncommercial。

### Fixed

- **起始模板质量门修复**：出厂即门禁全绿（`npm run lint && npm run test:ci`）。
  ① 七个源文件 biome 格式对齐，`biome.json` 换用 `rules.preset`（2.x 弃用键
  `recommended`），诊断清单换键前后逐条一致；② 删除 `apiClient.ts` 未使用类型
  `ApiFn`（唯一 lint error）；③ 测试链三处接线修复（setupTests 移入
  `setupFilesAfterEnv`、esbuild JSX 对齐 `react-jsx`、tsconfig types 补
  jest-dom），并新增 Home 渲染冒烟测试（此前 0 测试致 `test:ci` exit 1）；
  ④ 门禁硬化：`lint` 改用 `biome check .`，格式漂移提交前拦截。

### Added

- **起始模板 `template/`**：非地图基座合规骨架（五真源 + 统一请求通道 +
  内容壳 + Home 形态示例），随包分发；新项目冷启动从复制模板开始。

## [1.0.0] - 2026-10-14

### Changed

- **全量重做为约束型 skill**：抛弃「参考驱动」方案（Source Precedence 阶梯、Final Gate、
  示例与评测面），SKILL.md 重写为八层骨架约束主文；一切企业级前端工作默认执行规范，
  禁令全局硬执行、token 与结构约定跟随目标仓库真源；规范条文全部可追溯至 library/ 快照证据。

### Added

- **规范域七篇**：general-pages（页面）、data-layer（请求与服务端状态）、design-tokens
  （设计 token）、engineering（工程规约与禁令表 B1–B7）、map-layers / map-interaction
  （地图条件章节）、scenario-coverage（四场景映射矩阵）。
- **library/ 静态快照**：248 文件逐字节快照 + SNAPSHOT.json（全量 SHA-256）+ SOURCE 采集
  记录 + SNAPSHOT-MANIFEST/SNAPSHOT-REVIEW 收录边界与逐文件审查 + INDEX 自动索引。
- **工具链五件 + 测试**：verify_snapshot.py（快照完整性校验）、ban_scan.py + ban_rules.json
  （禁令静态检查，规则表与规范禁令表同源，B7 显式不扫）、index_library.py（确定性索引重建）、
  install.sh（宿主无关安装器）、build_package.py（发布打包），各配 unittest 矩阵。
- **双许可载体**：LICENSE-LIBRARY（派生源码快照的 AGPL-3.0 全文 + 上游 MIT 归属，独立于
  PolyForm）；双语 README（中英互链）。

### Removed

- **旧发布面**：宿主耦合安装器、旧 manifest schema v1、build_release / package_skill /
  index_antd / test_tooling / validate_project 五件旧工具、examples/、evals/、docs/、agents/、
  RELEASE.md、CONTRIBUTING.md。

## [0.3.0] - 2026-10-04

### Added

- Added `README.en.md` as the English mirror of the rewritten Chinese-primary `README.md`; both share one structure and cross-link at the top.
- Added `docs/why-reference-driven.md`, a Chinese design-rationale article explaining vertical slices, source precedence, the smallest complete change, and the Final Gate.
- Release archives now ship `README.md`, `README.en.md`, and `LICENSE` at the archive root, so a distributed package carries its own documentation and license without the authoring repository.

### Changed

- Rebuilt `README.md` as the Chinese-primary document ordered by a reader question chain: what/why with a neighboring-skill comparison and explicit non-goals, install, use, repository map, license.
- Switched the license from an unsupported "MIT" mention to PolyForm Noncommercial 1.0.0: added the official `LICENSE` text and updated the License section of both READMEs; commercial use now requires separate written authorization.
- Allowed `LICENSE` and `README.en.md` as repository root entries in `scripts/validate_project.py`, keeping the root inventory closed.

## [0.2.0] - 2026-10-04

### Changed

- Renamed the skill from `dawud-ui` to `enterprise-frontend`. The old name was an unsearchable personal brand plus a generic word; the new one matches how users look for this capability ("enterprise frontend") and follows agent-skill naming guidance (descriptive, lowercase, hyphenated). Install paths, release artifact names, the invocation syntax (`$enterprise-frontend` / `/enterprise-frontend`), and the publication contract now use the new name. This intentionally breaks the installer destination contract: existing `dawud-ui` installations are not migrated automatically — reinstall and remove the old directories. The rename decision record, including the keyword research and recommended public-repository topics, lives in the repository internal decision records.
- Allowed `.zcode/` as ignored local agent state alongside `.agents/` so repository validation tolerates session-local plan files.
- Aligned `scripts/` with the current ruff 0.16 rule set so the release gate passes again: explicit `check=False` on `subprocess.run`, combined context managers, import ordering, bare `raise` in the restore path, and executable bits for shebanged scripts. No behavior change; the violations predated this release.

## [0.1.0] - 2026-09-21

### Added

- Added `scripts/build_release.py` to emit versioned `dist/` artifacts (`tar.gz`, `zip`, `SHA256SUMS`, `RELEASE_NOTES.md`) with `VERSION` and `BUILD_INFO` stamps.

### Changed

- Consolidated the runtime into one scope-aware workflow; local fixes no longer imply full-repository discovery or a new vertical slice, and absent analogues fall back to target primitives and explicit contracts.
- Removed duplicate entry-point, migration, evaluation and maintenance checklists; each rule has one owner, equivalent verification is not rerun without changed inputs, and evaluation scenarios now cover local fixes and missing analogues.

- Kept malformed URL and fixture-path errors inside validator diagnostics, rejected control characters before filesystem resolution, and recognized protocol-relative external links; added regression coverage for invalid inputs and path-resolution failures.

- Fixed validation after installation by pruning local backup/cache trees; included SKILL resource links and runtime dependency closure in validation.
- Unified strict manifest validation between packaging and repository checks, rejecting malformed JSON shapes, unsafe cross-platform paths, symlink ancestors, and special files.
- Made installer staging destination-local, cleaned candidates on failure/skip, protected backup destinations, added unique backup containers and Pi detection, and kept dry-run free of Python bytecode writes.
- Added portable offline-index regeneration with exact-byte fingerprint and section checks; removed the GNU awk requirement and corrected stale API flags.
- Added evaluation contract validation and clarified that scenario definitions are not executed behavioral benchmarks.

- Reframed dawud-ui as a reference-driven frontend adaptation skill.
- Established source precedence: user intent, target repository, supplied reference, closest target-local example, framework facts, then fallback defaults.
- Added Adopt, Extend, and Align operating modes.
- Added one complete vertical-slice adaptation example and focused migration, verification, fallback, and Ant Design references.
- Separated runtime skill content from repository maintenance content through `manifest.json`.
- Made packaging deterministic with `scripts/package_skill.py`; installation now replaces stale runtime trees instead of overlay-copying files.
- Co-located the Ant Design offline mirror and its index under `references/antd/`.
- Consolidated the evaluation contract into `evals/README.md`.
- Rewrote user, maintainer, agent, and Windows documentation against the final structure and executable commands.
- Hardened packaging and installation against symlink path escapes, dangling destinations, and failed replacement commits; added transactional restore behavior and standard-library tooling regression tests.
- Extended repository validation to check local Markdown image references as well as ordinary links.

### Removed

- Fixed cross-project style contracts and mandatory page topology guidance.
- Obsolete component/pattern catalogs, visual cases, training decks, golden prose outputs, and historical task archives.
- Duplicate installation file lists and duplicate evaluation documentation.
