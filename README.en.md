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

1. **The constraint spec** — `SKILL.md` (an eight-layer main file) plus thirteen
   `references/` domain documents: bans, patterns, wiring discipline, and
   self-check hooks, all written as "do this", never as "you could consider".
2. **The starter template** — `template/`, a compliant non-map base skeleton
   (five sources of truth + unified request channel + content shell + quality
   gates). New projects start by copying the bundled template; it ships green
   on all gates.
3. **The toolchain** — ban scanning, visual-evidence-package validation, an
   installer, and a packager; the Python tools depend only on the Python 3
   standard library, and the installer additionally needs bash >= 3.2 and
   coreutils, so recipients can reproduce every acceptance check.

It serves two readers at once: **AI sessions** treat it as an executable spec
(load it and it applies), while **human engineers** use it as an enterprise
frontend engineering constraint handbook.

## Six design principles

| Principle | Meaning |
| --- | --- |
| **Bans execute globally** | The B1–B7 bans (no direct axios, no bypassing the framework router, no ESLint/Prettier, no second map engine, co-located assets, …) hold in any target repository regardless of its current state |
| **Layout partitioning** | Every business page divides its content area with a Layout (rows × columns) → one Cell per region → one Card per Cell → content components inside the Card content; raw div grids, empty Cells, multi-Card Cells, and nested Cards are structural violations |
| **Follow the source of truth** | Design tokens and routing/menu/permission structure **follow the target repository's sources of truth** — change the source, never fork a parallel system; copying the bundled template gives a new project the default sources |
| **Reproducible acceptance** | The spec speaks in patterns, never version numbers, and cites no external sources; acceptance = static ban scan + quality commands (lint / tsc / test) + per-item self-check hooks, with command output as the evidence |
| **Subtract the interface** | New or touched UI carries no filler slogans, explanatory copy, or decorative tags; if it cannot be read once they are gone, the layout is wrong — redesign it, never patch it with words (keep-list: four-state copy, validation, units, status tags, accessible names) |
| **Three-party experience ledger** | Every change must improve the user (UX), the developer (DX), and the AI agent (AX) while breaking nothing; a regression for any party, or cost shifted onto another, is not done — evidence is command output |

## Scope and scenarios

Applies to **generic enterprise admin frontends**; maps/GIS is a conditional
chapter that non-map tasks never load. Public landing pages, marketing pages,
campaign pages, and pricing/comparison pages are a **conditional overlay page
type**: they do not change the four core admin scenarios, and admin tasks never
load the public-page document. The SKILL.md Workflow classifies four core
scenarios in order, and `references/scenario-coverage.md` maps each to its
required anchors and self-check hooks:

| Scenario | Focus |
| --- | --- |
| Map workbench | Layer selection and budgets, box-select/draw/controlled selection, alerts and legends, asset co-origin |
| Spec review | Ban self-scan, document reference integrity, four-state and wiring recheck |
| Legacy page modification | Smallest complete change, source-of-truth following, ban regression, four-state regression |
| Non-map CRUD | Lists/forms/details, layout skeleton, four-state coverage, wiring, data layer |

Public pages (landing, marketing, campaign, pricing/comparison) are a
conditional overlay: strategy, content realism, interaction states, motion,
SEO, and launch checklist live in `references/public-pages.md` and load only
when the task matches.

Screenshot pixel-level review, visual walkthroughs, visual regression
re-verification, and actionable e2e fix advice form another conditional
overlay: the evidence-capture protocol (screenshot matrix / stability /
structure+coordinates), the eight-axis checklist, finding admission and
record format, and the fix-then-re-verify loop live in
`references/visual-review.md` and load only when the task matches.

## Archive recipients: install, use and start a project

These instructions apply to this public version and its release archives.

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

### Using it in a host session

Add `<target-dir>/enterprise-frontend` to your AI host's skill search path. In a new session, describe the task in natural language. The host decides when to activate the skill; use its explicit entry point when you want to select it directly. In Claude Code:

| Command | What it does |
| --- | --- |
| `/enterprise-frontend design project list` | Produce a page shape, layout, four states, and a verification plan without editing application code. |
| `/enterprise-frontend review src/pages/projects` | Report findings with locations, rules, and evidence. Leave application files untouched. |
| `/enterprise-frontend revise fix the project dialog's accidental-close behavior` | Apply only the authorized changes and verify them. Do not commit or publish automatically. |

On hosts without slash commands, explicitly select `enterprise-frontend` and enter the same command and target. Both entry points classify the intent and scenario, load the matching rules, and then deliver the requested design, review, or revision.

### Verify the install

```bash
cd <target-dir>/enterprise-frontend
python3 scripts/ban_scan.py template/   # ban self-scan → RESULT: clean
```

### Starting from scratch

Copy the starter template from the archive (five sources of truth + unified
request channel + content shell, already compliant):

```bash
cp -r enterprise-frontend/template/ my-admin
cd my-admin && npm install
```

See `template/README.md` for details.

## The spec system

The entry point is `SKILL.md` (eight layers: Identity/Mission → Success
Definition → Workflow → Decision Rules → Boundaries → Anti-Patterns → Review
Loop → References). Its conditional-loading routing table defines which task
reads which document:

| Document | Domain | When to read |
| --- | --- | --- |
| `references/design-reasoning.md` | Page design reasoning: requirement → page form/layout/card-content composition + three minimal pattern cards | Read before implementing any new page/feature |
| `references/layout-system.md` | Page layout system: Layout rows/columns → Cell → Card → content components, with recipes, height chain, and responsive rules | Any page layout design or implementation (read by default) |
| `references/general-pages.md` | Page spec: layout skeleton, CRUD patterns, four-state coverage, interface subtraction, route modals, menu wiring | Any page/component/layout work (read first by default) |
| `references/public-pages.md` | Public pages: one conversion goal, page structure, copy and content realism, visual direction, interaction states and motion, SEO and launch checklist | Public landing/marketing/campaign/pricing pages (conditional) |
| `references/data-layer.md` | Requests & server state: dual-channel, SSE, 401 convergence, queryKeys source of truth | Fetching, caching, login state |
| `references/design-tokens.md` | Design tokens & theme: inventory, why-comments, layout parameters, truth-source following | Colors, spacing, theming, style choices |
| `references/engineering.md` | Engineering rules: quality discipline, **the global ban table B1–B7 (single source of truth)**, four-step wiring, the three-party experience ledger, build environment | Quality gates, bans, wiring, build environment, per-change ledger |
| `references/map-layers.md` | Map layers: selection matrix, lifecycle, render budgets & explicit degradation | Tasks involving maps/spatial data (conditional) |
| `references/map-interaction.md` | Map interaction: box-select/draw/selection/highlight, alerts & legends, asset co-origin, single engine entry | Map interaction and assets (conditional) |
| `references/visual-review.md` | Screenshot visual review & e2e fix advice: evidence-capture protocol, eight-axis checklist, finding admission & pixel-diff semantics, finding record format, fix-then-re-verify loop (incl. layered acceptance, re-verify judge consistency, flaky retry protocol) | Pixel-level screenshot review / visual regression / e2e fix advice (conditional) |
| `references/testing-guide.md` | Test design guide: five test forms + mock patterns + per-scenario checklists | Writing/reviewing tests |
| `references/state-transitions.md` | State-transition & motion decisions: trigger → immediate feedback → final state → interrupt/rollback four-cell check, five-signal table, reduced-motion effective on first frame | State-transition/motion work surfaces (conditional) |
| `references/scenario-coverage.md` | Four core scenarios + public-page overlay matrix: scenario → anchors → self-check hooks | After scenario classification |

The full B1–B7 definitions (check level, blacklist literals) live only in
`references/engineering.md`; `SKILL.md` carries the IDs and one-line
semantics; the scan rule table `scripts/ban_rules.json` shares the same
source.

## License & distribution

Licensed under [PolyForm Noncommercial 1.0.0](LICENSE). **Commercial use requires separate written authorization**. See the [third-party notices](THIRD_PARTY_NOTICES.md) and [changelog](CHANGELOG.md).
