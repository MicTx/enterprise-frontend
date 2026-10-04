#!/usr/bin/env python3
"""Validate enterprise-frontend's repository layout, runtime manifest, and local links."""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit

try:
    from .index_antd import render_index
    from .package_skill import RUNTIME_ROOTS, PackageError
    from .package_skill import load_manifest as read_runtime_manifest
except ImportError:  # Direct script invocation, without a package context.
    from index_antd import render_index
    from package_skill import RUNTIME_ROOTS, PackageError
    from package_skill import load_manifest as read_runtime_manifest

ROOT = Path(__file__).resolve().parents[1]

LOCAL_STATE = {".git", ".agents", ".spec", ".install-backups", ".DS_Store",
               ".ruff_cache", "__pycache__", "tmp", "dist", ".zcode"}

ROOT_ALLOWED = {
    ".gitignore",
    ".spec",
    "AGENTS.md",
    "CHANGELOG.md",
    "CONTRIBUTING.md",
    "LICENSE",
    "README.en.md",
    "README.md",
    "RELEASE.md",
    "SKILL.md",
    "agents",
    "docs",
    "evals",
    "examples",
    "install.sh",
    "manifest.json",
    "references",
    "scripts",
}
RUNTIME_FORBIDDEN = {
    ".git",
    ".spec",
    "CHANGELOG.md",
    "CONTRIBUTING.md",
    "README.md",
    "docs",
    "evals",
    "install.sh",
    "manifest.json",
    "scripts",
}
OBSOLETE_PATHS = {
    "assets",
    "cases",
    "training",
    "evals/golden",
    "llms-full.txt",
    "references/llms-index.md",
    "references/components.md",
    "references/for-agents.md",
    "references/patterns.md",
    "references/selection.md",
    "references/tokens.md",
}
REQUIRED_PATHS = {
    "SKILL.md",
    "AGENTS.md",
    "README.md",
    "RELEASE.md",
    "CONTRIBUTING.md",
    "CHANGELOG.md",
    "manifest.json",
    "install.sh",
    "agents/openai.yaml",
    "examples/adapt-existing-slice.md",
    "references/adaptation-playbook.md",
    "references/verification.md",
    "references/default-profile.md",
    "references/antd-facts.md",
    "references/antd/llms-index.md",
    "references/antd/llms-full.txt",
    "scripts/index_antd.py",
    "scripts/package_skill.py",
    "scripts/build_release.py",
    "scripts/test_tooling.py",
    "scripts/validate_project.py",
    "evals/README.md",
    "evals/evals.json",
    "evals/baseline.md",
    "docs/windows.md",
}
REFERENCE_TOKENS = (
    "references/antd/llms-full.txt",
    "references/antd/llms-index.md",
    "references/adaptation-playbook.md",
    "references/verification.md",
    "references/default-profile.md",
    "references/antd-facts.md",
    "examples/adapt-existing-slice.md",
    "docs/windows.md",
    "evals/README.md",
    "evals/evals.json",
)
OBSOLETE_TEXT_TOKENS = (
    "docs/WINDOWS.md",
    "references/llms-index.md",
    "references/tokens.md",
    "references/components.md",
    "references/patterns.md",
    "references/selection.md",
    "references/for-agents.md",
)
TEXT_SUFFIXES = {".md", ".json", ".yaml", ".yml", ".py", ".sh"}
MARKDOWN_LINK = re.compile(r"!?\[[^\]]*\]\(([^)]+)\)")
INLINE_PATH = re.compile(r"`((?:\.\.?/)[^`\n]+(?:\.md|\.json|\.yaml|\.yml|\.py|\.sh|\.txt))(?::\d+(?:-\d+)?)?`")


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def load_manifest(errors: list[str]) -> dict[str, object] | None:
    try:
        return read_runtime_manifest(ROOT)
    except PackageError as exc:
        errors.append(str(exc))
        return None


def collect_files(root: Path) -> set[str]:
    return {
        path.relative_to(root).as_posix()
        for path in root.rglob("*")
        if path.is_file() and ".DS_Store" not in path.parts
    }


