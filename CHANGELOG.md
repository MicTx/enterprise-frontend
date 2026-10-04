# Changelog

This file records current released design decisions. Git history is the source for superseded implementation detail.

The format follows Keep a Changelog headings so `scripts/build_release.py` can extract version notes.

## [Unreleased]

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

- Renamed the skill to `enterprise-frontend`. The previous name was an unsearchable personal brand plus a generic word; the new one matches how users look for this capability ("enterprise frontend") and follows agent-skill naming guidance (descriptive, lowercase, hyphenated). Install paths, release artifact names, the invocation syntax (`$enterprise-frontend` / `/enterprise-frontend`), and the publication contract now use the new name. This intentionally breaks the installer destination contract: existing installations under the previous name are not migrated automatically — reinstall and remove the old directories.
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

- Reframed the skill as a reference-driven frontend adaptation skill.
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
