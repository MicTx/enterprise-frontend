#!/usr/bin/env python3
"""ban_scan.py — 禁令静态检查（D7 最小化：只做禁令级模式匹配）。

规则表 scripts/ban_rules.json（schema v1）与 references/engineering.md 全局禁令表
B1–B7 逐 ID 同源；B7 以 scan:false 显式在场（不扫的禁令也在表内，ID 集合可机械
比对）。逻辑与规则数据分离：规则表供 P5 与 engineering.md 机械比对。

不做结构推断、不做数据流分析、不追求 AST 精度；误报优先通过扫描面收窄消除，
残余风险如实记录，findings 由人裁定。规则表与文档冲突时以 engineering.md 为准
回改规则表（放宽规则表 = 文档侧评审动作，不在本工具内自助修改）。

扫描面：CLI 目标路径（默认仓库根）；文件类 = code（.ts .tsx .js .jsx .mjs .cjs）
+ style（.less .css）+ deps（任意深度 package.json）。永久排除：node_modules/、
.umi*/、dist/、coverage/、.git/、package-lock.json、*.min.*、二进制、单文件 >2MB。
.md 与非 package 的 .json 不扫（禁令是代码约束，文档行文提及属说明文字）。

输出：默认人读按规则分组逐条 {rule_id, path, line, snippet≤120} + 计数汇总 +
末行 RESULT；--json 输出 {status, counts, findings}。退出码：0 干净 / 1 存在
findings / 2 用法或 IO 错误（规则表缺失或 schema 不识、目标路径不存在）。
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

CODE_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"}
STYLE_EXTENSIONS = {".less", ".css"}
EXCLUDED_DIR_NAMES = {"node_modules", "dist", "coverage", ".git"}
EXCLUDED_DIR_PREFIXES = (".umi",)
EXCLUDED_FILE_NAMES = {"package-lock.json"}
MAX_FILE_BYTES = 2 * 1024 * 1024
SNIPPET_MAX_CHARS = 120

DEFAULT_RULES_PATH = Path(__file__).resolve().parent / "ban_rules.json"

STATIC_IMPORT_RE = re.compile(r"import\s+(?:[\w*$\s,{}]*?\s+from\s+)?['\"]([^'\"]+)['\"]")
DYNAMIC_IMPORT_RE = re.compile(r"import\(\s*['\"]([^'\"]+)['\"]\s*\)")
REQUIRE_RE = re.compile(r"require\(\s*['\"]([^'\"]+)['\"]\s*\)")
NAMED_IMPORT_CLAUSE_RE_TPL = r"import\s[^;]*?from\s*['\"]{module}['\"]"
COMMENT_LINE_PREFIXES = ("//", "/*", "*")


class UsageError(Exception):
    """用法/IO 错误——对应退出码 2。"""


def load_rules(path: Path) -> list[dict]:
    if not path.is_file():
        raise UsageError(f"规则表不存在: {path}")
    try:
        table = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise UsageError(f"规则表无法解析: {exc}") from exc
    if not isinstance(table, dict) or table.get("schema_version") != 1:
        raise UsageError("规则表 schema 不识: schema_version 必须为 1")
    rules = table.get("rules")
    if not isinstance(rules, list):
        raise UsageError("规则表 schema 不识: rules 必须为数组")
    ids = [rule.get("id") for rule in rules]
    if len(set(ids)) != len(ids):
        raise UsageError("规则表 schema 不识: 规则 ID 重复")
    return rules


def iter_target_files(root: Path):
    """按扫描面收集 (path, fileclass)；确定性：目录与文件名排序。"""
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(
            d for d in dirnames
            if d not in EXCLUDED_DIR_NAMES and not d.startswith(EXCLUDED_DIR_PREFIXES)
        )
        for name in sorted(filenames):
            path = Path(dirpath) / name
            if name in EXCLUDED_FILE_NAMES or ".min." in name:
                continue
            try:
                if path.stat().st_size > MAX_FILE_BYTES:
                    continue
            except OSError:
                continue
            suffix = path.suffix.lower()
            if name == "package.json":
                yield path, "deps"
            elif suffix in CODE_EXTENSIONS:
                yield path, "code"
            elif suffix in STYLE_EXTENSIONS:
                yield path, "style"


def read_source(path: Path) -> str:
    with path.open("rb") as fh:
        head = fh.read(8192)
    if b"\0" in head:
        return ""  # 二进制：不出现在扫描面语义内
    with path.open("rb") as fh:
        return fh.read().decode("utf-8", errors="replace").replace("\r\n", "\n")


def module_matches(specifier: str, params: dict) -> bool:
    """import 说明符匹配：精确或子路径（m、m/…）；前缀变体（@scope/）。"""
    for module in params.get("modules", []):
        if specifier == module or specifier.startswith(module + "/"):
            return True
    for prefix in params.get("prefixes", []):
        if specifier.startswith(prefix):
            return True
    return False


def dep_matches(name: str, params: dict) -> bool:
    """依赖名匹配：精确或前缀变体（无子路径语义——依赖键是包名）。"""
    if name in params.get("modules", params.get("exact", [])):
        return True
    return any(name.startswith(prefix) for prefix in params.get("prefixes", []))


def scan_import_module(path: Path, fileclass: str, rule: dict, findings: list[dict]) -> None:
    params = rule.get("params", {})
    if fileclass == "deps":
        try:
            manifest = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return
        text = path.read_text(encoding="utf-8", errors="replace")
        for section in ("dependencies", "devDependencies"):
            for name in (manifest.get(section) or {}):
                if dep_matches(name, params):
                    findings.append(_finding(rule, path, text, f'"{name}"'))
        return
    text = read_source(path)
    for regex in (STATIC_IMPORT_RE, DYNAMIC_IMPORT_RE, REQUIRE_RE):
        for match in regex.finditer(text):
            if module_matches(match.group(1), params):
                findings.append(_finding(rule, path, text, match.group(0), match.start()))


def scan_import_named_from(path: Path, fileclass: str, rule: dict, findings: list[dict]) -> None:
    if fileclass != "code":
        return
    params = rule.get("params", {})
    module = re.escape(params.get("module", ""))
    names = params.get("names", [])
    text = read_source(path)
    clause_re = re.compile(NAMED_IMPORT_CLAUSE_RE_TPL.format(module=module), re.DOTALL)
    for match in clause_re.finditer(text):
        clause = match.group(0)
        line_start = text.count("\n", 0, match.start()) + 1
        for name in names:
            if re.search(rf"\b{re.escape(name)}\b", clause):
                findings.append(_finding(rule, path, text, name, match.start()))
                break  # 同一 import 子句报一条即可


def scan_pattern(path: Path, fileclass: str, rule: dict, findings: list[dict]) -> None:
    text = read_source(path)
    patterns = [re.compile(p) for p in rule.get("params", {}).get("patterns", [])]
    for lineno, line in enumerate(text.split("\n"), start=1):
        stripped = line.strip()
        if stripped.startswith(COMMENT_LINE_PREFIXES):
            continue  # 注释行豁免
        for pattern in patterns:
            if pattern.search(line):
                findings.append(_finding(rule, path, text, line, None, lineno=lineno))


def scan_package_json_dep(path: Path, fileclass: str, rule: dict, findings: list[dict]) -> None:
    if fileclass != "deps":
        return
    try:
        manifest = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return
    text = path.read_text(encoding="utf-8", errors="replace")
    params = rule.get("params", {})
    for section in ("dependencies", "devDependencies"):
        for name in (manifest.get(section) or {}):
            if dep_matches(name, params):
                findings.append(_finding(rule, path, text, f'"{name}"'))


_KIND_DISPATCH = {
    "import_module": scan_import_module,
    "import_named_from": scan_import_named_from,
    "pattern": scan_pattern,
    "package_json_dep": scan_package_json_dep,
}


def _finding(rule: dict, path: Path, text: str, needle: str, offset: int | None = None, lineno: int | None = None) -> dict:
    if lineno is None:
        position = text.find(needle) if offset is None else offset
        lineno = text.count("\n", 0, max(position, 0)) + 1
    line_text = text.split("\n")[lineno - 1] if lineno - 1 < len(text.split("\n")) else ""
    snippet = line_text.strip()[:SNIPPET_MAX_CHARS]
    return {
        "rule_id": rule["id"],
        "path": str(path),
        "line": lineno,
        "snippet": snippet,
    }


def scan(root: Path, rules: list[dict]) -> list[dict]:
    findings: list[dict] = []
    active = [rule for rule in rules if rule.get("scan")]
    if root.is_file():
        suffix = root.suffix.lower()
        fileclass = "deps" if root.name == "package.json" else (
            "code" if suffix in CODE_EXTENSIONS else ("style" if suffix in STYLE_EXTENSIONS else None)
        )
        targets = [(root, fileclass)] if fileclass else []
    else:
        targets = iter_target_files(root)
    for path, fileclass in targets:
        applies = False
        for rule in active:
            if fileclass in rule.get("applies_to", []):
                applies = True
                break
        if not applies:
            continue
        for rule in active:
            if fileclass not in rule.get("applies_to", []):
                continue
            handler = _KIND_DISPATCH.get(rule.get("kind"))
            if handler:
                handler(path, fileclass, rule, findings)
    return findings


def render_human(findings: list[dict]) -> str:
    lines: list[str] = []
    by_rule: dict[str, list[dict]] = {}
    for finding in findings:
        by_rule.setdefault(finding["rule_id"], []).append(finding)
    for rule_id in sorted(by_rule):
        lines.append(f"{rule_id} ({len(by_rule[rule_id])}):")
        for finding in by_rule[rule_id]:
            lines.append(f"  {finding['path']}:{finding['line']}: {finding['snippet']}")
    counts = ", ".join(f"{rid}={len(items)}" for rid, items in sorted(by_rule.items()))
    lines.append(f"findings: {sum(len(v) for v in by_rule.values())} ({counts or 'none'})")
    lines.append(f"RESULT: {'clean' if not findings else 'dirty'}")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="禁令静态检查（D7 最小化，规则表驱动）。")
    parser.add_argument("target", nargs="?", default=".", type=Path, help="扫描目标路径（默认当前目录）")
    parser.add_argument("--rules", type=Path, default=DEFAULT_RULES_PATH, help="规则表路径（默认脚本同目录 ban_rules.json）")
    parser.add_argument("--json", action="store_true", help="输出机器可读 JSON 结果")
    args = parser.parse_args(argv)

    target = args.target.resolve()
    if not target.exists():
        if args.json:
            print(json.dumps({"status": "error", "error": f"目标路径不存在: {target}"}, ensure_ascii=False))
        else:
            print(f"ERROR: 目标路径不存在: {target}", file=sys.stderr)
        return 2
    try:
        rules = load_rules(args.rules.resolve())
    except UsageError as exc:
        if args.json:
            print(json.dumps({"status": "error", "error": str(exc)}, ensure_ascii=False))
        else:
            print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    findings = scan(target, rules)
    counts: dict[str, int] = {}
    for finding in findings:
        counts[finding["rule_id"]] = counts.get(finding["rule_id"], 0) + 1
    if args.json:
        print(json.dumps(
            {"status": "clean" if not findings else "dirty", "counts": counts, "findings": findings},
            ensure_ascii=False,
        ))
    else:
        print(render_human(findings))
    return 0 if not findings else 1


if __name__ == "__main__":
    sys.exit(main())