def expected_runtime_files(entries: list[str]) -> set[str]:
    expected: set[str] = set()
    for entry in entries:
        source = ROOT / entry
        if source.is_file():
            expected.add(entry)
        elif source.is_dir():
            expected.update(rel(path) for path in source.rglob("*") if path.is_file())
    return expected


def iter_text_files() -> list[Path]:
    files = []
    for directory, subdirs, names in os.walk(ROOT, followlinks=False):
        subdirs[:] = [name for name in subdirs
                      if name not in LOCAL_STATE
                      and not (Path(directory) / name).is_symlink()]
        for name in names:
            path = Path(directory) / name
            if not path.is_symlink() and path.suffix.lower() in TEXT_SUFFIXES:
                files.append(path)
    return sorted(files)


def resolve_reference(source: Path, raw: str) -> Path | None:
    raw = raw.strip()
    if not raw:
        return None
    if raw.startswith("<") and ">" in raw:
        target = raw[1:raw.index(">")]
    else:
        target = raw.split(maxsplit=1)[0]
    if any(ord(char) < 32 or ord(char) == 127 for char in target):
        raise ValueError("reference contains control characters")
    parsed = urlsplit(target)
    if parsed.scheme or parsed.netloc or target.startswith("#"):
        return None
    clean = unquote(parsed.path)
    if any(ord(char) < 32 or ord(char) == 127 for char in clean):
        raise ValueError("reference path contains control characters")
    if not clean or any(char in clean for char in "*<>{}"):
        return None
    candidate = (source.parent / clean).resolve()
    return candidate


def check_references(errors: list[str]) -> None:
    manifest = load_manifest([])
    runtime_files = expected_runtime_files(manifest["runtime"]) if manifest else None
    texts = []
    for source in iter_text_files():
        try:
            text = source.read_text(encoding="utf-8")
        except (OSError, UnicodeError) as exc:
            errors.append(f"cannot read {rel(source)}: {exc}")
            continue
        if source.name != "validate_project.py":
            texts.append(text)
        is_runtime = rel(source).split("/")[0] in RUNTIME_ROOTS
        refs = []
        if source.suffix.lower() == ".md":
            refs.extend(match.group(1) for match in MARKDOWN_LINK.finditer(text))
        refs.extend(match.group(1) for match in INLINE_PATH.finditer(text))
        if is_runtime:
            # Skill resource paths are rooted at the skill, not the target cwd.
            for raw in re.findall(r"`((?:references|examples|agents)/[^`\s]+\.(?:md|txt|yaml))`", text):
                if not (ROOT / raw).is_file():
                    errors.append(f"broken skill resource in {rel(source)}: {raw}")
                elif runtime_files is not None and raw not in runtime_files:
                    errors.append(f"runtime resource leaves bundle in {rel(source)}: {raw}")
        for raw in refs:
            try:
                candidate = resolve_reference(source, raw)
            except (OSError, ValueError, RuntimeError) as exc:
                # pathlib reports symlink loops as RuntimeError on Python 3.9.
                errors.append(f"invalid reference in {rel(source)}: {raw!r}: {exc}")
                continue
            if candidate is not None:
                if candidate != ROOT and ROOT not in candidate.parents:
                    if is_runtime:
                        errors.append(f"runtime reference escapes repository in {rel(source)}: {raw}")
                    continue
                if not candidate.exists():
                    errors.append(f"broken local reference in {rel(source)}: {raw}")
                elif is_runtime and runtime_files is not None and rel(candidate) not in runtime_files:
                    errors.append(f"runtime reference leaves bundle in {rel(source)}: {raw}")

    searchable = "\n".join(texts)
    for token in OBSOLETE_TEXT_TOKENS:
        if token in searchable:
            errors.append(f"obsolete path reference still exists: {token}")
    for token in REFERENCE_TOKENS:
        if token not in searchable:
            errors.append(f"current path is undocumented: {token}")


