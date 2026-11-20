#!/usr/bin/env python3
"""ban_scan.py — 禁令静态检查（D7 最小化：只做禁令级模式匹配）。

规则表 scripts/ban_rules.json（schema v1）与 references/engineering.md 全局禁令表
B1–B7 逐 ID 同源；B7 以 scan:false 显式在场（不扫的禁令也在表内，ID 集合可机械
比对）。逻辑与规则数据分离：规则表供 P5 与 engineering.md 机械比对。

不做结构推断、不做数据流分析、不追求 AST 精度；误报优先通过扫描面收窄消除，
残余风险如实记录，findings 由人裁定。规则表与文档冲突时以 engineering.md 为准
回改规则表（放宽规则表 = 文档侧评审动作，不在本工具内自助修改）。

扫描面：CLI 目标路径（默认仓库根）；文件类 = code（.ts .tsx .js .jsx .mjs .cjs）
+ style（.less .css）+ markup（.html .htm .ejs）+ deps（任意深度 package.json 的
dependencies / devDependencies / optionalDependencies；peerDependencies 是消费者契约，不扫）。
永久排除：node_modules/、.umi*/、dist/、coverage/、.git/、package-lock.json、*.min.*、
二进制、单文件 >2MB。.md 与非 package 的 .json 不扫（文档行文提及属说明文字）。
不覆盖（人工复查项）：require() 解构、import.meta 别名、页面裸 fetch、MemoryRouter 使用上下文、
经 CDN URL 加载的第二地图引擎。注释豁免按命中点判定：同一行 `/* … */` 闭合后的代码照常检查。

severity：规则可选键（缺省 error，仅字符串 "warn" 触发降级）；warn 级 finding 输出带
[warn] 标记，不计入「有违规」退出码。--waivers <file> 豁免台账：JSON 数组
[{rule, path_pattern, owner, reason, expires}]（expires 为 ISO 日期）；解析失败 / 缺
字段 / 坏 ISO 日期 / 未知规则 id → 退出 2 并报条目；finding 命中（rule 相等 +
fnmatch(path_pattern, finding 路径)，台账序首个命中生效）且未过期 → 降为 warn 行并附
owner；已过期豁免视为不存在，stderr 逐条提示。--waivers 模式下 --json 的 findings
逐条附 severity，命中项另附 waived_by。

输出：默认人读按规则分组逐条 {rule_id, path, line, snippet≤120}（warn 级带 [warn]
标记，豁免命中附 (waiver: owner)）+ 计数汇总 + 末行 RESULT；--json 输出 {status,
scanned, counts, findings, errors}。退出码：0 干净（仅剩 warn/豁免项） / 1 存在未
豁免的 error 级 findings / 2 用法或 IO 错误（规则表或豁免台账缺失、schema 不识或
条目非法、目标路径不存在、扫描面零文件、任一文件读取或 package.json 解析失败；
已收集的 findings 照常输出）。无 --waivers 且规则表未用 severity 时，输出与退出码
与既有行为逐字节兼容。
"""

from __future__ import annotations

import argparse
import codecs
import json
import os
import re
import sys
from datetime import date
from fnmatch import fnmatch
from pathlib import Path

CODE_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"}
STYLE_EXTENSIONS = {".less", ".css"}
MARKUP_EXTENSIONS = {".html", ".htm", ".ejs"}
DEP_SECTIONS = ("dependencies", "devDependencies", "optionalDependencies")
EXCLUDED_DIR_NAMES = {"node_modules", "dist", "coverage", ".git"}
EXCLUDED_DIR_PREFIXES = (".umi",)
EXCLUDED_FILE_NAMES = {"package-lock.json"}
MAX_FILE_BYTES = 2 * 1024 * 1024
SNIPPET_MAX_CHARS = 120
WAIVER_FIELDS = ("rule", "path_pattern", "owner", "reason", "expires")

DEFAULT_RULES_PATH = Path(__file__).resolve().parent / "ban_rules.json"

