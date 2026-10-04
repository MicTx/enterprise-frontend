# enterprise-frontend

Reference-driven agent skill for extending, migrating, and reviewing enterprise frontends on React / Ant Design.

[简体中文](./README.md) | **English**

## Table of contents

- [What this is](#what-this-is)
- [Install](#install)
- [Use](#use)
- [Repository map](#repository-map)
- [Maintain and evaluate](#maintain-and-evaluate)
- [License](#license)

## What this is

Ask an AI coding agent to add a page inside an existing enterprise frontend, and a common result is: the page runs, but it looks foreign. The agent generates from generic best practices, bringing its own request wrappers, state management, and styling; reviewers then separate line by line what follows repository conventions and what is newly invented.

enterprise-frontend reverses the order: first find a proven similar user journey inside the target repository, then adapt it. The new page inherits the repository's routing, permissions, request, and feedback conventions from day one, and the change stays inside that journey. It targets admin systems, dashboards, CRUD pages, settings, and map workbenches on React / Ant Design (including Pro Components) codebases; the mechanism is stack-agnostic, while the bundled reference material leans toward Ant Design.

Three modes:

| Mode | When |
|---|---|
| **Adopt** | Initialize foundations, or migrate wholesale from a reference repository |
| **Extend** | Add or change a user journey, delivering one complete vertical slice |
| **Align** | Review or repair: behavior and integration first, then interaction/layout/accessibility, then visual detail |

How it divides work with neighboring skills:

| Skill | Owns |
|---|---|
| Anthropic `frontend-design` | Design and aesthetics from scratch: layout, typography, visual expression |
| Ant Design official `antd-skill` | Component API and version knowledge |
| This repository | Existing-frontend engineering: extend, migrate, and review within established conventions |

What it does not do, stated up front:

- It installs no frontend runtime dependency and changes no target-repository technology choice.
- Bundled material never outranks the target repository: its conventions, theme, and installed versions win; bundled defaults only answer questions the repository leaves open.
- Structural validation (the tooling) checks packaging and installation contracts, not model performance; the behavioral evaluation method lives in [`evals/README.md`](./evals/README.md), and the current scenario set has not been run as an executed benchmark.

To understand why each rule has its shape, read [`docs/why-reference-driven.md`](./docs/why-reference-driven.md) (Chinese); the full agent-side rules live in [`SKILL.md`](./SKILL.md).

## Install

Requires Bash 3+, Python 3.9+, standard Unix utilities, and a skill-aware coding agent. This skill installs no frontend dependency.

```bash
git clone https://github.com/MicTx/enterprise-frontend.git
cd enterprise-frontend
./install.sh
```

Default targets: Codex, Claude Code, and detected compatible tools, including Pi at `~/.pi/agent/skills/enterprise-frontend`.

```bash
./install.sh --codex-only    # or --claude-only
./install.sh --all           # every supported target
./install.sh --dry-run       # print targets without writing
./install.sh --help          # all options and environment overrides
```

Existing installations get a backup under the gitignored `.install-backups/` directory before replacement; each target stages and restores on its own, and installation is not an all-target transaction. Details and switches are in `./install.sh --help`. For native PowerShell, follow [`docs/windows.md`](./docs/windows.md).

To send an installable archive instead of the repository:

```bash
python3 scripts/build_release.py
```

Artifacts land in the gitignored `dist/` with checksums and release notes; recipients extract and run `./install.sh`. The release checklist is [`RELEASE.md`](./RELEASE.md).

Verify the selected target and restart the agent:

```bash
test -f ~/.claude/skills/enterprise-frontend/SKILL.md
# For Codex, use ~/.codex/skills/enterprise-frontend/SKILL.md instead.
```

## Use

Natural frontend requests are sufficient; `$enterprise-frontend` or `/enterprise-frontend` is optional.

```text
Add supplier management by adapting the existing customer-management flow.
Migrate this incomplete frontend from the reference, preserving our APIs and brand.
Fix this map workbench's narrow-screen overflow without replacing its shell.
```

See [`examples/adapt-existing-slice.md`](./examples/adapt-existing-slice.md) for a worked page adaptation. For unfamiliar or version-sensitive Ant Design APIs, use [`references/antd-facts.md`](./references/antd-facts.md); the target's installed version outranks the bundled offline mirror.

## Repository map

```text
README.md / README.en.md       bilingual repository documentation
SKILL.md / AGENTS.md           agent operating model / entry
agents/openai.yaml             host metadata
examples/adapt-existing-slice.md
references/
  adaptation-playbook.md       complex migration decisions
  verification.md              test/browser/residue method
  default-profile.md           unresolved product choices only
  antd-facts.md                version-aware API lookup
  antd/llms-index.md           offline navigation
  antd/llms-full.txt           immutable versioned mirror
manifest.json                  runtime publication boundary and version
install.sh                     multi-tool installer
scripts/
  package_skill.py             deterministic runtime packager
  build_release.py             versioned dist/ packager
  validate_project.py          structure, references, bundle, eval and index checks
  index_antd.py                offline index regeneration/check
  test_tooling.py              packaging/validation/installation regressions
evals/                         scenario definitions and comparison records
docs/
  windows.md                   native Windows / WSL installation
  why-reference-driven.md      design rationale (Chinese)
CONTRIBUTING.md                maintenance and validation commands
RELEASE.md                     versioned artifacts and publish checklist
CHANGELOG.md                   change history
LICENSE                        PolyForm Noncommercial 1.0.0
```

Only the entries in `manifest.json` are installed; scripts, evals, documentation, and Git state stay outside the runtime bundle.

## Maintain and evaluate

[`CONTRIBUTING.md`](./CONTRIBUTING.md) owns maintenance and validation commands. [`evals/README.md`](./evals/README.md) explains behavioral evaluation; [`evals/evals.json`](./evals/evals.json) owns the scenarios. Structural validation is not a model-performance result.

## License

Code is licensed under [PolyForm Noncommercial 1.0.0](./LICENSE) (SPDX: `PolyForm-Noncommercial-1.0.0`): free to use, modify, and distribute for noncommercial purposes; commercial use requires separate written authorization.
