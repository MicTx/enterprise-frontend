# Maintaining enterprise-frontend

## Ownership

`manifest.json` is the single publication boundary: only `SKILL.md`, `AGENTS.md`, host metadata, examples and references may enter the runtime bundle. Runtime resources cannot depend on repository maintenance files. The repository map is in `README.md`.

| Rule or procedure | Owner |
|---|---|
| Source precedence, workflow, decisions, completion | `SKILL.md` |
| Complex migration decisions | `references/adaptation-playbook.md` |
| Application verification details | `references/verification.md` |
| API evidence / fallback choices | `references/antd-facts.md` / `references/default-profile.md` |
| Evaluation scenarios and expected behavior | `evals/evals.json` |
| Repository validation and publishing | This file and the scripts below |

Other entry points summarize or link; they do not maintain competing checklists. Retain a rule only if it changes a decision, protects behavior, or supplies evidence. Keep task size and risk proportional to the required process. Examples teach concrete application rather than introducing new rules.

## Change a resource

1. Edit its owner and affected references; preserve the source precedence in `SKILL.md`.
2. Update `manifest.json` only if the published entry set changes. Entries must be normalized relative POSIX paths inside runtime owners; symlinks, special files, generated state and overlaps are rejected.
3. Update affected user/platform docs and `CHANGELOG.md`; do not rewrite unrelated guides.
4. Run the validation gate. Use temporary HOME/destinations for installation checks, never real agent installations as test fixtures.

Do not add a new directory or abstraction for an existing responsibility. Keep one concrete page example unless another teaches a genuinely different decision.

## Offline Ant Design mirror

`references/antd/llms-full.txt` is immutable within a documented version. When deliberately updating it from an official source:

1. check the first changelog version against the intended source;
2. regenerate `references/antd/llms-index.md` with `python3 scripts/index_antd.py --write`;
3. inspect representative API/token/semantic/FAQ fragments;
4. update lookup guidance if needed, then run validation.

The index binds headings and SHA-256 to exact mirror bytes. The target's installed library version still takes precedence.

## Validation gate

Run once after the relevant changes:

```bash
python3 scripts/validate_project.py
python3 -m unittest scripts/test_tooling.py -v
python3 /path/to/skill-creator/scripts/quick_validate.py .
bash -n install.sh
git diff --check
git status --short
```

Use the installed skill-creator path for `quick_validate.py`; if unavailable, report that gap rather than a pass. With ruff installed, also run `ruff check scripts` after Python changes.

- `validate_project.py` owns structure, required/obsolete paths, strict manifest and generated bundle, local/runtime references, eval JSON schema/IDs/fixtures, and offline index consistency. Do not repeat `json.tool` or index checks as independent evidence for the same inputs.
- `test_tooling.py` covers package bytes, versioned release archives, all installer targets in temporary HOME, dry-run zero writes, rollback/failure paths and invalid-input regressions.
- The quick validator checks skill metadata separately. Browser/model behavior is not covered by these commands; evaluation procedure lives in `evals/README.md`.

Versioned sendable artifacts are produced by `scripts/build_release.py` into gitignored `dist/`. [`RELEASE.md`](./RELEASE.md) owns versioning, checksums, and the publish checklist.

```bash
python3 scripts/build_release.py
python3 scripts/build_release.py --skip-checks
```

Recipients extract `enterprise-frontend-{version}.tar.gz` or `.zip` and run `./install.sh`. The archive is the installer surface plus the runtime bundle; the installed skill still contains only `manifest.json` runtime owners.

An unpacked runtime bundle is useful when inspecting a publication, not as an extra obligatory step after equivalent checks:

```bash
python3 scripts/package_skill.py --dest /path/outside/repository/enterprise-frontend
```

The destination must be named `enterprise-frontend` and cannot overlap the source tree. Packaging stages before replacement, attempts rollback on failure, and retains no backup after success.

## Commits

Use Conventional Commits with a focused scope, for example `fix(validation): report malformed references` or `refactor(skill): remove duplicate workflow rules`.