STATIC_IMPORT_RE = re.compile(r"\bimport\b\s*(?:[\w*$\s,{}]*?\s*\bfrom\s*)?['\"]([^'\"]+)['\"]")
REEXPORT_RE = re.compile(r"\bexport\b\s*(?:type\b\s*)?(?:\*(?:\s*as\s+[\w$]+)?|\{[^}]*\})\s*from\s*['\"]([^'\"]+)['\"]")
STYLE_IMPORT_RE = re.compile(r"@import\s*(?:\([^)]*\)\s*)?(?:url\(\s*)?['\"]?([^'\")\s;]+)")
DYNAMIC_IMPORT_RE = re.compile(r"import\(\s*['\"]([^'\"]+)['\"]\s*\)")
REQUIRE_RE = re.compile(r"require\(\s*['\"]([^'\"]+)['\"]\s*\)")
# 子句体排除引号/分号/括号/等号：不会越过上一条语句的模块串，无分号代码不再跨语句吞并；
# 行首或同行 `;` / `}` 之后起算（声明以 `}` 结束可直接接 import），允许已闭合的块注释与无空格的
# 紧凑写法；模块含子路径（react-router/dom）。
# `type` 只在后接 `{` / `*` / 标识符时按 type-only 放行：`import type, {…}` 与 `import type from` 的 type 是值绑定。
ROUTER_CLAUSE_RE_TPL = (
    r"(?:^|[;}}])[ \t]*(?:/\*.*?\*/[ \t]*)*(import|export)\b\s*(type\b\s*(?=[{{*]|(?!from\b)[A-Za-z_$]))?"
    r"([^'\";(){{}}=]*?(?:\{{[^}}]*\}}[^'\";(){{}}=]*?)?)"
    r"\s*from\s*['\"](?:{modules})(?:/[^'\"]*)?['\"]"
)


class UsageError(Exception):
    """用法/IO 错误——对应退出码 2。"""


class FileScanError(Exception):
    """单文件读取/解析失败——记入 errors，扫描继续，最终退出码 2。"""


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
    valid_kinds = set(_KIND_DISPATCH) | {"none"}
    for index, rule in enumerate(rules):
        where = f"规则表 rules[{index}]"
        if not isinstance(rule, dict):
            raise UsageError(f"规则表 schema 不识: {where} 不是对象")
        rule_id = rule.get("id")
        if not isinstance(rule_id, str) or not rule_id:
            raise UsageError(f"规则表 schema 不识: {where}.id 必须为非空字符串")
        kind = rule.get("kind")
        if kind not in valid_kinds:
            raise UsageError(f"规则表 schema 不识: {where}（{rule_id}）kind 未知: {kind!r}")
        if "scan" in rule and not isinstance(rule["scan"], bool):
            raise UsageError(f"规则表 schema 不识: {where}（{rule_id}）.scan 必须为布尔值")
        if not isinstance(rule.get("params", {}), dict):
            raise UsageError(f"规则表 schema 不识: {where}（{rule_id}）.params 必须为对象")
        if not isinstance(rule.get("applies_to", []), list):
            raise UsageError(f"规则表 schema 不识: {where}（{rule_id}）.applies_to 必须为数组")
    ids = [rule["id"] for rule in rules]
    if len(set(ids)) != len(ids):
        raise UsageError("规则表 schema 不识: 规则 ID 重复")
    return rules


def load_waivers(path: Path, known_rule_ids: set[str]) -> list[dict]:
    """豁免台账：JSON 数组 [{rule, path_pattern, owner, reason, expires}]；任一条目
    非对象 / 缺字段 / 非字符串 / 未知规则 id / expires 非合法 ISO 日期 → UsageError
    （退出 2，报条目位置 entries[i]）。"""
    if not path.is_file():
        raise UsageError(f"豁免台账不存在: {path}")
    try:
        ledger = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise UsageError(f"豁免台账无法解析: {exc}") from exc
    if not isinstance(ledger, list):
        raise UsageError("豁免台账 schema 不识: 顶层必须为数组")
    waivers: list[dict] = []
    for index, entry in enumerate(ledger):
        where = f"豁免台账 entries[{index}]"
        if not isinstance(entry, dict):
            raise UsageError(f"{where} 不是对象")
        for field in WAIVER_FIELDS:
            value = entry.get(field)
            if not isinstance(value, str) or not value:
                raise UsageError(f"{where} 缺字段或非字符串: {field}")
        if entry["rule"] not in known_rule_ids:
            raise UsageError(f"{where} 未知规则 id: {entry['rule']}")
        try:
            expires = date.fromisoformat(entry["expires"])
        except ValueError as exc:
            raise UsageError(f"{where} expires 不是合法 ISO 日期: {entry['expires']}") from exc
        waivers.append({**entry, "expires_date": expires})
    return waivers


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
            elif suffix in MARKUP_EXTENSIONS:
                yield path, "markup"


