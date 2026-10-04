#!/usr/bin/env python3
"""Regression tests for enterprise-frontend packaging, validation, and installation tooling."""

from __future__ import annotations

import importlib.util
import json
import os
import shutil
import subprocess
import sys
import tarfile
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
PACKAGER_PATH = ROOT / "scripts" / "package_skill.py"
RELEASE_PATH = ROOT / "scripts" / "build_release.py"
VALIDATOR_PATH = ROOT / "scripts" / "validate_project.py"
INSTALLER_PATH = ROOT / "install.sh"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load module from {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


package_skill = load_module("enterprise_frontend_package_skill", PACKAGER_PATH)
build_release = load_module("enterprise_frontend_build_release", RELEASE_PATH)
validate_project = load_module("scripts.enterprise_frontend_validate_project", VALIDATOR_PATH)


class PackageSkillTests(unittest.TestCase):
    def test_normalize_destination_rejects_parent_symlink_into_source(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            linked_source = Path(tmp) / "linked-source"
            linked_source.symlink_to(ROOT, target_is_directory=True)

            with self.assertRaisesRegex(package_skill.PackageError, "source repository"):
                package_skill.normalize_destination(linked_source / "enterprise-frontend", "enterprise-frontend")

    def test_normalize_destination_keeps_final_symlink_unresolved(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            target = base / "elsewhere"
            target.mkdir()
            destination = base / "enterprise-frontend"
            destination.symlink_to(target, target_is_directory=True)

            normalized = package_skill.normalize_destination(destination, "enterprise-frontend")

            self.assertEqual(normalized, destination.parent.resolve() / destination.name)

    def test_replace_destination_cleans_previous_root_when_initial_move_fails(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            destination = base / "enterprise-frontend"
            destination.mkdir()
            staging = base / ".enterprise-frontend.staging-test"
            staging.mkdir()

            with mock.patch.object(package_skill.os, "replace", side_effect=OSError("move failed")), \
                 self.assertRaisesRegex(OSError, "move failed"):
                package_skill._replace_destination(staging, destination)

            self.assertTrue(destination.exists())
            self.assertEqual(list(base.glob(".enterprise-frontend.previous-*")), [])

    def test_replace_destination_restores_previous_bundle_on_commit_failure(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            destination = base / "enterprise-frontend"
            destination.mkdir()
            (destination / "old.txt").write_text("old", encoding="utf-8")
            staging = base / ".enterprise-frontend.staging-test"
            staging.mkdir()
            (staging / "new.txt").write_text("new", encoding="utf-8")
            real_replace = package_skill.os.replace
            calls = 0

            def fail_second_replace(source, target):
                nonlocal calls
                calls += 1
                if calls == 2:
                    raise OSError("simulated commit failure")
                return real_replace(source, target)

            with mock.patch.object(package_skill.os, "replace", side_effect=fail_second_replace), \
                 self.assertRaisesRegex(OSError, "simulated commit failure"):
                package_skill._replace_destination(staging, destination)

            self.assertEqual((destination / "old.txt").read_text(encoding="utf-8"), "old")
            self.assertTrue(staging.exists(), "caller must retain staging for its cleanup path")
            self.assertEqual(list(base.glob(".enterprise-frontend.previous-*")), [])

    def test_replace_destination_preserves_previous_bundle_when_restore_fails(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            destination = base / "enterprise-frontend"
            destination.mkdir()
            (destination / "old.txt").write_text("old", encoding="utf-8")
            staging = base / ".enterprise-frontend.staging-test"
            staging.mkdir()
            real_replace = package_skill.os.replace
            calls = 0

            def fail_commit_and_restore(source, target):
                nonlocal calls
                calls += 1
                if calls >= 2:
                    raise OSError(f"simulated replace failure {calls}")
                return real_replace(source, target)

            with mock.patch.object(package_skill.os, "replace", side_effect=fail_commit_and_restore), \
                 self.assertRaisesRegex(package_skill.PackageError, "preserved at") as raised:
                package_skill._replace_destination(staging, destination)

            preserved = Path(str(raised.exception).split("preserved at ", 1)[1])
            self.assertEqual((preserved / "old.txt").read_text(encoding="utf-8"), "old")
            self.assertFalse(destination.exists())

    def test_build_bundle_replaces_dangling_destination_symlink(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            destination = Path(tmp) / "enterprise-frontend"
            destination.symlink_to(Path(tmp) / "missing", target_is_directory=True)

            result = package_skill.build_bundle(destination)

            self.assertEqual(result, destination.parent.resolve() / destination.name)
            self.assertTrue((destination / "SKILL.md").is_file())
            self.assertFalse(destination.is_symlink())

    def test_invalid_manifests_fail_with_package_error(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "SKILL.md").write_text("skill")
            (root / "references").mkdir()
            invalid = [[], None, 7, "text", {},
                       {"schemaVersion": True, "skill": "enterprise-frontend", "runtime": ["SKILL.md"]},
                       {"schemaVersion": 1, "skill": "enterprise-frontend", "version": "1.0",
                        "runtime": ["SKILL.md"]}]
            for entries in (["."], ["../escape"], ["/etc"], ["C:/temp"],
                            ["references\\outside"], ["references/../SKILL.md"],
                            ["SKILL.md", "SKILL.md"], ["README.md"], ["references"],
                            ["references", "references/a"], ["SKILL.md", 1]):
                invalid.append({"schemaVersion": 1, "skill": "enterprise-frontend",
                                "version": "0.1.0", "runtime": entries})
            for value in invalid:
                with self.subTest(value=value):
                    (root / "manifest.json").write_text(json.dumps(value))
                    with self.assertRaises(package_skill.PackageError):
                        package_skill.load_manifest(root)

    def test_manifest_rejects_link_ancestor_and_special_file(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "SKILL.md").write_text("skill")
            outside = root / "outside"
            outside.mkdir()
            (outside / "guide.md").write_text("guide")
            (root / "references").symlink_to(outside, target_is_directory=True)
            manifest = {"schemaVersion": 1, "skill": "enterprise-frontend", "version": "0.1.0",
                        "runtime": ["SKILL.md", "references/guide.md"]}
            (root / "manifest.json").write_text(json.dumps(manifest))
            with self.assertRaisesRegex(package_skill.PackageError, "symlink ancestor"):
                package_skill.load_manifest(root)
            (root / "references").unlink()
            (root / "references").mkdir()
            os.mkfifo(root / "references/guide.md")
            with self.assertRaisesRegex(package_skill.PackageError, "unsupported"):
                package_skill.load_manifest(root)

    def test_build_failure_does_not_replace_old_bundle_or_leak_staging(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            dest = Path(tmp) / "enterprise-frontend"
            dest.mkdir()
            (dest / "old").write_text("keep")
            with mock.patch.object(package_skill, "copy_entry", side_effect=OSError("copy failure")), \
                 self.assertRaisesRegex(OSError, "copy failure"):
                package_skill.build_bundle(dest)
            self.assertEqual((dest / "old").read_text(), "keep")
            self.assertEqual(list(Path(tmp).glob(".enterprise-frontend.*")), [])


class BuildReleaseTests(unittest.TestCase):
    def test_default_output_is_repo_dist(self) -> None:
        self.assertEqual(build_release.DEFAULT_DIST, ROOT / "dist")

    def test_read_version_returns_semver(self) -> None:
        version = build_release.read_version(ROOT)
        parts = version.split(".")
        self.assertEqual(len(parts), 3)
        self.assertTrue(all(part.isdigit() for part in parts))

    def test_read_version_rejects_missing_or_invalid(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            with self.assertRaises(build_release.BuildError):
                build_release.read_version(root)
            (root / "manifest.json").write_text("{}", encoding="utf-8")
            with self.assertRaisesRegex(build_release.BuildError, "semver"):
                build_release.read_version(root)

    def test_extract_release_notes_finds_section(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "CHANGELOG.md").write_text(
                "## [Unreleased]\n\nstuff\n\n## [0.0.42] - 2025-01-01\n\n"
                "### Added\n- thing\n\n## [0.0.1]\n\nold\n",
                encoding="utf-8",
            )
            notes = build_release.extract_release_notes(root, "0.0.42")
            self.assertIn("[0.0.42]", notes)
            self.assertIn("thing", notes)
            self.assertNotIn("old", notes)
            self.assertIn("9.9.9", build_release.extract_release_notes(root, "9.9.9"))

    def test_compute_tree_sha256_tracks_content_and_executable_mode(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "a.txt").write_text("a\n", encoding="utf-8")
            script = root / "run.sh"
            script.write_text("#!/bin/sh\n", encoding="utf-8")
            initial = build_release.compute_tree_sha256(root)
            self.assertEqual(initial, build_release.compute_tree_sha256(root))
            script.chmod(script.stat().st_mode | 0o100)
            executable = build_release.compute_tree_sha256(root)
            self.assertNotEqual(executable, initial)
            (root / "a.txt").write_text("changed\n", encoding="utf-8")
            self.assertNotEqual(build_release.compute_tree_sha256(root), executable)

    def test_build_produces_artifacts(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            dist = Path(tmp) / "dist"
            result = subprocess.run(
                [sys.executable, str(RELEASE_PATH), "--output", str(dist), "--skip-checks"],
                cwd=ROOT,
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            version = build_release.read_version(ROOT)
            archive_name = f"enterprise-frontend-{version}"
            tarball = dist / f"{archive_name}.tar.gz"
            zip_file = dist / f"{archive_name}.zip"
            sums = dist / "SHA256SUMS"
            notes = dist / "RELEASE_NOTES.md"
            self.assertTrue(tarball.is_file())
            self.assertTrue(zip_file.is_file())
            self.assertTrue(sums.is_file())
            self.assertTrue(notes.is_file())
            self.assertIn(f"{archive_name}.tar.gz", sums.read_text(encoding="utf-8"))
            self.assertIn(f"{archive_name}.zip", sums.read_text(encoding="utf-8"))
            for line in sums.read_text(encoding="utf-8").strip().splitlines():
                digest, _sep, filename = line.partition("  ")
                self.assertEqual(digest, build_release.compute_sha256(dist / filename))

            expected = validate_project.expected_runtime_files(
                package_skill.load_manifest()["runtime"]
            )
            with tarfile.open(tarball) as tar:
                members = {member.name: member for member in tar.getmembers()}
                self.assertIn(f"{archive_name}/VERSION", members)
                self.assertIn(f"{archive_name}/BUILD_INFO", members)
                self.assertIn(f"{archive_name}/SKILL.md", members)
                self.assertIn(f"{archive_name}/install.sh", members)
                self.assertIn(f"{archive_name}/manifest.json", members)
                self.assertIn(f"{archive_name}/scripts/package_skill.py", members)
                self.assertTrue(members[f"{archive_name}/install.sh"].mode & 0o100)
                self.assertNotIn(f"{archive_name}/scripts/build_release.py", members)
                self.assertIn(f"{archive_name}/README.md", members)
                self.assertIn(f"{archive_name}/README.en.md", members)
                self.assertIn(f"{archive_name}/LICENSE", members)
                for relative in expected:
                    self.assertIn(f"{archive_name}/{relative}", members)

            with zipfile.ZipFile(zip_file) as archive:
                names = archive.namelist()
            self.assertIn(f"{archive_name}/VERSION", names)
            self.assertIn(f"{archive_name}/install.sh", names)
            self.assertFalse(any("build_release.py" in name for name in names))
            self.assertFalse(any("validate_project.py" in name for name in names))
            self.assertIn(f"{archive_name}/README.md", names)
            self.assertIn(f"{archive_name}/README.en.md", names)
            self.assertIn(f"{archive_name}/LICENSE", names)

    def test_build_expect_version_mismatch(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            result = subprocess.run(
                [sys.executable, str(RELEASE_PATH), "--output", str(Path(tmp) / "dist"),
                 "--skip-checks", "--expect-version", "99.99.99"],
                cwd=ROOT,
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("version mismatch", result.stderr)

    def test_ruff_failure_raises_builderror(self) -> None:
        probe = subprocess.run(
            [sys.executable, "-m", "ruff", "--version"],
            capture_output=True,
            text=True,
            check=False,
        )
        if probe.returncode != 0:
            self.skipTest("ruff not installed")
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "scripts").mkdir()
            (root / "scripts" / "_bad.py").write_text('x = f"hello"\n', encoding="utf-8")
            with self.assertRaisesRegex(build_release.BuildError, "ruff"):
                build_release._run_cmd(
                    [sys.executable, "-m", "ruff", "check", "scripts/"],
                    root,
                    "ruff",
                )


class ValidatorTests(unittest.TestCase):
    def test_markdown_link_pattern_includes_images(self) -> None:
        text = "[guide](../README.md) and ![diagram](../CHANGELOG.md)"
        self.assertEqual(
            validate_project.MARKDOWN_LINK.findall(text),
            ["../README.md", "../CHANGELOG.md"],
        )

    def test_resolve_reference_ignores_external_image(self) -> None:
        source = ROOT / "README.md"
        for target in ("https://example.com/image.png", "//cdn.example.com/image.png",
                       "mailto:maintainer@example.com", "#local-heading"):
            with self.subTest(target=target):
                self.assertIsNone(validate_project.resolve_reference(source, target))

    def test_check_references_reports_invalid_targets_and_continues(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            targets = ["https://[broken/image.png", "missing%00.md", "bad\x00.md"]
            (root / "SKILL.md").write_text(
                "\n".join(f"[bad]({target})" for target in targets)
                + "\n[missing](missing.md)\n![external](//cdn.example.com/image.png)"
            )
            errors = []
            with mock.patch.object(validate_project, "ROOT", root), \
                 mock.patch.object(validate_project, "REFERENCE_TOKENS", ()), \
                 mock.patch.object(validate_project, "OBSOLETE_TEXT_TOKENS", ()):
                validate_project.check_references(errors)
            self.assertEqual(len(errors), 4, errors)
            for target in targets:
                self.assertTrue(any(f"invalid reference in SKILL.md: {target!r}" in error
                                    for error in errors), errors)
            self.assertIn("broken local reference in SKILL.md: missing.md", errors)

    def test_check_references_reports_resolution_errors(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            (root / "SKILL.md").write_text("[guide](guide.md)")
            for failure in (OSError("permission denied"), RuntimeError("symlink loop")):
                errors = []
                with self.subTest(failure=failure), \
                     mock.patch.object(validate_project, "ROOT", root), \
                     mock.patch.object(validate_project, "REFERENCE_TOKENS", ()), \
                     mock.patch.object(validate_project, "OBSOLETE_TEXT_TOKENS", ()), \
                     mock.patch.object(validate_project, "resolve_reference", side_effect=failure):
                    validate_project.check_references(errors)
                self.assertEqual(len(errors), 1, errors)
                self.assertIn("invalid reference in SKILL.md: 'guide.md'", errors[0])
                self.assertIn(str(failure), errors[0])

    def test_check_references_ignores_markdown_literals_in_python(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            script = root / "fixture.py"
            markdown_image = "!" + "[diagram]" + "(images/missing.png)"
            script.write_text(f"FIXTURE = {markdown_image!r}\n", encoding="utf-8")
            errors: list[str] = []

            with (
                mock.patch.object(validate_project, "ROOT", root),
                mock.patch.object(validate_project, "REFERENCE_TOKENS", ()),
                mock.patch.object(validate_project, "OBSOLETE_TEXT_TOKENS", ()),
            ):
                validate_project.check_references(errors)

            self.assertEqual(errors, [])

    def test_check_references_reports_missing_local_image(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            document = root / "README.md"
            markdown_image = "!" + "[diagram]" + "(images/missing.png)"
            document.write_text(markdown_image, encoding="utf-8")
            errors: list[str] = []

            with (
                mock.patch.object(validate_project, "ROOT", root),
                mock.patch.object(validate_project, "REFERENCE_TOKENS", ()),
                mock.patch.object(validate_project, "OBSOLETE_TEXT_TOKENS", ()),
            ):
                validate_project.check_references(errors)

            self.assertEqual(
                errors,
                ["broken local reference in README.md: images/missing.png"],
            )

    def test_backup_state_is_pruned_and_skill_is_scanned(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            (root / ".install-backups/old").mkdir(parents=True)
            (root / ".install-backups/old/README.md").write_text("[old](missing.md)")
            (root / "SKILL.md").write_text("[guide](missing.md)")
            errors = []
            with mock.patch.object(validate_project, "ROOT", root), \
                 mock.patch.object(validate_project, "REFERENCE_TOKENS", ()), \
                 mock.patch.object(validate_project, "OBSOLETE_TEXT_TOKENS", ()):
                validate_project.check_references(errors)
            self.assertEqual(errors, ["broken local reference in SKILL.md: missing.md"])

    def test_runtime_link_to_maintenance_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            (root / "SKILL.md").write_text("[readme](README.md)")
            (root / "README.md").write_text("repo only")
            (root / "manifest.json").write_text(json.dumps({"schemaVersion": 1,
                "skill": "enterprise-frontend", "version": "0.1.0", "runtime": ["SKILL.md"]}))
            errors = []
            with mock.patch.object(validate_project, "ROOT", root), \
                 mock.patch.object(validate_project, "REFERENCE_TOKENS", ()), \
                 mock.patch.object(validate_project, "OBSOLETE_TEXT_TOKENS", ()):
                validate_project.check_references(errors)
            self.assertEqual(errors, ["runtime reference leaves bundle in SKILL.md: README.md"])

    def test_runtime_reference_cannot_escape_repository(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            (root / "SKILL.md").write_text("[outside](../outside.md)")
            errors = []
            with mock.patch.object(validate_project, "ROOT", root), \
                 mock.patch.object(validate_project, "REFERENCE_TOKENS", ()), \
                 mock.patch.object(validate_project, "OBSOLETE_TEXT_TOKENS", ()):
                validate_project.check_references(errors)
            self.assertEqual(errors, ["runtime reference escapes repository in SKILL.md: ../outside.md"])

    def test_invalid_eval_contracts(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            (root / "evals").mkdir()
            valid = {"id": 1, "prompt": "task", "expected_output": "output",
                     "expectations": ["behavior"], "files": []}
            cases = [None, [], {}, {"skill_name": "enterprise-frontend", "evals": []}]
            for case in (None, {**valid, "id": True}, {**valid, "files": ["../escape"]},
                         {**valid, "expectations": []}, {**valid, "prompt": ""}):
                cases.append({"skill_name": "enterprise-frontend", "evals": [case]})
            cases.append({"skill_name": "enterprise-frontend", "evals": [valid, valid]})
            for value in cases:
                with self.subTest(value=value):
                    (root / "evals/evals.json").write_text(json.dumps(value))
                    errors = []
                    with mock.patch.object(validate_project, "ROOT", root):
                        validate_project.check_evals(errors)
                    self.assertTrue(errors)

    def test_eval_fixture_rejects_control_characters(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            (root / "evals").mkdir()
            for raw in ("bad\x00.md", "bad\n.md", "bad\t.md", "bad\x7f.md"):
                with self.subTest(raw=raw):
                    case = {"id": 1, "prompt": "p", "expected_output": "e",
                            "expectations": ["e"], "files": [raw]}
                    (root / "evals/evals.json").write_text(json.dumps(
                        {"skill_name": "enterprise-frontend", "evals": [case]}))
                    errors = []
                    with mock.patch.object(validate_project, "ROOT", root):
                        validate_project.check_evals(errors)
                    self.assertEqual(len(errors), 1, errors)
                    self.assertIn("eval case 1 missing or unsafe fixture:", errors[0])
                    self.assertIn(repr(raw), errors[0])

    def test_eval_fixture_reports_resolution_errors(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            (root / "evals").mkdir()
            case = {"id": 1, "prompt": "p", "expected_output": "e",
                    "expectations": ["e"], "files": ["fixture.md"]}
            (root / "evals/evals.json").write_text(json.dumps(
                {"skill_name": "enterprise-frontend", "evals": [case]}))
            for failure in (ValueError("invalid path"), OSError("permission denied"),
                            RuntimeError("symlink loop")):
                errors = []
                with self.subTest(failure=failure), \
                     mock.patch.object(validate_project, "ROOT", root), \
                     mock.patch.object(Path, "resolve", side_effect=failure):
                    validate_project.check_evals(errors)
                self.assertEqual(len(errors), 1, errors)
                self.assertIn("eval case 1 cannot resolve fixture: 'fixture.md'", errors[0])
                self.assertIn(str(failure), errors[0])

    def test_eval_fixture_accepts_local_file_and_rejects_symlink_escape(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp).resolve()
            root = base / "repo"
            (root / "evals").mkdir(parents=True)
            (root / "fixture with spaces.md").write_text("fixture")
            (base / "outside.md").write_text("outside")
            (root / "escape.md").symlink_to(base / "outside.md")
            for raw, valid in (("fixture with spaces.md", True), ("escape.md", False)):
                with self.subTest(raw=raw):
                    case = {"id": 1, "prompt": "p", "expected_output": "e",
                            "expectations": ["e"], "files": [raw]}
                    (root / "evals/evals.json").write_text(json.dumps(
                        {"skill_name": "enterprise-frontend", "evals": [case]}))
                    errors = []
                    with mock.patch.object(validate_project, "ROOT", root):
                        validate_project.check_evals(errors)
                    self.assertEqual(not errors, valid, errors)

    def test_validator_cli_reports_malformed_inputs_without_traceback(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "repo"
            for relative in validate_project.REQUIRED_PATHS:
                destination = root / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(ROOT / relative, destination)
            with (root / "SKILL.md").open("a", encoding="utf-8") as document:
                document.write("\n[bad](https://[broken/image.png)\n[bad](missing%00.md)\n")
            (root / "evals/evals.json").write_text(json.dumps({
                "skill_name": "enterprise-frontend", "evals": [{
                    "id": 1, "prompt": "p", "expected_output": "e",
                    "expectations": ["e"], "files": ["bad\x00.md"],
                }],
            }))
            result = subprocess.run(
                [sys.executable, "-B", str(root / "scripts/validate_project.py")],
                cwd=root, text=True, capture_output=True, check=False, timeout=30,
            )
            self.assertEqual(result.returncode, 1, result.stderr)
            self.assertIn("Project validation failed:", result.stderr)
            self.assertIn("invalid reference in SKILL.md", result.stderr)
            self.assertIn("eval case 1 missing or unsafe fixture", result.stderr)
            self.assertNotIn("Traceback", result.stderr)

    def test_index_detects_content_drift_without_offset_change(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            folder = root / "references/antd"
            folder.mkdir(parents=True)
            shutil.copy2(ROOT / "references/antd/llms-full.txt", folder / "llms-full.txt")
            shutil.copy2(ROOT / "references/antd/llms-index.md", folder / "llms-index.md")
            errors = []
            with mock.patch.object(validate_project, "ROOT", root):
                validate_project.check_index(errors)
                self.assertEqual(errors, [])
                mirror = folder / "llms-full.txt"
                mirror.write_text(mirror.read_text().replace("Ant Design Component", "Ant Design Changed", 1))
                validate_project.check_index(errors)
            self.assertTrue(any("stale" in error for error in errors))


class InstallerTests(unittest.TestCase):
    def run_installer(
        self,
        home: Path,
        *args: str,
        path_prefix: Path | None = None,
        extra_env: dict[str, str] | None = None,
        only: bool = True,
    ) -> subprocess.CompletedProcess[str]:
        environment = os.environ.copy()
        environment.update(
            {
                "HOME": str(home),
                "CODEX_HOME": str(home / ".codex"),
                "CLAUDE_HOME": str(home / ".claude"),
                "BACKUP_ROOT": str(home / "backups"),
            }
        )
        environment.update(extra_env or {})
        if path_prefix is not None:
            environment["PATH"] = f"{path_prefix}{os.pathsep}{environment['PATH']}"
        return subprocess.run(
            ["bash", str(INSTALLER_PATH), *(["--codex-only"] if only else []), *args],
            cwd=ROOT,
            env=environment,
            text=True,
            capture_output=True,
            check=False,
        )

    def test_installer_restores_backup_after_partial_commit_failure(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp)
            destination = home / ".codex" / "skills" / "enterprise-frontend"
            destination.mkdir(parents=True)
            (destination / "old.txt").write_text("old", encoding="utf-8")
            wrappers = home / "wrappers"
            wrappers.mkdir()
            real_mv = shutil.which("mv")
            self.assertIsNotNone(real_mv)
            mv_wrapper = wrappers / "mv"
            mv_wrapper.write_text(
                "#!/usr/bin/env bash\n"
                "if [[ \"${1:-}\" == */enterprise-frontend && \"${1:-}\" == */.enterprise-frontend-candidate.*/* ]]; then\n"
                "  mkdir -p \"$2\"\n"
                "  printf partial >\"$2/partial.txt\"\n"
                "  exit 73\n"
                "fi\n"
                f"exec {real_mv!r} \"$@\"\n",
                encoding="utf-8",
            )
            mv_wrapper.chmod(0o755)

            result = self.run_installer(home, path_prefix=wrappers)

            self.assertNotEqual(result.returncode, 0)
            self.assertIn("restoring previous installation", result.stderr)
            self.assertEqual((destination / "old.txt").read_text(encoding="utf-8"), "old")
            self.assertFalse((destination / "partial.txt").exists())

    def test_failed_first_install_removes_partial_destination(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp)
            wrappers = home / "bin"
            wrappers.mkdir()
            wrapper = wrappers / "mv"
            wrapper.write_text("#!/bin/bash\n"
                "if [[ $1 == */.enterprise-frontend-candidate.*/* ]]; then\n"
                "mkdir -p \"$2\"; touch \"$2/partial\"; exit 73\nfi\n"
                + f"exec {shutil.which('mv')!r} \"$@\"\n")
            wrapper.chmod(0o755)
            result = self.run_installer(home, path_prefix=wrappers)
            self.assertNotEqual(result.returncode, 0)
            self.assertFalse((home / ".codex/skills/enterprise-frontend").exists())
            self.assertEqual(list(home.rglob(".enterprise-frontend-candidate.*")), [])

    def test_all_targets_get_exact_bundle_and_only_overrides_extras(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp)
            result = self.run_installer(home, "--all", only=False)
            self.assertEqual(result.returncode, 0, result.stderr)
            bundles = list(home.rglob("skills/enterprise-frontend"))
            self.assertEqual(len(bundles), 12)
            expected = validate_project.expected_runtime_files(package_skill.load_manifest()["runtime"])
            for bundle in bundles:
                self.assertEqual(validate_project.collect_files(bundle), expected)
                for relative in expected:
                    self.assertEqual((bundle / relative).read_bytes(), (ROOT / relative).read_bytes())
            self.assertEqual(list(home.rglob(".enterprise-frontend-candidate.*")), [])
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp)
            result = self.run_installer(home, "--all")
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(len(list(home.rglob("skills/enterprise-frontend"))), 1)

    def test_installer_rejects_parent_symlink_into_source(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp)
            fake_codex = home / ".codex"
            fake_codex.symlink_to(ROOT, target_is_directory=True)

            result = self.run_installer(home, "--no-backup")

            self.assertNotEqual(result.returncode, 0)
            self.assertIn("source repository", result.stderr)
            self.assertTrue((ROOT / "SKILL.md").is_file())

    def test_installer_replaces_dangling_destination_symlink(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp)
            destination = home / ".codex" / "skills" / "enterprise-frontend"
            destination.parent.mkdir(parents=True)
            destination.symlink_to(home / "missing", target_is_directory=True)

            result = self.run_installer(home, "--no-backup")

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue((destination / "SKILL.md").is_file())
            self.assertFalse(destination.is_symlink())

    def test_installer_replaces_existing_installation_without_backup(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp)
            destination = home / ".codex" / "skills" / "enterprise-frontend"
            destination.mkdir(parents=True)
            (destination / "old.txt").write_text("old", encoding="utf-8")

            result = self.run_installer(home, "--no-backup")

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue((destination / "SKILL.md").is_file())
            self.assertFalse((destination / "old.txt").exists())
            self.assertEqual(list(destination.parent.glob(".enterprise-frontend.rollback.*")), [])

    def test_installer_backs_up_previous_installation(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp)
            destination = home / ".codex" / "skills" / "enterprise-frontend"
            destination.mkdir(parents=True)
            (destination / "old.txt").write_text("old", encoding="utf-8")

            result = self.run_installer(home)

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue((destination / "SKILL.md").is_file())
            backups = list((home / "backups").glob("codex-enterprise-frontend.*/previous"))
            self.assertEqual(len(backups), 1)
            self.assertEqual((backups[0] / "old.txt").read_text(encoding="utf-8"), "old")

    def test_dry_run_writes_nothing_and_all_includes_pi(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp)
            result = self.run_installer(home, "--all", "--dry-run", only=False)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn(str(home / ".pi/agent/skills/enterprise-frontend"), result.stdout)
            self.assertEqual(list(home.iterdir()), [])

    def test_detected_pi_installs_and_no_extras_does_not(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp)
            (home / ".pi/agent").mkdir(parents=True)
            result = self.run_installer(home, "--no-extras", only=False)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertFalse((home / ".pi/agent/skills").exists())
            result = self.run_installer(home, only=False)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue((home / ".pi/agent/skills/enterprise-frontend/SKILL.md").is_file())

    def test_up_to_date_and_force_leave_no_candidate(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp)
            for args in ((), (), ("--force",)):
                result = self.run_installer(home, *args)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(list(home.rglob(".enterprise-frontend-candidate.*")), [])
            self.assertEqual(len(list((home / "backups").glob("*/previous"))), 1)

    def test_failed_packager_cleans_candidate(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp)
            wrappers = home / "bin"
            wrappers.mkdir()
            python = wrappers / "python3"
            python.write_text("#!/bin/bash\nif [[ $1 == */package_skill.py ]]; then exit 73; fi\n"
                              + f"exec {shutil.which('python3')!r} \"$@\"\n")
            python.chmod(0o755)
            result = self.run_installer(home, path_prefix=wrappers)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(list(home.rglob(".enterprise-frontend-candidate.*")), [])

    def test_backup_inside_destination_is_rejected_without_data_loss(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp)
            dest = home / ".codex/skills/enterprise-frontend"
            dest.mkdir(parents=True)
            (dest / "old").write_text("keep")
            result = self.run_installer(home, extra_env={"BACKUP_ROOT": str(dest / "backups")})
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("backup root must not", result.stderr)
            self.assertEqual((dest / "old").read_text(), "keep")
            self.assertEqual(list(home.rglob(".enterprise-frontend-candidate.*")), [])


if __name__ == "__main__":
    unittest.main()
