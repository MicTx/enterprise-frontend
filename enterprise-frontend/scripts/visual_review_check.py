#!/usr/bin/env python3
"""visual_review_check.py — 视觉审查证据包（visual-review.json）校验器。

把 references/visual-review.md 的协议语义落成可执行规则：
- 重试两级：classify_retry_outcomes（采集稳定/判定重试共用）与 decide_verdict；
  混合结果 = flaky，flaky 不得推进基线；
- 聚簇只排序：should_auto_exclude_cluster 恒 False；
- 透明资产保留 alpha：alpha_aware_equal 对同 RGB 异 alpha 判不等；
- 证据包 schema：level 分级必需字段、截图路径/哈希、verdict 一致性。

CLI：python3 scripts/visual_review_check.py <record.json> [--root DIR]
退出码：0 合法 / 1 记录非法 / 2 用法或 IO 错误。
仅标准库；不联网、不渲染页面。
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

LEVELS = ("observation", "runtime-confirmed", "fix-reverified")
MODES = ("review", "verify")
VERDICTS = ("pass", "fail", "flaky", "needs-evidence", "not-run")
STATUSES = ("open", "fixed", "accepted", "needs-evidence")
RETRY_RESULTS = ("pass", "fail")
SCREENSHOT_FORMATS = ("png", "jpeg", "jpg", "webp")
ENV_FIELDS = ("viewport", "dpr", "browser", "os", "font_env", "engine")
TOP_KEYS = {
    "schema_version",
    "review_id",
    "mode",
    "level",
    "target",
    "environment",
    "screenshots",
    "findings",
    "masks",
    "baselines",
    "coverage",
    "retries",
    "verdict",
}


def classify_retry_outcomes(results) -> str:
    """按布尔结果序列分类：全 pass / 全 fail / 混合 flaky / 空 not-run。"""
    results = list(results)
    if not results:
        return "not-run"
    if all(results):
        return "pass"
    if not any(results):
        return "fail"
    return "flaky"


def decide_verdict(classification: str, observed_regression: bool = False) -> str:
    """由重试分类给出 verdict；混合结果恒 flaky/needs-evidence。"""
    if classification == "flaky":
        return "flaky"
    if classification == "fail":
        return "fail"
    if classification == "pass" and not observed_regression:
        return "pass"
    return "needs-evidence"


def can_update_baseline(verdict: str) -> bool:
    """只有 pass 允许推进基线；flaky/fail/needs-evidence/not-run 一律禁止。"""
    return verdict == "pass"


def should_auto_exclude_cluster(*args, **kwargs) -> bool:
    """聚簇度只用于排序与复核候选，不得自动排除任何差异。"""
    return False


def alpha_aware_equal(rgba_a, rgba_b) -> bool:
    """同 RGB 不同 alpha 判不等；三通道输入退化为 RGB 比较。"""
    a, b = tuple(rgba_a), tuple(rgba_b)
    if len(a) == 4 and len(b) == 4:
        return a == b
    return a[:3] == b[:3]


def _clean_relpath(value) -> str | None:
    if not isinstance(value, str) or not value.strip():
        return None
    if "\\" in value or value.startswith("/") or value.startswith("~"):
        return None
    parts = value.split("/")
    if any(part in {"", ".", ".."} for part in parts):
        return None
    return value


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _validate_screenshots(record: dict, root: Path, errors: list[str]) -> None:
    screenshots = record.get("screenshots")
    if not isinstance(screenshots, list) or not screenshots:
        errors.append("screenshots must be a non-empty list")
        return
    seen_steps: set[str] = set()
    seen_images: set[tuple[str, str]] = set()
    for index, shot in enumerate(screenshots):
        label = f"screenshots[{index}]"
        if not isinstance(shot, dict):
            errors.append(f"{label} must be an object")
            continue
        rel = _clean_relpath(shot.get("path"))
        if rel is None:
            errors.append(f"{label}.path must be a safe relative path")
            continue
        target = root / rel
        if not target.is_file():
            errors.append(f"{label}.path does not exist under root: {rel}")
            continue
        digest = shot.get("sha256")
        if not isinstance(digest, str) or len(digest) != 64:
            errors.append(f"{label}.sha256 must be a 64-char hex digest")
            digest_value = ""
        elif _sha256(target) != digest.lower():
            errors.append(f"{label}.sha256 does not match file content")
            digest_value = digest.lower()
        else:
            digest_value = digest.lower()
        seen_images.add((rel, digest_value))
        fmt = shot.get("format")
        if fmt not in SCREENSHOT_FORMATS:
            errors.append(f"{label}.format must be one of {SCREENSHOT_FORMATS}")
        step = shot.get("step")
        if not isinstance(step, str) or not step:
            errors.append(f"{label}.step must be a non-empty string")
        else:
            seen_steps.add(step)
    level = record.get("level")
    if level == "fix-reverified":
        if len(seen_steps) < 2:
            errors.append("fix-reverified requires at least two distinct screenshot steps (before/after)")
        if len(seen_images) < 2:
            errors.append("fix-reverified requires at least two distinct screenshot images (before/after)")
        labels = {step.lower().split(":", 1)[0] for step in seen_steps}
        if "before" not in labels or "after" not in labels:
            errors.append("fix-reverified requires at least one before and one after screenshot step")


def _validate_level_requirements(record: dict, errors: list[str]) -> None:
    level = record.get("level")
    if level in ("runtime-confirmed", "fix-reverified"):
        environment = record.get("environment")
        if not isinstance(environment, dict):
            errors.append("environment must be an object for runtime evidence levels")
            return
        for field in ENV_FIELDS:
            value = environment.get(field)
            if value is None or (isinstance(value, str) and not value.strip()):
                errors.append(f"environment.{field} is required for level {level}")


def _validate_retries(record: dict, errors: list[str]) -> None:
    retries = record.get("retries")
    if not isinstance(retries, dict):
        errors.append("retries must be an object")
        return
    attempts = retries.get("attempts")
    if not isinstance(attempts, list) or not attempts:
        errors.append("retries.attempts must be a non-empty list")
        return
    outcomes: list[bool] = []
    for index, attempt in enumerate(attempts):
        if not isinstance(attempt, dict):
            errors.append(f"retries.attempts[{index}] must be an object")
            outcomes.append(False)
            continue
        result = attempt.get("result")
        if result not in RETRY_RESULTS:
            errors.append(f"retries.attempts[{index}].result must be pass|fail")
            outcomes.append(False)
            continue
        outcomes.append(result == "pass")
    classification = retries.get("classification")
    expected = classify_retry_outcomes(outcomes)
    if classification != expected:
        errors.append(f"retries.classification must be {expected} (got {classification!r})")
    verdict = record.get("verdict")
    if verdict == "pass" and expected != "pass":
        errors.append("verdict pass requires retries.classification pass")


def validate_record(record, root: Path) -> list[str]:
    errors: list[str] = []
    if not isinstance(record, dict):
        return ["record must be a JSON object"]
    unknown = sorted(set(record) - TOP_KEYS)
    if unknown:
        errors.append(f"unknown top-level fields: {', '.join(unknown)}")
    if record.get("schema_version") != 1:
        errors.append("schema_version must be 1")
    if record.get("mode") not in MODES:
        errors.append(f"mode must be one of {MODES}")
    level = record.get("level")
    if level not in LEVELS:
        errors.append(f"level must be one of {LEVELS}")
    verdict = record.get("verdict")
    if verdict not in VERDICTS:
        errors.append(f"verdict must be one of {VERDICTS}")
    review_id = record.get("review_id")
    if not isinstance(review_id, str) or not review_id.strip():
        errors.append("review_id must be a non-empty string")
    findings = record.get("findings")
    if not isinstance(findings, list):
        errors.append("findings must be a list")
    else:
        for index, finding in enumerate(findings):
            label = f"findings[{index}]"
            if not isinstance(finding, dict):
                errors.append(f"{label} must be an object")
                continue
            for field in ("id", "category", "observed", "rule_ref"):
                if not isinstance(finding.get(field), str) or not finding[field].strip():
                    errors.append(f"{label}.{field} must be a non-empty string")
            status = finding.get("status")
            if status not in STATUSES:
                errors.append(f"{label}.status must be one of {STATUSES}")
            finding_level = finding.get("level", level)
            if finding_level not in LEVELS:
                errors.append(f"{label}.level must be one of {LEVELS}")
            if status in ("open", "needs-evidence") and verdict == "pass":
                errors.append(f"verdict pass requires {label}.status to be fixed/accepted (got {status})")
            if level == "fix-reverified" and status in STATUSES and status != "fixed":
                errors.append(f"fix-reverified requires {label}.status fixed (got {status})")
    _validate_screenshots(record, root, errors)
    _validate_level_requirements(record, errors)
    _validate_retries(record, errors)
    return errors


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Validate a visual-review evidence package.")
    parser.add_argument("record", help="path to visual-review.json")
    parser.add_argument("--root", default=".", help="root directory for relative screenshot paths")
    args = parser.parse_args(argv)
    record_path = Path(args.record)
    root = Path(args.root)
    if not record_path.is_file():
        print(f"usage error: record not found: {record_path}", file=sys.stderr)
        return 2
    if not root.is_dir():
        print(f"usage error: root not found: {root}", file=sys.stderr)
        return 2
    try:
        record = json.loads(record_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"usage error: record unreadable: {exc}", file=sys.stderr)
        return 2
    errors = validate_record(record, root)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        print("RESULT: invalid")
        return 1
    print("RESULT: ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