def classify(path: Path) -> str | None:
    suffix = path.suffix.lower()
    if path.name == "package.json":
        return "deps"
    for fileclass, extensions in (("code", CODE_EXTENSIONS), ("style", STYLE_EXTENSIONS), ("markup", MARKUP_EXTENSIONS)):
        if suffix in extensions:
            return fileclass
    return None


def read_source(path: Path) -> str:
    try:
        raw = path.read_bytes()
    except OSError as exc:
        raise FileScanError(f"读取失败: {exc.strerror or exc}") from exc
    if raw.startswith(codecs.BOM_UTF16_LE) or raw.startswith(codecs.BOM_UTF16_BE):
        try:
            return raw.decode("utf-16").replace("\r\n", "\n")
        except UnicodeDecodeError as exc:
            raise FileScanError(f"UTF-16 解码失败: {exc}") from exc
    if b"\0" in raw[:8192]:
        raise FileScanError("源码前 8192 字节含 NUL（二进制或未知编码），拒绝按空内容扫描")
    return raw.decode("utf-8", errors="replace").replace("\r\n", "\n")


def load_manifest_deps(text: str) -> list[str]:
    try:
        manifest = json.loads(text)
    except json.JSONDecodeError as exc:
        raise FileScanError(f"package.json 解析失败: {exc.msg} (line {exc.lineno})") from exc
    if not isinstance(manifest, dict):
        raise FileScanError("package.json 解析失败: 顶层不是对象")
    names: list[str] = []
    for section in DEP_SECTIONS:
        deps = manifest.get(section) or {}
        if isinstance(deps, dict):
            names.extend(deps)
    return names


def module_matches(specifier: str, params: dict) -> bool:
    """import 说明符匹配：精确或子路径（m、m/…）；前缀变体（@scope/）。"""
    specifier = specifier[1:] if specifier.startswith("~") else specifier  # less 的 ~ 模块前缀
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


def comment_prefix(prefix: str) -> bool:
    """命中点之前的同行文本是否处于 // 行注释或未闭合的 /* 块注释（含 JSDoc 续行 *）内。"""
    prefix = prefix.lstrip()
    return prefix.startswith("//") or (prefix.startswith(("/*", "*")) and "*/" not in prefix)


def in_comment(text: str, offset: int) -> bool:
    return comment_prefix(text[text.rfind("\n", 0, offset) + 1:offset])


def scan_import_module(path: Path, fileclass: str, rule: dict, findings: list[dict], text: str) -> None:
    params = rule.get("params", {})
    if fileclass == "deps":
        for name in load_manifest_deps(text):
            if dep_matches(name, params):
                findings.append(_finding(rule, path, text, f'"{name}"'))
        return
    regexes = (STYLE_IMPORT_RE,) if fileclass == "style" else (STATIC_IMPORT_RE, REEXPORT_RE, DYNAMIC_IMPORT_RE, REQUIRE_RE)
    for regex in regexes:
        for match in regex.finditer(text):
            if module_matches(match.group(1), params) and not in_comment(text, match.start()):
                findings.append(_finding(rule, path, text, match.group(0), match.start()))


def import_bindings(body: str) -> list[str]:
    """子句的值绑定（取 as 左侧导入名）；namespace / export * 记 '*'，default 记本地名，type-only 略过。"""
    body = body.strip()
    if body.startswith("*"):
        return ["*"]
    names: list[str] = []
    if "{" in body:
        head, _, rest = body.partition("{")
        for spec in rest.rsplit("}", 1)[0].split(","):
            spec = spec.strip()
            if spec and not re.match(r"type\s", spec):
                names.append(re.split(r"\s+as\s+", spec)[0].strip())
        body = head.strip().rstrip(",").strip()
    if body:
        names.append(body)  # default 导入：react-router 族没有 default 导出，按违规处理
    return names


