#!/usr/bin/env python3
"""Build the enterprise-frontend runtime bundle declared by manifest.json."""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import tempfile
from pathlib import Path, PurePosixPath, PureWindowsPath

ROOT = Path(__file__).resolve().parents[1]
FORBIDDEN_RUNTIME_NAMES = {".DS_Store", "__pycache__"}
FORBIDDEN_RUNTIME_SUFFIXES = {".pyc", ".pyo"}


class PackageError(RuntimeError):
    """Raised when the publication contract or destination is unsafe."""


# Publication is limited to runtime owners, not arbitrary repository paths.
RUNTIME_ROOTS = {"SKILL.md", "AGENTS.md", "agents", "examples", "references"}


def _validate_runtime_source(source: Path, entry: str, root: Path) -> None:
    for parent in source.parents:
        if parent == root:
            break
        if parent.is_symlink():
            raise PackageError(f"runtime source has a symlink ancestor: {entry}")
    paths = [source]
    if source.is_dir():
        paths.extend(source.rglob("*"))

    for path in paths:
        if path.is_symlink():
            raise PackageError(f"runtime source contains a symlink: {entry}/{path.relative_to(source)}")
        if not path.is_file() and not path.is_dir():
            raise PackageError(f"unsupported runtime source: {path}")
        if path.name in FORBIDDEN_RUNTIME_NAMES or path.suffix in FORBIDDEN_RUNTIME_SUFFIXES:
            raise PackageError(f"runtime source contains generated/local state: {path.relative_to(root)}")


def load_manifest(root: Path | None = None) -> dict[str, object]:
    """Load and validate the runtime publication contract."""
    root = ROOT if root is None else root.resolve()
    manifest_path = root / "manifest.json"
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise PackageError(f"cannot read {manifest_path}: {exc}") from exc

    if not isinstance(manifest, dict):
        raise PackageError("manifest must be a JSON object")
    if type(manifest.get("schemaVersion")) is not int or manifest["schemaVersion"] != 1:
        raise PackageError("manifest schemaVersion must be 1")
    if manifest.get("skill") != "enterprise-frontend":
        raise PackageError("manifest skill must be 'enterprise-frontend'")
    version = manifest.get("version")
    if not isinstance(version, str) or not re.fullmatch(r"\d+\.\d+\.\d+", version):
        raise PackageError("manifest version must be semver X.Y.Z")

    runtime = manifest.get("runtime")
    if not isinstance(runtime, list) or not runtime:
        raise PackageError("manifest runtime must be a non-empty array")

    entries: list[PurePosixPath] = []
    for raw_entry in runtime:
        if not isinstance(raw_entry, str) or not raw_entry:
            raise PackageError("every runtime entry must be a non-empty string")
        entry = PurePosixPath(raw_entry)
        if (not entry.parts or entry.is_absolute() or ".." in entry.parts
                or str(entry) != raw_entry or "\\" in raw_entry
                or PureWindowsPath(raw_entry).drive
                or any(ord(char) < 32 or char == ":" for char in raw_entry)):
            raise PackageError(f"unsafe or non-normalized runtime entry: {raw_entry!r}")
        if entry.parts[0] not in RUNTIME_ROOTS:
            raise PackageError(f"entry is outside runtime owners: {raw_entry}")
        if entry in entries:
            raise PackageError(f"duplicate runtime entry: {raw_entry}")
        if any(parent in entry.parents or entry in parent.parents for parent in entries):
            raise PackageError(f"overlapping runtime entries are not allowed: {raw_entry}")

        source = root / Path(raw_entry)
        if not source.exists():
            raise PackageError(f"runtime source does not exist: {raw_entry}")
        _validate_runtime_source(source, raw_entry, root)
        entries.append(entry)

    if "SKILL.md" not in runtime or not (root / "SKILL.md").is_file():
        raise PackageError("runtime must include the SKILL.md file")
    return manifest


def normalize_destination(destination: Path, skill_name: str) -> Path:
    """Return a canonical destination without following its final symlink."""
    expanded = Path(os.path.abspath(os.path.expanduser(str(destination))))
    if expanded.name != skill_name:
        raise PackageError(f"destination directory must be named {skill_name!r}")

    # Resolve the parent so an existing symlink cannot disguise a path inside the
    # source tree. Keep the final component unresolved because replacing a final
    # symlink is a supported installation/update operation.
    expanded = expanded.parent.resolve() / expanded.name
    root = ROOT.resolve()
    if expanded == root or root in expanded.parents or expanded in root.parents:
        raise PackageError("destination must not be the source repository or one of its ancestors/descendants")
    return expanded


def copy_entry(source: Path, destination: Path) -> None:
    if source.is_dir():
        shutil.copytree(source, destination, symlinks=True)
    elif source.is_file():
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination, follow_symlinks=False)
    else:
        raise PackageError(f"unsupported runtime source: {source}")


def _replace_destination(staging: Path, destination: Path) -> None:
    """Commit a staged bundle, restoring the previous destination on failure."""
    previous_root: Path | None = None
    previous: Path | None = None

    if destination.exists() or destination.is_symlink():
        previous_root = Path(
            tempfile.mkdtemp(prefix=f".{destination.name}.previous-", dir=destination.parent)
        )
        previous = previous_root / destination.name
        try:
            os.replace(destination, previous)
        except BaseException:
            shutil.rmtree(previous_root, ignore_errors=True)
            raise

    committed = False
    try:
        os.replace(staging, destination)
        committed = True
    except BaseException:
        if previous is not None and (previous.exists() or previous.is_symlink()):
            try:
                if destination.exists() or destination.is_symlink():
                    if destination.is_dir() and not destination.is_symlink():
                        shutil.rmtree(destination)
                    else:
                        destination.unlink()
                os.replace(previous, destination)
            except BaseException as restore_error:
                raise PackageError(
                    f"bundle replacement failed and the previous destination "
                    f"could not be restored; preserved at {previous}"
                ) from restore_error
        raise
    finally:
        if previous_root is not None and (
            committed or previous is None or not (previous.exists() or previous.is_symlink())
        ):
            shutil.rmtree(previous_root, ignore_errors=True)


def build_bundle(destination: Path) -> Path:
    """Build a clean bundle and replace destination only after staging succeeds."""
    manifest = load_manifest()
    skill_name = str(manifest["skill"])
    destination = normalize_destination(destination, skill_name)
    destination.parent.mkdir(parents=True, exist_ok=True)

    staging = Path(
        tempfile.mkdtemp(prefix=f".{destination.name}.staging-", dir=destination.parent)
    )
    try:
        for raw_entry in manifest["runtime"]:  # type: ignore[index]
            relative = Path(str(raw_entry))
            copy_entry(ROOT / relative, staging / relative)

        if not (staging / "SKILL.md").is_file():
            raise PackageError("packaged bundle is missing SKILL.md")

        _replace_destination(staging, destination)
    except BaseException:
        shutil.rmtree(staging, ignore_errors=True)
        raise

    return destination


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Create a clean enterprise-frontend runtime bundle from manifest.json."
    )
    parser.add_argument("--dest", required=True, type=Path, help="destination named enterprise-frontend")
    args = parser.parse_args()

    try:
        destination = build_bundle(args.dest)
    except (PackageError, OSError) as exc:
        parser.error(str(exc))
    print(f"Packaged enterprise-frontend runtime: {destination}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
