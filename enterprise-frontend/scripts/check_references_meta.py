#!/usr/bin/env python3
"""check_references_meta.py — references frontmatter 元数据与 SKILL.md 路由表一致性检查。

每篇 references/*.md 首部持有 `---` 包裹的 frontmatter（`键: 值` 行，值为 JSON 语法）：
load_when（一句话加载场景，与 SKILL.md 路由表对应行语义一致）、rule_ids（涉及禁令
ID 的字符串数组）、depends_on（依赖的其他 references 文件名数组）、size_budget
（含 frontmatter 的行数上限）。本检查器只对账不生成：SKILL.md 是契约文档，路由表
由人工评审维护，机器不改写。

检查面（任一命中即 finding，存在 findings 退出 1）：
1. frontmatter 可解析：首行 `---` 起、`---` 闭合，块内每行 `键: 值` 且值为合法 JSON；
2. 键集恰为四键且类型对：load_when 非空字符串；rule_ids / depends_on 为字符串数组且
   depends_on 条目须是目录内存在的其他 references 文件名；size_budget 为正整数；
3. 体积预算：文件实际行数（含 frontmatter）≤ size_budget；
4. 路由表对账：SKILL.md References 层表格每行目标文档存在于 references/ 且其
   load_when 非空；表格零行视为漂移；路由行触发列与该篇 load_when 归一化后做
   字符二元组覆盖率对账——load_when 的二元组被触发列覆盖不足 0.4 即 finding
   「load_when 与路由行语义不一致」，防止触发列与加载条件各说各话；
5. 引用集合双向对账：SKILL.md 全文反引号引用的 references 文件集合 ==
   references/ 目录 *.md 集合——SKILL 引用目录外文档、目录文档未被 SKILL 引用
   （缺路由表行或正文引用）均 finding，退出 1。

集合等式沿革：P6-R2 落地时 references/scenario-coverage.md 未入 SKILL 路由表，
目录侧无法对齐，「目录文档未被引用」降级为 INFO（不影响退出码），升级路径记录在
本检查器 docstring；P7 补齐该路由行后已于 P7 收紧为双向——任何一侧多/少都作为
finding 报出差异文件并退出 1。

输出：默认人读逐条 FINDING + 计数 + 末行 RESULT；--json 输出
{status, checked, route_rows, findings, infos}（infos 恒为空，字段保留兼容）。
退出码：0 干净 / 1 存在 findings / 2 用法或 IO 错误
（仓库根或 references 目录或 SKILL.md 缺失、任一文件读取失败）。
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

FRONT_KEYS = {"load_when", "rule_ids", "depends_on", "size_budget"}
# 反引号包裹的 references 文档路径（路由表目标与全文引用同一口径）。
REF_PATH_RE = re.compile(r"`references/([A-Za-z0-9_.-]+\.md)`")
# load_when 的字符二元组被路由行触发列覆盖的下限；低于即视为语义脱节。
LOAD_WHEN_COVERAGE_MIN = 0.4
DEFAULT_ROOT = Path(__file__).resolve().parents[1]


class UsageError(Exception):
    """用法/IO 错误——对应退出码 2。"""


def _json_value(name: str, raw: str):
    """解析 JSON 值；失败返回 (None, 错误说明)。"""
    try:
        return json.loads(raw), None
    except json.JSONDecodeError as exc:
        return None, f"{name} 值不是合法 JSON（{exc.msg}）"


def parse_frontmatter(text: str):
    """返回 (meta, error)：meta 为 键 -> 原始 JSON 字符串值；无合法块时 (None, 原因)。"""
    lines = text.split("\n")
    if not lines or lines[0].strip() != "---":
        return None, "首行不是 frontmatter 起始 `---`"
    end = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end = i
            break
    if end is None:
        return None, "frontmatter 块未闭合（缺收尾 `---`）"
    meta: dict[str, str] = {}
    for no, line in enumerate(lines[1:end], start=2):
        if not line.strip():
            return None, f"frontmatter 第 {no} 行为空行（块内只允许 `键: 值` 行）"
        key, sep, value = line.partition(":")
        if not sep:
            return None, f"frontmatter 第 {no} 行不是 `键: 值` 格式"
        key = key.strip()
        if key in meta:
            return None, f"frontmatter 键重复: {key}"
        meta[key] = value.strip()
    return meta, None


def frontmatter_findings(name: str, meta: dict, refs_dir: Path) -> list[tuple[str, str]]:
    """键集与类型合法性检查，返回 [(check, message)]。"""
    findings: list[tuple[str, str]] = []
    keys = set(meta)
    missing = sorted(FRONT_KEYS - keys)
    extra = sorted(keys - FRONT_KEYS)
    if missing:
        findings.append(("keys", f"缺少键: {', '.join(missing)}"))
    if extra:
        findings.append(("keys", f"多出键: {', '.join(extra)}"))
    if "load_when" in meta:
        value, err = _json_value("load_when", meta["load_when"])
        if err:
            findings.append(("types", err))
        elif not isinstance(value, str) or not value.strip():
            findings.append(("types", "load_when 必须为非空 JSON 字符串"))
    if "rule_ids" in meta:
        value, err = _json_value("rule_ids", meta["rule_ids"])
        if err:
            findings.append(("types", err))
        elif not isinstance(value, list) or not all(isinstance(item, str) for item in value):
            findings.append(("types", "rule_ids 必须为字符串数组"))
    if "depends_on" in meta:
        value, err = _json_value("depends_on", meta["depends_on"])
        if err:
            findings.append(("types", err))
        elif not isinstance(value, list) or not all(isinstance(item, str) for item in value):
            findings.append(("types", "depends_on 必须为字符串数组"))
        else:
            for dep in value:
                if dep == name:
                    findings.append(("depends_on", f"depends_on 指向自身: {dep}"))
                elif not (refs_dir / dep).is_file():
                    findings.append(("depends_on", f"depends_on 条目不存在于 references/: {dep}"))
    if "size_budget" in meta:
        value, err = _json_value("size_budget", meta["size_budget"])
        if err:
            findings.append(("types", err))
        elif isinstance(value, bool) or not isinstance(value, int) or value <= 0:
            findings.append(("types", "size_budget 必须为正整数"))
    return findings


def effective_load_when(meta: dict | None) -> str:
    """load_when 的生效字符串：缺键 / 非字符串 / 空白一律为空串。"""
    if not meta or "load_when" not in meta:
        return ""
    value, err = _json_value("load_when", meta["load_when"])
    if err or not isinstance(value, str):
        return ""
    return value.strip()


def norm(text: str) -> str:
    """归一化：去标点与空白并转小写（与 test_spec_docs / rule_coverage 的折叠同口径）。"""
    return re.sub(r"[\W_]+", "", text, flags=re.UNICODE).lower()


def bigrams(text: str) -> set:
    """归一化后的字符二元组集合。"""
    folded = norm(text)
    return {folded[i : i + 2] for i in range(len(folded) - 1)}


def load_when_coverage(load_when: str, trigger: str) -> float:
    """load_when 的字符二元组被路由行触发列覆盖的比例（0–1）。"""
    expected = bigrams(load_when)
    if not expected:
        return 1.0
    return len(expected & bigrams(trigger)) / len(expected)


def trigger_cell(row: str) -> str:
    """路由行表格的首个单元格（触发场景列）。"""
    cells = row.strip().strip("|").split("|")
    return cells[0].strip() if cells else ""


def routing_rows(skill_text: str) -> list[tuple[str, str]]:
    """References 层表格行 (行文本, 目标文件名)；仅取 `## References` 节内的表格行。"""
    lines = skill_text.split("\n")
    start = None
    for i, line in enumerate(lines):
        if re.match(r"##\s+References\s*$", line):
            start = i + 1
            break
    if start is None:
        return []
    rows: list[tuple[str, str]] = []
    for line in lines[start:]:
        if re.match(r"#{1,2}\s", line):
            break
        match = REF_PATH_RE.search(line) if line.startswith("|") else None
        if match:
            rows.append((line.strip(), match.group(1)))
    return rows


def collect(root: Path):
    """返回 (findings, infos, checked, route_rows)；仓库结构缺失抛 UsageError。"""
    refs_dir = root / "references"
    skill_path = root / "SKILL.md"
    if not refs_dir.is_dir():
        raise UsageError(f"references 目录不存在: {refs_dir}")
    if not skill_path.is_file():
        raise UsageError(f"SKILL.md 不存在: {skill_path}")

    findings: list[dict] = []
    infos: list[str] = []
    metas: dict[str, dict] = {}
    dir_files = sorted(path.name for path in refs_dir.glob("*.md"))

    for name in dir_files:
        path = refs_dir / name
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError) as exc:
            raise UsageError(f"读取失败 {path}: {exc}") from exc
        meta, err = parse_frontmatter(text)
        if meta is None:
            findings.append(_finding(f"references/{name}", "frontmatter", err))
            continue
        metas[name] = meta
        for check, message in frontmatter_findings(name, meta, refs_dir):
            findings.append(_finding(f"references/{name}", check, message))
        budget, err = _json_value("size_budget", meta.get("size_budget", ""))
        if err is None and isinstance(budget, int) and not isinstance(budget, bool) and budget > 0:
            line_count = len(text.splitlines())
            if line_count > budget:
                findings.append(_finding(f"references/{name}", "size_budget", f"实际行数 {line_count} 超预算 {budget}（含 frontmatter）"))

    skill_text = skill_path.read_text(encoding="utf-8")
    rows = routing_rows(skill_text)
    if not rows:
        findings.append(_finding("SKILL.md", "route_table", "References 层路由表零行（未找到指向 references/*.md 的表格行）"))
    for line, target in rows:
        if target not in dir_files:
            findings.append(_finding("SKILL.md", "route_table", f"路由表目标文档不存在: references/{target}（行: {line}）"))
            continue
        load_when = effective_load_when(metas.get(target))
        if not load_when:
            findings.append(_finding("SKILL.md", "route_table", f"路由表目标 load_when 为空或不可解析: references/{target}"))
            continue
        coverage = load_when_coverage(load_when, trigger_cell(line))
        if coverage < LOAD_WHEN_COVERAGE_MIN:
            findings.append(
                _finding(
                    "SKILL.md",
                    "route_semantics",
                    f"load_when 与路由行语义不一致: references/{target}"
                    f"（覆盖率 {coverage:.2f} < {LOAD_WHEN_COVERAGE_MIN}；路由行触发列: {trigger_cell(line)}）",
                )
            )

    cited = set(REF_PATH_RE.findall(skill_text))
    for name in sorted(cited):
        if name not in dir_files:
            findings.append(_finding("SKILL.md", "cited_set", f"SKILL.md 引用了目录中不存在的文档: references/{name}"))
    for name in sorted(set(dir_files) - cited):
        findings.append(
            _finding(
                f"references/{name}",
                "cited_set",
                "未被 SKILL.md 引用（SKILL 引用集合与目录集合不一致：缺路由表行或正文引用）",
            )
        )
    return findings, infos, len(dir_files), len(rows)


def _finding(path: str, check: str, message: str) -> dict:
    return {"path": path, "check": check, "message": message}


def result_status(findings: list[dict]) -> str:
    return "dirty" if findings else "clean"


def render_human(findings: list[dict], infos: list[str], checked: int, rows: int) -> str:
    lines: list[str] = []
    for finding in findings:
        lines.append(f"FINDING {finding['path']}: {finding['check']} — {finding['message']}")
    for info in infos:
        lines.append(f"INFO: {info}")
    lines.append(f"checked: {checked} files, route rows: {rows}")
    lines.append(f"findings: {len(findings)}")
    lines.append(f"RESULT: {result_status(findings)}")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="references frontmatter 元数据与 SKILL.md 路由表一致性检查（check-only）。")
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT, help="仓库根目录（默认脚本上两级）")
    parser.add_argument("--json", action="store_true", help="输出机器可读 JSON 结果")
    args = parser.parse_args(argv)

    root = args.root.resolve()
    if not root.is_dir():
        message = f"仓库根目录不存在: {root}"
        if args.json:
            print(json.dumps({"status": "error", "error": message}, ensure_ascii=False))
        else:
            print(f"ERROR: {message}", file=sys.stderr)
        return 2
    try:
        findings, infos, checked, rows = collect(root)
    except UsageError as exc:
        if args.json:
            print(json.dumps({"status": "error", "error": str(exc)}, ensure_ascii=False))
        else:
            print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    status = result_status(findings)
    if args.json:
        print(json.dumps(
            {"status": status, "checked": checked, "route_rows": rows, "findings": findings, "infos": infos},
            ensure_ascii=False,
        ))
    else:
        print(render_human(findings, infos, checked, rows))
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())