def scan_import_allowlist(path: Path, fileclass: str, rule: dict, findings: list[dict], text: str) -> None:
    if fileclass != "code":
        return
    params = rule.get("params", {})
    family = "|".join(re.escape(m) for m in params.get("modules", []))
    allowed = set(params.get("allowed_names", []))
    requires = params.get("requires_with", {})
    clauses = [
        (match, import_bindings(match.group(3)))
        for match in re.finditer(ROUTER_CLAUSE_RE_TPL.format(modules=family), text, re.MULTILINE)
        if not match.group(2) and not in_comment(text, match.start(1))  # type-only 与注释内命中略过
    ]
    imported = {name for _, names in clauses for name in names}
    for match, names in clauses:
        if any(name not in allowed or not imported.issuperset(requires.get(name, [])) for name in names):
            findings.append(_finding(rule, path, text, match.group(0), match.start(1)))
    for match in re.finditer(rf"\bimport\(\s*['\"](?:{family})(?:/[^'\"]*)?['\"]", text):
        if not in_comment(text, match.start()):
            findings.append(_finding(rule, path, text, match.group(0), match.start()))


def scan_pattern(path: Path, fileclass: str, rule: dict, findings: list[dict], text: str) -> None:
    patterns = [re.compile(p) for p in rule.get("params", {}).get("patterns", [])]
    for lineno, line in enumerate(text.split("\n"), start=1):
        for pattern in patterns:
            if any(not comment_prefix(line[:match.start()]) for match in pattern.finditer(line)):
                findings.append(_finding(rule, path, text, line, None, lineno=lineno))


def scan_package_json_dep(path: Path, fileclass: str, rule: dict, findings: list[dict], text: str) -> None:
    if fileclass != "deps":
        return
    params = rule.get("params", {})
    for name in load_manifest_deps(text):
        if dep_matches(name, params):
            findings.append(_finding(rule, path, text, f'"{name}"'))


