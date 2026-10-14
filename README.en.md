# enterprise-frontend

[中文](README.md) | [English](README.en.md)

**A constraint-driven spec for enterprise admin frontends** — a production-
proven stack, design language, and engineering discipline distilled into a
**hard-constraint checklist** that AI coding sessions execute directly.

[![License: PolyForm Noncommercial](https://img.shields.io/badge/License-PolyForm_Noncommercial_1.0.0-lightgrey)](./LICENSE)

## What this is

`enterprise-frontend` is not a component library or a scaffold. It is a
**frontend engineering spec (a skill) for AI coding sessions**, made of three
parts:

1. **The constraint spec** — `SKILL.md` (an eight-layer main file) plus nine
   `references/` domain documents: bans, patterns, wiring discipline, and
   self-check hooks, all written as "do this", never as "you could consider".
2. **The starter template** — `template/`, a compliant non-map base skeleton
   (five sources of truth + unified request channel + content shell + quality
   gates). New projects start by copying the template; it ships green on all
   gates.
3. **The toolchain** — ban scanning, an installer, and a packager, all
   depending only on the Python 3 standard library, so recipients can
   reproduce every acceptance check.

It serves two readers at once: **AI sessions** treat it as an executable spec
(load it and it applies), while **human engineers** use it as an enterprise
frontend engineering constraint handbook.

## Three design principles

| Principle | Meaning |
| --- | --- |
| **Bans execute globally** | The B1–B7 bans (no direct axios, no bypassing the framework router, no ESLint/Prettier, no second map engine, co-located assets, …) hold in any target repository regardless of its current state |
| **Follow the source of truth** | Design tokens and routing/menu/permission structure **follow the target repository's sources of truth** — change the source, never fork a parallel system; spec defaults apply only when a project has none |
| **Reproducible acceptance** | The spec speaks in patterns, never version numbers, and cites no external sources; acceptance = static ban scan + quality commands (lint / tsc / test) + per-item self-check hooks, with command output as the evidence |

## Scope and scenarios

Applies to **generic enterprise admin frontends**; maps/GIS is a conditional
chapter that non-map tasks never load. The SKILL.md Workflow classifies four
scenarios in order, and `references/scenario-coverage.md` maps each to its
required anchors and self-check hooks:

| Scenario | Focus |
| --- | --- |
| Non-map CRUD | Lists/forms/details, layout skeleton, four-state coverage, wiring, data layer |
| Map workbench | Layer selection and budgets, box-select/draw/controlled selection, alerts and legends, asset co-origin |
| Legacy page modification | Smallest complete change, source-of-truth following, ban regression, four-state regression |
| Spec review | Ban self-scan, document reference integrity, four-state and wiring recheck |

## Quick start

### Install

Host-agnostic — no host directory is auto-detected; it installs where you
point it:

```bash
# From the archive root (source = the bundled enterprise-frontend/ directory)
./install.sh <target-dir>

./install.sh <target-dir> --dry-run   # preview actions, no writes
./install.sh <target-dir> --force     # replace even when content differs
./install.sh --help                   # full usage and exit codes
```

The install location is always `<target-dir>/enterprise-frontend/`;
re-installing identical content prints `already up to date`; replacing an old
install keeps a backup by default. Requires bash >= 3.2, python3 >= 3.9,
coreutils.

**Starting a project from scratch**: skip installing the skill and copy the
bundled `template/` starter instead (five sources of truth + unified request
channel + content shell, already compliant) — `cp -r template/ my-admin`,
then follow the template README (`npm install`).

### Using it in a host session

Add the parent path of `<target-dir>/enterprise-frontend` to your AI host's
skill search path and describe tasks in natural language in a new session
(some hosts also accept an explicit `$enterprise-frontend` or
`/enterprise-frontend` prefix). The session classifies the scenario per the
Workflow → runs the design-reasoning step (new pages/features produce a
form·layout·composition design first) → reads the routed spec documents →
applies the constraints → closes with the self-check hooks.

### Verify the install

```bash
cd <target-dir>/enterprise-frontend
python3 scripts/ban_scan.py references/   # ban self-scan → RESULT: clean
```

## The spec system

The entry point is `SKILL.md` (eight layers: Identity/Mission → Success
Definition → Workflow → Decision Rules → Boundaries → Anti-Patterns → Review
Loop → References). Its conditional-loading routing table defines which task
reads which document:

| Document | Domain | When to read |
| --- | --- | --- |
| `references/design-reasoning.md` | Page design reasoning: requirement → page form/layout/card-content composition + three minimal pattern cards | Read before implementing any new page/feature |
| `references/general-pages.md` | Page spec: layout skeleton, CRUD patterns, four-state coverage, route modals, menu wiring | Any page/component/layout work (read first by default) |
| `references/data-layer.md` | Requests & server state: dual-channel, SSE, 401 convergence, queryKeys source of truth | Fetching, caching, login state |
| `references/design-tokens.md` | Design tokens & theme: inventory, why-comments, layout parameters, truth-source following | Colors, spacing, theming, style choices |
| `references/engineering.md` | Engineering rules: quality discipline, **the global ban table B1–B7 (single source of truth)**, four-step wiring, build environment | Quality gates, bans, wiring, build environment |
| `references/map-layers.md` | Map layers: selection matrix, lifecycle, render budgets & explicit degradation | Tasks involving maps/spatial data (conditional) |
| `references/map-interaction.md` | Map interaction: box-select/draw/selection/highlight, alerts & legends, asset co-origin, single engine entry | Map interaction and assets (conditional) |
| `references/testing-guide.md` | Test design guide: five test forms + mock patterns + per-scenario checklists | Writing/reviewing tests |
| `references/scenario-coverage.md` | Four-scenario matrix: scenario → anchors → self-check hooks | After scenario classification |

The full B1–B7 definitions (check level, blacklist literals) live only in
`references/engineering.md`; `SKILL.md` carries the IDs and one-line
semantics; the scan rule table `scripts/ban_rules.json` shares the same
source.

## Toolchain

| Tool | Role | Self-test |
| --- | --- | --- |
| `scripts/ban_scan.py` + `ban_rules.json` | Ban static check (minimal by design: pattern matching with comment-line exemption; the rule table shares a single source with the spec's ban table; B7 explicitly unscanned) | `python3 scripts/tests/test_ban_scan.py` |
| `install.sh` | Host-agnostic installer (staging → idempotence check → backup → atomic move → validation → rollback) | `python3 scripts/tests/test_install_sh.py` |
| `scripts/build_package.py` | Assembles the release tree and tar.gz/zip archives per manifest v2 + manifest listing | `python3 scripts/tests/test_build_package.py` |

Ban self-scan: `python3 scripts/ban_scan.py <target>` — scanning the spec
documents and the template must always come back clean; the scan surface
naturally excludes documents and test fixtures.

## Packaging and distribution

```bash
python3 scripts/build_package.py          # produces dist/ (tree + tar.gz + zip + SHA256SUMS + listing)
python3 scripts/build_package.py --expect-version 1.0.0
```

Exclusion is the default: the `runtime` list in `manifest.json` is closed —
what is not listed is not packaged; internal planning surfaces, evidence
archives, and test fixtures (such as `scripts/tests/`) are excluded by
construction. Output layout and validation rules are documented in the
`scripts/build_package.py` module docstring.

## Maintenance quick reference

| Action | Command |
| --- | --- |
| Ban scan | `python3 scripts/ban_scan.py <path>` |
| Package | `python3 scripts/build_package.py` |
| All tests | run the three unittest suites under `scripts/tests/` |

## License & distribution

The repository's authored content (`SKILL.md`, `references/`, `template/`,
`scripts/`, the installer, and facade docs) is licensed under
[PolyForm Noncommercial 1.0.0](LICENSE) (SPDX:
`PolyForm-Noncommercial-1.0.0`) — free for noncommercial use;
**commercial use requires separate written authorization**.

Distribution channel: a private Gitea source of truth plus the accompanying
archive; any public snapshot requires separate authorization.

See [CHANGELOG](CHANGELOG.md) for the change history.
