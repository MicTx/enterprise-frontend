# Release Guide

This project uses Semantic Versioning. `manifest.json` `version` is the single source of truth.

## Versioning

| Bump | When |
| --- | --- |
| **Patch** `v0.x.y → v0.x.y+1` | documentation fixes, metadata alignment, non-breaking script fixes |
| **Minor** `v0.x.y → v0.x+1.0` | new helper-script capabilities, new workflow support, backward-compatible fields |
| **Major** `v0.x.y → v1.0.0` | breaking changes to the published runtime layout, installer contract, or behavior |

Until `v1.0.0`, backward compatibility is still preferred. Any intentional break should be called out in `CHANGELOG.md`.

## Build Artifacts

`scripts/build_release.py` produces standardized distributable artifacts in `dist/` (gitignored):

| Artifact | Description |
| --- | --- |
| `enterprise-frontend-{version}.tar.gz` | Installable package for Unix (preserves permissions) |
| `enterprise-frontend-{version}.zip` | Installable package for Windows |
| `SHA256SUMS` | SHA-256 checksums for release archives (the checksum file and release notes are excluded) |
| `RELEASE_NOTES.md` | Changelog excerpt for the matching version |

Each archive contains a `VERSION` file and `BUILD_INFO` (version, Git SHA, `git_dirty`, canonical `runtime_sha256`, build timestamp). The archive-root `install.sh` is the local skill installer. `build_release.py` itself is not in the archive.

The installed skill still contains only `manifest.json` runtime owners. The archive additionally ships `install.sh`, `manifest.json`, `scripts/package_skill.py`, `README.md`, `README.en.md`, and `LICENSE` so a recipient can install without the authoring repository and the package carries its own documentation and license.

### Building Locally

```bash
# Full build with pre-build checks (py_compile, bash -n, validate, unittest, ruff)
python3 scripts/build_release.py

# Skip checks for a fast rebuild
python3 scripts/build_release.py --skip-checks

# Verify a specific version
python3 scripts/build_release.py --expect-version 0.3.0

# Custom output directory
python3 scripts/build_release.py --output /tmp/my-dist
```

### Verifying Checksums

```bash
(cd dist && shasum -a 256 -c SHA256SUMS)
# or: (cd dist && sha256sum -c SHA256SUMS)
```

### Installing from an Archive

```bash
# Unix
tar xzf enterprise-frontend-0.3.0.tar.gz
cd enterprise-frontend-0.3.0
./install.sh

# Windows
Expand-Archive enterprise-frontend-0.3.0.zip
cd enterprise-frontend-0.3.0
bash install.sh
```

## Release Process

### 1. Prepare

1. Confirm `CHANGELOG.md` reflects the release candidate under `## [Unreleased]`.
2. Run the validation gate in [`CONTRIBUTING.md`](./CONTRIBUTING.md).

### 2. Version Bump

1. Update `version` in `manifest.json` to the target version (e.g. `0.1.0`).
2. Fold `## [Unreleased]` entries in `CHANGELOG.md` into `## [0.1.0] - YYYY-MM-DD`.
3. Commit:

```bash
git add manifest.json CHANGELOG.md
git commit -m "chore(release): bump version to 0.1.0"
```

### 3. Build and Tag

```bash
python3 scripts/build_release.py --expect-version 0.3.0
git tag v0.3.0
```

Send the files in `dist/`. Recipients install from the archive as above.

### 4. Verify

- `shasum -a 256 -c SHA256SUMS` (or `sha256sum -c SHA256SUMS`) from `dist/`.
- Confirm `BUILD_INFO.runtime_sha256` against the extracted tree excluding `VERSION` and `BUILD_INFO`.
- Extract the Unix archive and confirm `install.sh` is executable, then install into a temporary `HOME`.
- Confirm the installed skill contains only runtime owners from `manifest.json`.