_KIND_DISPATCH = {
    "import_module": scan_import_module,
    "import_allowlist": scan_import_allowlist,
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


def scan(root: Path, rules: list[dict]) -> tuple[list[dict], list[dict], int]:
    """返回 (findings, errors, scanned)：单文件失败记入 errors 后继续，不丢已收集的 findings。"""
    findings: list[dict] = []
    errors: list[dict] = []
    scanned = 0
    active = [rule for rule in rules if rule.get("scan")]
    if root.is_file():
        fileclass = classify(root)
        targets = [(root, fileclass)] if fileclass else []
    else:
        targets = iter_target_files(root)
    for path, fileclass in targets:
        applicable = [rule for rule in active if fileclass in rule.get("applies_to", [])]
        if not applicable:
            continue
        scanned += 1
        file_findings: list[dict] = []
        try:
            text = read_source(path)
            for rule in applicable:
                handler = _KIND_DISPATCH.get(rule.get("kind"))
                if handler:
                    handler(path, fileclass, rule, file_findings, text)
        except FileScanError as exc:
            errors.append({"path": str(path), "error": str(exc)})
        findings.extend(file_findings)
    return findings, errors, scanned


def result_status(findings: list[dict], errors: list[dict], scanned: int) -> str:
    if errors or scanned == 0:
        return "error"
    return "dirty" if findings else "clean"


def rule_severity(rule: dict) -> str:
    """规则级 severity：仅字符串 "warn" 降级为告警，其余值（含缺省）一律按 error。"""
    return "warn" if rule.get("severity") == "warn" else "error"


def match_waiver(finding: dict, waivers: list[dict]) -> dict | None:
    """豁免命中判定：rule 相等 + fnmatch(path_pattern, finding 路径)；台账序首个命中生效。"""
    for waiver in waivers:
        if waiver["rule"] == finding["rule_id"] and fnmatch(finding["path"], waiver["path_pattern"]):
            return waiver
    return None


def annotate_findings(findings: list[dict], severity_by_rule: dict[str, str], waivers: list[dict]) -> list[dict]:
    """返回 findings 的注解副本：逐条附 severity（规则表 + 未过期豁免命中降级），
    命中项另附 waived_by。原列表不修改（--json 无 --waivers 路径复用原对象保持逐字节兼容）。"""
    annotated: list[dict] = []
    for finding in findings:
        item = dict(finding)
        item["severity"] = severity_by_rule.get(item["rule_id"], "error")
        annotated.append(item)
    for item in annotated:
        waiver = match_waiver(item, waivers)
        if waiver:
            item["severity"] = "warn"
            item["waived_by"] = waiver["owner"]
    return annotated


def render_human(findings: list[dict], errors: list[dict], scanned: int, status: str) -> str:
    lines: list[str] = []
    by_rule: dict[str, list[dict]] = {}
    for finding in findings:
        by_rule.setdefault(finding["rule_id"], []).append(finding)
    for rule_id in sorted(by_rule):
        lines.append(f"{rule_id} ({len(by_rule[rule_id])}):")
        for finding in by_rule[rule_id]:
            marker = "[warn] " if finding.get("severity") == "warn" else ""
            owner = f" (waiver: {finding['waived_by']})" if "waived_by" in finding else ""
            lines.append(f"  {marker}{finding['path']}:{finding['line']}: {finding['snippet']}{owner}")
    counts = ", ".join(f"{rid}={len(items)}" for rid, items in sorted(by_rule.items()))
    for error in errors:
        lines.append(f"ERROR: {error['path']}: {error['error']}")
    if scanned == 0:
        lines.append("ERROR: 扫描面零文件（目标下没有 code/style/markup/package.json 文件），不能判定为干净")
    exceptions = [finding for finding in findings if finding.get("severity") == "warn"]
    if exceptions:
        lines.append(f"未关闭例外: {len(exceptions)} 条（warn/豁免；不计入退出码）")
        for finding in exceptions:
            owner = f" (waiver: {finding['waived_by']})" if "waived_by" in finding else ""
            lines.append(f"  - {finding['rule_id']} {finding['path']}:{finding['line']}{owner}")
    lines.append(f"scanned: {scanned} files")
    lines.append(f"findings: {sum(len(v) for v in by_rule.values())} ({counts or 'none'})")
    lines.append(f"RESULT: {status}")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="禁令静态检查（D7 最小化，规则表驱动）。")
    parser.add_argument("target", nargs="?", default=".", type=Path, help="扫描目标路径（默认当前目录）")
    parser.add_argument("--rules", type=Path, default=DEFAULT_RULES_PATH, help="规则表路径（默认脚本同目录 ban_rules.json）")
    parser.add_argument("--waivers", type=Path, default=None, help="豁免台账路径（JSON 数组 [{rule, path_pattern, owner, reason, expires}]，示例见同目录 waivers.example.json）")
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

    waivers_enabled = args.waivers is not None
    waivers: list[dict] = []
    if waivers_enabled:
        try:
            ledger = load_waivers(args.waivers.resolve(), {rule["id"] for rule in rules})
        except UsageError as exc:
            if args.json:
                print(json.dumps({"status": "error", "error": str(exc)}, ensure_ascii=False))
            else:
                print(f"ERROR: {exc}", file=sys.stderr)
            return 2
        today = date.today()
        for waiver in ledger:
            if waiver["expires_date"] < today:  # 过期豁免视为不存在，仅 stderr 提示
                print(
                    f"WARN: 豁免已过期，视为不存在: rule={waiver['rule']} "
                    f"path_pattern={waiver['path_pattern']} owner={waiver['owner']} expires={waiver['expires']}",
                    file=sys.stderr,
                )
            else:
                waivers.append(waiver)

    findings, errors, scanned = scan(target, rules)
    severity_by_rule = {rule["id"]: rule_severity(rule) for rule in rules}
    annotated = annotate_findings(findings, severity_by_rule, waivers)
    error_findings = [finding for finding in annotated if finding["severity"] == "error"]
    counts: dict[str, int] = {}
    for finding in findings:
        counts[finding["rule_id"]] = counts.get(finding["rule_id"], 0) + 1
    status = result_status(error_findings, errors, scanned)
    if args.json:
        print(json.dumps(
            {"status": status, "scanned": scanned, "counts": counts,
             "findings": annotated if waivers_enabled else findings, "errors": errors},
            ensure_ascii=False,
        ))
    else:
        print(render_human(annotated, errors, scanned, status))
    return {"clean": 0, "dirty": 1}.get(status, 2)


if __name__ == "__main__":
    sys.exit(main())
