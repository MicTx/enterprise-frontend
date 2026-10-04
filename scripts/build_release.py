#!/usr/bin/env python3
"""Build versioned distributable artifacts for enterprise-frontend.

Produces in dist/:
  enterprise-frontend-{version}.tar.gz  installable package (Unix, preserves permissions)
  enterprise-frontend-{version}.zip     installable package (Windows)
  SHA256SUMS                 SHA-256 checksums for release archives
  RELEASE_NOTES.md           changelog excerpt for the matching version

Usage:
  python3 scripts/build_release.py
  python3 scripts/build_release.py --skip-checks
  python3 scripts/build_release.py --output /tmp/dist --expect-version 0.1.0
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from package_skill import PackageError, build_bundle, load_manifest

REPO_ROOT = Path(__file__).resolve().parents[1]
PYTHON = sys.executable
DEFAULT_DIST = REPO_ROOT / "dist"
PROJECT_NAME = "enterprise-frontend"
VERSION_RE = re.compile(r"^\d+\.\d+\.\d+$")
INSTALLER_FILES = ("install.sh", "manifest.json")
INSTALLER_SCRIPTS = ("package_skill.py",)
ARCHIVE_DOC_FILES = ("README.md", "README.en.md", "LICENSE")


class BuildError(Exception):
    """Raised when the build cannot proceed."""


def read_version(root: Path) -> str:
    """Read the project version from manifest.json."""
    try:
        manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise BuildError(f"cannot read {root / 'manifest.json'}: {exc}") from exc
    if not isinstance(manifest, dict):
        raise BuildError("manifest must be a JSON object")
    version = manifest.get("version")
    if not isinstance(version, str) or not VERSION_RE.match(version):
        raise BuildError("manifest version must be semver X.Y.Z")
    return version


def _run_cmd(args: list[str], cwd: Path, label: str) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(args, cwd=cwd, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip()
        raise BuildError(f"{label} failed (exit {result.returncode}):\n{detail}")
    return result


def run_prebuild_checks(root: Path) -> None:
    """Validate the tree before packaging: compile, project checks, tests, ruff."""
    scripts = sorted((root / "scripts").glob("*.py"))

    print("  py_compile ...", end=" ", flush=True)
    _run_cmd([PYTHON, "-m", "py_compile", *[str(path) for path in scripts]], root, "py_compile")
    print("ok")

    print("  installer syntax ...", end=" ", flush=True)
    bash = shutil.which("bash")
    if bash:
        _run_cmd([bash, "-n", str(root / "install.sh")], root, "bash -n")
        print("ok")
    else:
        print("skipped (bash not installed)")

    print("  validate_project ...", end=" ", flush=True)
    _run_cmd([PYTHON, str(root / "scripts" / "validate_project.py")], root, "validate_project")
    print("ok")

    print("  unittest ...", end=" ", flush=True)
    _run_cmd(
        [PYTHON, "-m", "unittest", "scripts.test_tooling", "-q"],
        root,
        "unittest",
    )
    print("ok")

    print("  ruff ........", end=" ", flush=True)
    probe = subprocess.run(
        [PYTHON, "-m", "ruff", "--version"],
        cwd=root,
        capture_output=True,
        text=True,
        check=False,
    )
    if probe.returncode != 0:
        print("skipped (ruff not installed)")
    else:
        _run_cmd([PYTHON, "-m", "ruff", "check", "scripts/"], root, "ruff")
        print("ok")


def compute_tree_sha256(root: Path, *, excluded: set[str] | None = None) -> str:
    """Hash relative paths, executable bits, and contents for one runtime tree."""
    ignored = excluded or set()
    digest = hashlib.sha256()
    for path in sorted(item for item in root.rglob("*") if item.is_file() and item.name not in ignored):
        relative = path.relative_to(root).as_posix()
        executable = "x" if path.stat().st_mode & 0o111 else "-"
        digest.update(f"{relative}\0{executable}\0".encode())
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(65536), b""):
                digest.update(chunk)
        digest.update(b"\0")
    return digest.hexdigest()


def stamp_build_info(runtime_dir: Path, version: str, root: Path | None = None) -> None:
    """Write VERSION and BUILD_INFO into the exported package tree."""
    repo = root if root is not None else REPO_ROOT
    for pyc in runtime_dir.rglob("__pycache__"):
        shutil.rmtree(pyc, ignore_errors=True)
    for pyc in runtime_dir.rglob("*.pyc"):
        pyc.unlink(missing_ok=True)

    git_sha = "unknown"
    git_dirty = "unknown"
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short=12", "HEAD"],
            cwd=repo,
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode == 0:
            git_sha = result.stdout.strip()
        status = subprocess.run(
            ["git", "status", "--porcelain", "--untracked-files=all"],
            cwd=repo,
            capture_output=True,
            text=True,
            check=False,
        )
        if status.returncode == 0:
            git_dirty = "true" if status.stdout.strip() else "false"
    except FileNotFoundError:
        pass

    build_time = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    (runtime_dir / "VERSION").write_text(f"{version}\n", encoding="utf-8")
    runtime_sha256 = compute_tree_sha256(runtime_dir, excluded={"VERSION", "BUILD_INFO"})
    build_info = (
        f"version={version}\n"
        f"git_sha={git_sha}\n"
        f"git_dirty={git_dirty}\n"
        f"runtime_sha256={runtime_sha256}\n"
        f"build_time={build_time}\n"
        f"built_by={Path(__file__).name}\n"
    )
    (runtime_dir / "BUILD_INFO").write_text(build_info, encoding="utf-8")


def assemble_release_tree(root: Path, dest: Path) -> Path:
    """Export the runtime bundle and add the installer surface for ./install.sh."""
    try:
        bundle = build_bundle(dest)
    except (PackageError, OSError) as exc:
        raise BuildError(str(exc)) from exc

    for name in INSTALLER_FILES:
        source = root / name
        if not source.is_file():
            raise BuildError(f"missing installer file: {name}")
        shutil.copy2(source, bundle / name)

    scripts_dir = bundle / "scripts"
    scripts_dir.mkdir(parents=True, exist_ok=True)
    for name in INSTALLER_SCRIPTS:
        source = root / "scripts" / name
        if not source.is_file():
            raise BuildError(f"missing installer script: {name}")
        shutil.copy2(source, scripts_dir / name)

    for name in ARCHIVE_DOC_FILES:
        source = root / name
        if not source.is_file():
            raise BuildError(f"missing archive documentation file: {name}")
        shutil.copy2(source, bundle / name)
    return bundle


def create_tarball(src_dir: Path, archive_name: str, output: Path) -> None:
    """Create a .tar.gz with src_dir contents under archive_name/."""
    with tarfile.open(output, "w:gz") as tar:
        for item in sorted(src_dir.iterdir()):
            tar.add(item, arcname=f"{archive_name}/{item.name}")


def create_zip(src_dir: Path, archive_name: str, output: Path) -> None:
    """Create a .zip with src_dir contents under archive_name/."""
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as zf:
        for item in sorted(src_dir.rglob("*")):
            if item.is_file():
                rel = item.relative_to(src_dir).as_posix()
                zf.write(item, arcname=f"{archive_name}/{rel}")


def compute_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_checksums(dist: Path) -> Path:
    """Write SHA256SUMS for every artifact file in dist/."""
    sums_file = dist / "SHA256SUMS"
    artifacts = sorted(
        path for path in dist.iterdir()
        if path.is_file() and path.name not in ("SHA256SUMS", "RELEASE_NOTES.md")
    )
    lines = [f"{compute_sha256(path)}  {path.name}" for path in artifacts]
    sums_file.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return sums_file


def extract_release_notes(root: Path, version: str) -> str:
    """Extract the changelog section for *version*."""
    changelog = root / "CHANGELOG.md"
    if not changelog.exists():
        return f"Release {version}\n"

    text = changelog.read_text(encoding="utf-8")
    pattern = re.compile(
        rf"(##\s*\[{re.escape(version)}\][^\n]*\n)(.*?)(?=\n##\s|\Z)",
        re.DOTALL,
    )
    match = pattern.search(text)
    if match:
        return match.group(0).strip() + "\n"
    return f"Release {version}\n"


def build(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()
    dist = Path(args.output).resolve()
    try:
        load_manifest(root)
        version = read_version(root)
    except (PackageError, BuildError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    print(f"Building {PROJECT_NAME} v{version}")

    if args.expect_version and version != args.expect_version:
        print(
            f"error: version mismatch — manifest.json has {version}, expected {args.expect_version}",
            file=sys.stderr,
        )
        return 1

    if not args.skip_checks:
        print("Pre-build checks:")
        run_prebuild_checks(root)
    else:
        print("Skipping pre-build checks")

    if dist.exists():
        shutil.rmtree(dist)
    dist.mkdir(parents=True)

    archive_name = f"{PROJECT_NAME}-{version}"

    with tempfile.TemporaryDirectory() as tmp:
        runtime_dir = Path(tmp) / PROJECT_NAME
        print("Exporting installable package ...")
        assemble_release_tree(root, runtime_dir)
        print("Stamping build info ...")
        stamp_build_info(runtime_dir, version, root)

        tarball = dist / f"{archive_name}.tar.gz"
        zip_file = dist / f"{archive_name}.zip"
        print(f"Creating {tarball.name} ...")
        create_tarball(runtime_dir, archive_name, tarball)
        print(f"Creating {zip_file.name} ...")
        create_zip(runtime_dir, archive_name, zip_file)

    print("Generating checksums ...")
    write_checksums(dist)
    print("Extracting release notes ...")
    (dist / "RELEASE_NOTES.md").write_text(extract_release_notes(root, version), encoding="utf-8")

    print("\nBuild complete:")
    for path in sorted(dist.iterdir()):
        if path.is_file():
            size = path.stat().st_size
            if size > 1024:
                print(f"  {path.name:42s} {size / 1024:>8.1f} KiB")
            else:
                print(f"  {path.name:42s} {size:>8}   B")
    print(f"\nArtifacts in: {dist}")
    print(f"Recipients: tar xzf {archive_name}.tar.gz && cd {archive_name} && ./install.sh")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build versioned distributable artifacts for enterprise-frontend.",
    )
    parser.add_argument(
        "--root",
        default=str(REPO_ROOT),
        help="Repository root (default: auto-detected from script location)",
    )
    parser.add_argument(
        "--output",
        "-o",
        default=str(DEFAULT_DIST),
        help="Output directory (default: dist)",
    )
    parser.add_argument(
        "--skip-checks",
        action="store_true",
        help="Skip pre-build validation (compile, validate, tests, ruff)",
    )
    parser.add_argument(
        "--expect-version",
        metavar="VERSION",
        help="Fail if the version in manifest.json does not match this value",
    )
    return parser.parse_args()


def main() -> int:
    try:
        return build(parse_args())
    except BuildError as exc:
        print(f"\nerror: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