def check_evals(errors: list[str]) -> None:
    """Validate the executable evaluation contract, not model performance."""
    try:
        data = json.loads((ROOT / "evals/evals.json").read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        errors.append(f"evals.json is unreadable: {exc}")
        return
    if not isinstance(data, dict) or data.get("skill_name") != "enterprise-frontend":
        errors.append("evals.json must be an object with skill_name enterprise-frontend")
        return
    cases = data.get("evals")
    if not isinstance(cases, list) or not cases:
        errors.append("evals must be a non-empty array")
        return
    seen = set()
    for index, case in enumerate(cases, 1):
        label = f"eval case {index}"
        if not isinstance(case, dict):
            errors.append(f"{label} must be an object")
            continue
        identity = case.get("id")
        if type(identity) is not int or identity <= 0 or identity in seen:
            errors.append(f"{label} id must be a unique positive integer")
        else:
            seen.add(identity)
        for field in ("prompt", "expected_output"):
            if not isinstance(case.get(field), str) or not case[field].strip():
                errors.append(f"{label} {field} must be a non-empty string")
        expectations = case.get("expectations")
        if (not isinstance(expectations, list) or not expectations
                or any(not isinstance(item, str) or not item.strip() for item in expectations)):
            errors.append(f"{label} expectations must be non-empty strings")
        files = case.get("files")
        if not isinstance(files, list):
            errors.append(f"{label} files must be an array")
            continue
        for raw in files:
            if not isinstance(raw, str) or not raw:
                errors.append(f"{label} fixture must be a non-empty path")
                continue
            path = PurePosixPath(raw)
            if (not path.parts or path.is_absolute() or ".." in path.parts
                    or "\\" in raw or ":" in raw or str(path) != raw
                    or any(ord(char) < 32 or ord(char) == 127 for char in raw)):
                errors.append(f"{label} missing or unsafe fixture: {raw!r}")
                continue
            try:
                candidate = (ROOT / raw).resolve()
                valid = ROOT in candidate.parents and candidate.is_file()
            except (OSError, ValueError, RuntimeError) as exc:
                errors.append(f"{label} cannot resolve fixture: {raw!r}: {exc}")
                continue
            if not valid:
                errors.append(f"{label} missing or unsafe fixture: {raw!r}")


def check_index(errors: list[str]) -> None:
    try:
        expected = render_index(ROOT / "references/antd/llms-full.txt")
        actual = (ROOT / "references/antd/llms-index.md").read_text(encoding="utf-8")
        if actual != expected:
            errors.append("Ant Design index is stale; run python3 scripts/index_antd.py --write")
    except (OSError, ValueError) as exc:
        errors.append(f"Ant Design index validation failed: {exc}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.parse_args()
    errors: list[str] = []

    actual_root = {
        path.name
        for path in ROOT.iterdir()
        if path.name not in LOCAL_STATE
    }
    unexpected = sorted(actual_root - ROOT_ALLOWED)
    if unexpected:
        errors.append(f"unexpected root entries: {', '.join(unexpected)}")

    for required in sorted(REQUIRED_PATHS):
        if not (ROOT / required).is_file():
            errors.append(f"required path missing: {required}")
    for obsolete in sorted(OBSOLETE_PATHS):
        if (ROOT / obsolete).exists():
            errors.append(f"obsolete path still exists: {obsolete}")

    manifest = load_manifest(errors)
    if manifest and isinstance(manifest.get("runtime"), list):
        entries = [str(item) for item in manifest["runtime"]]
        expected = expected_runtime_files(entries)
        with tempfile.TemporaryDirectory(prefix="enterprise-frontend-validate-") as tmp:
            bundle = Path(tmp) / "enterprise-frontend"
            result = subprocess.run(
                [sys.executable, str(ROOT / "scripts/package_skill.py"), "--dest", str(bundle)],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False,
            )
            if result.returncode:
                errors.append(f"packager failed: {result.stderr.strip()}")
            else:
                actual = collect_files(bundle)
                if actual != expected:
                    missing = expected - actual
                    extra = actual - expected
                    errors.append(f"bundle mismatch; missing={sorted(missing)}, extra={sorted(extra)}")
            for forbidden in RUNTIME_FORBIDDEN:
                if (bundle / forbidden).exists():
                    errors.append(f"maintenance path leaked into runtime bundle: {forbidden}")

    check_references(errors)
    check_evals(errors)
    check_index(errors)

    if errors:
        print("Project validation failed:", file=sys.stderr)
        for error in sorted(set(errors)):
            print(f"- {error}", file=sys.stderr)
        return 1

    print("Project validation passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
