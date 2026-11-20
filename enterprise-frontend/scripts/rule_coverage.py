#!/usr/bin/env python3
"""rule_coverage.py — 规则注册表覆盖校验器（stdlib-only，只读仓库文本）。

对 scripts/rule_registry.json（schema v1）做可机检校验，把硬约束从「文档承诺」
变成「可追溯面」：

- id 唯一；
- level 取值合法（ban / hard / discipline）；
- enforcement 取值合法（auto / manual / test）；
- 生命周期可选键（status/since/supersedes/reason）：status 枚举合法
  （active 缺省 / deprecated）；since ∈ 已发布版本集合；supersedes 指向存在的
  其他规则 id 且非自指、沿替代链两跳内无环；status=deprecated 必须有
  supersedes 或 reason 至少其一（不得无据废弃）——违者条目级 ERROR 退出 1；
- doc_anchor 的 md 文件存在，且锚点在该文件小节标题的折叠锚点集合内
  （折叠语义与 scripts/tests/test_spec_docs.py 的 norm/headings 实现一致——
  只读复刻，不改原文件）；
- checker / fixture / test 字段若存在，则相对仓库根的路径必须存在（安装态——
  root 无 scripts/tests 时，fixture/test 为开发树证据，跳过存在性，checker 仍验）；
- enforcement=manual 的条目作为人工复查项列报到 stdout（信息项，不影响退出码；
  口径只看 enforcement——是否有 test 字段不改变人工复查归属）；
- --emit-doc [PATH]：全部校验通过后，把规则追溯视图（按 level 分节的九列表，
  含「生效版本」「状态」两列生命周期信息 + 人工复查项清单 + 统计）渲染为
  markdown 并原子写出（临时文件 + rename）；PATH 缺省 docs/rule-traceability.md
  （相对 --root 解析）。校验失败退出 1 且不写任何文件；输出确定性（同 registry
  同输出，不含时间戳等易变内容），入库生成物由
  scripts/tests/test_rule_registry.py::EmitDocCases 幂等锁定。

退出码：0 全部通过 / 1 校验失败（重复 id、坏枚举、坏锚点、缺路径、生命周期
违规等可解释的条目级问题） / 2 用法或 IO 错误（注册表缺失、JSON 无法解析、
顶层 schema 不识、必填字段缺失或类型不符、追溯视图写入失败——形态坏了无法
逐条解释，参照 ban_scan.py 的 schema 惯例）。

用法：python3 scripts/rule_coverage.py [registry] [--root ROOT] [--json] [--emit-doc [PATH]]
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import tempfile
from pathlib import Path

LEVELS = ("ban", "hard", "discipline")
ENFORCEMENTS = ("auto", "manual", "test")
STATUSES = ("active", "deprecated")
RELEASED_VERSIONS = ("1.0.0", "1.1.0", "1.2.0", "1.3.0", "1.4.0", "1.5.0", "1.6.0")
# 未定版新规则用哨兵 since="unreleased"，定版时回填实际版本号（诚实优于伪填）。
SINCE_SENTINELS = ("unreleased",)
REQUIRED_FIELDS = ("id", "summary", "level", "enforcement", "doc_anchor")
PATH_FIELDS = ("checker", "fixture", "test")
LIFECYCLE_FIELDS = ("status", "since", "supersedes", "reason")

DEFAULT_REGISTRY = Path(__file__).resolve().parent / "rule_registry.json"
DEFAULT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_EMIT_DOC = Path("docs/rule-traceability.md")


class UsageError(Exception):
    """用法/IO/形态错误——对应退出码 2。"""


def norm(title: str) -> str:
    """标题与锚点归一化：去标点与空白并转小写（锚点口径 = 标题原文锚）。

    语义与 scripts/tests/test_spec_docs.py 的 norm 一致（只读复刻）。
    """
    return re.sub(r"[\W_]+", "", title, flags=re.UNICODE).lower()


def headings(text: str) -> list[tuple[int, str]]:
    """解析 md 标题（跳过围栏代码块）；语义与 test_spec_docs.py 的 headings 一致。"""
    out: list[tuple[int, str]] = []
    in_fence = False
    for line in text.splitlines():
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
            continue
        m = None if in_fence else re.match(r"(#{1,6})\s+(.*\S)\s*$", line)
        if m:
            out.append((len(m.group(1)), m.group(2)))
    return out


def folded_anchors(text: str) -> set:
    return {norm(title) for _, title in headings(text)}


def load_registry(path: Path) -> list[dict]:
    """载入并做形态校验；形态坏到无法逐条解释时抛 UsageError（退出码 2）。"""
    if not path.is_file():
        raise UsageError(f"注册表不存在: {path}")
    try:
        table = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise UsageError(f"注册表无法解析: {exc}") from exc
    if not isinstance(table, dict) or table.get("schema_version") != 1:
        raise UsageError("注册表 schema 不识: schema_version 必须为 1")
    rules = table.get("rules")
    if not isinstance(rules, list):
        raise UsageError("注册表 schema 不识: rules 必须为数组")
    for rule in rules:
        if not isinstance(rule, dict):
            raise UsageError("注册表 schema 不识: 规则条目必须是对象")
        for field in REQUIRED_FIELDS:
            value = rule.get(field)
            if not isinstance(value, str) or not value.strip():
                raise UsageError(f"注册表 schema 不识: 条目缺非空字符串字段 {field}: {rule!r}")
        for field in PATH_FIELDS:
            if field in rule and not isinstance(rule[field], str):
                raise UsageError(f"注册表 schema 不识: 字段 {field} 必须是字符串: {rule!r}")
        for field in LIFECYCLE_FIELDS:
            if field in rule and not isinstance(rule[field], str):
                raise UsageError(f"注册表 schema 不识: 生命周期字段 {field} 必须是字符串: {rule!r}")
    return rules


def validate(rules: list[dict], root: Path) -> tuple[list[str], list[dict]]:
    """逐条语义校验。返回 (errors, manual_review)：errors 非空即退出码 1。

    含生命周期可选键校验：status 枚举、since ∈ 已发布版本集合、deprecated
    有据（supersedes 或 reason 至少其一），以及跨条目的 supersedes 三查
    （存在、非自指、替代链两跳内无环）。

    安装态（root 下无 scripts/tests，即 manifest runtime 交付面）：fixture/test
    属开发树证据、不在交付面内，跳过其存在性校验；checker 属交付面仍必须存在。
    """
    errors: list[str] = []
    seen: set = set()
    anchor_cache: dict = {}
    dev_tree = (root / "scripts" / "tests").is_dir()

    def anchors_of(doc: Path):
        if doc not in anchor_cache:
            try:
                anchor_cache[doc] = folded_anchors(doc.read_text(encoding="utf-8"))
            except (OSError, UnicodeDecodeError) as exc:
                anchor_cache[doc] = exc
        return anchor_cache[doc]

    for rule in rules:
        rid = rule["id"]
        where = rid or "<空 id>"
        if rid in seen:
            errors.append(f"{where}: 规则 ID 重复")
        seen.add(rid)
        if rule["level"] not in LEVELS:
            errors.append(f"{where}: level 枚举非法: {rule['level']!r}（合法: {'/'.join(LEVELS)}）")
        if rule["enforcement"] not in ENFORCEMENTS:
            errors.append(f"{where}: enforcement 枚举非法: {rule['enforcement']!r}（合法: {('/'.join(ENFORCEMENTS))}）")
        status = rule.get("status", "active")
        if status not in STATUSES:
            errors.append(f"{where}: status 枚举非法: {status!r}（合法: {'/'.join(STATUSES)}）")
        since = rule.get("since")
        if since is not None and since not in RELEASED_VERSIONS and since not in SINCE_SENTINELS:
            errors.append(
                f"{where}: since 非已发布版本号或哨兵: {since!r}"
                f"（合法: {'/'.join(RELEASED_VERSIONS + SINCE_SENTINELS)}）"
            )
        if status == "deprecated" and "supersedes" not in rule and not rule.get("reason", "").strip():
            errors.append(f"{where}: status=deprecated 须有 supersedes 或 reason 至少其一（不得无据废弃）")
        anchor = rule["doc_anchor"]
        path_part, sep, frag = anchor.partition("#")
        if not sep or not path_part.strip() or not frag.strip():
            errors.append(f"{where}: doc_anchor 形态非法（应为 文件#锚点）: {anchor!r}")
        else:
            doc = root / path_part
            if not doc.is_file():
                errors.append(f"{where}: doc_anchor 文件不存在: {path_part}")
            else:
                keys = anchors_of(doc)
                if isinstance(keys, Exception):
                    errors.append(f"{where}: doc_anchor 文件读取失败: {path_part} ({keys})")
                elif norm(frag) not in keys:
                    errors.append(f"{where}: doc_anchor 锚点不存在: {frag!r}（文件 {path_part} 内无折叠等价标题）")
        for field in PATH_FIELDS:
            if field not in rule:
                continue
            # checker 属交付面（manifest runtime），任何形态都必须在；
            # fixture/test 是开发树证据（scripts/tests 不入 runtime），安装态跳过存在性。
            if field != "checker" and not dev_tree:
                continue
            if not (root / rule[field]).exists():
                errors.append(f"{where}: {field} 路径不存在: {rule[field]}")

    # supersedes 交叉校验（第二遍：目标 id 可能定义在文件后部）——
    # 指向存在的其他 id、非自指、沿替代链两跳内无环。
    by_id: dict = {}
    for rule in rules:
        by_id.setdefault(rule["id"], rule)
    for rule in rules:
        target = rule.get("supersedes")
        if target is None:
            continue
        where = rule["id"] or "<空 id>"
        if target == rule["id"]:
            errors.append(f"{where}: supersedes 自指（不能指向自身）")
            continue
        if target not in by_id:
            errors.append(f"{where}: supersedes 指向不存在的 id: {target!r}")
            continue
        if by_id[target].get("supersedes") == rule["id"]:
            errors.append(f"{where}: supersedes 替代链两跳内成环: {where} → {target} → {where}")

    manual_review = [
        {"id": rule["id"], "summary": rule["summary"], "doc_anchor": rule["doc_anchor"]}
        for rule in rules
        if rule["enforcement"] == "manual"
    ]
    return errors, manual_review


def tally(rules: list[dict]) -> dict:
    counts: dict = {"total": len(rules)}
    for field, enum in (("level", LEVELS), ("enforcement", ENFORCEMENTS)):
        counts[field] = {name: 0 for name in enum}
        for rule in rules:
            if rule[field] in counts[field]:
                counts[field][rule[field]] += 1
    return counts


def render_human(counts: dict, errors: list[str], manual_review: list[dict]) -> str:
    lines: list[str] = []
    for error in errors:
        lines.append(f"ERROR: {error}")
    levels = counts["level"]
    enforcements = counts["enforcement"]
    lines.append(
        "rules: {total} (level: ban={ban}, hard={hard}, discipline={discipline}; "
        "enforcement: auto={auto}, manual={manual}, test={test})".format(
            total=counts["total"], **levels, **enforcements
        )
    )
    lines.append(f"人工复查项（enforcement=manual）: {len(manual_review)}")
    for item in manual_review:
        lines.append(f"  - {item['id']}: {item['summary']}")
    lines.append(f"RESULT: {'fail' if errors else 'ok'}")
    return "\n".join(lines)


LEVEL_TITLES = {"ban": "ban（禁令级）", "hard": "hard（硬约束）", "discipline": "discipline（纪律项）"}


def cell(value: str | None) -> str:
    """表格单元格：缺省字段 — 占位；竖线转义、换行折叠，保证单行且不破表。"""
    if value is None:
        return "—"
    return str(value).replace("|", "\\|").replace("\r", " ").replace("\n", " ").strip()


def status_text(rule: dict) -> str | None:
    """状态列文本：active（含缺省）为 None（渲染 —）；deprecated 附替代链与原因。"""
    if rule.get("status", "active") == "active":
        return None
    text = "deprecated"
    if rule.get("supersedes"):
        text += f" → {rule['supersedes']}"
    if rule.get("reason", "").strip():
        text += f"（{rule['reason']}）"
    return text


def render_traceability(rules: list[dict], manual_review: list[dict]) -> str:
    """规则追溯视图 markdown。确定性输出：排序按 registry 文件内顺序，无时间戳。

    渲染顺序固定为 LEVELS 三节（ban/hard/discipline），节内保持 registry 原序；
    每节九列表（「生效版本」「状态」两列为生命周期信息：状态列 active 含缺省
    渲染 —，deprecated 附「→ 被替代 id」与原因）；内容只由 registry 派生——
    同 registry 同输出，是幂等锁定的前提。
    """
    lines: list[str] = [
        "# 规则追溯视图（rule-traceability）",
        "",
        "> 生成物：勿手改。由 `scripts/rule_coverage.py --emit-doc` 从 "
        "`scripts/rule_registry.json` 渲染。",
        "> 再生成：`python3 scripts/rule_coverage.py --emit-doc`；入库后再生成 diff 须为空"
        "（幂等锁定：`scripts/tests/test_rule_registry.py::EmitDocCases`）。",
        "> 生成时间不写入本文件——时间戳破坏幂等，本文件禁含任何时间/随机内容。",
        "",
    ]
    for level in LEVELS:
        lines.append(f"## {LEVEL_TITLES[level]}")
        lines.append("")
        lines.append("| id | 概要 | 生效版本 | 状态 | enforcement | 文档锚点 | 检查器 | 夹具 | 测试 |")
        lines.append("| --- | --- | --- | --- | --- | --- | --- | --- | --- |")
        for rule in (r for r in rules if r["level"] == level):
            lines.append("| " + " | ".join((
                cell(rule["id"]),
                cell(rule["summary"]),
                cell(rule.get("since")),
                cell(status_text(rule)),
                cell(rule["enforcement"]),
                cell(rule["doc_anchor"]),
                cell(rule.get("checker")),
                cell(rule.get("fixture")),
                cell(rule.get("test")),
            )) + " |")
        lines.append("")
    lines.append("## 人工复查项清单")
    lines.append("")
    if manual_review:
        for item in manual_review:
            lines.append(f"- {cell(item['id'])}：{cell(item['summary'])}（{cell(item['doc_anchor'])}）")
    else:
        lines.append("（无）")
    lines.append("")
    counts = tally(rules)
    lines.append(
        "统计：rules={total}（level: ban={ban}, hard={hard}, discipline={discipline}；"
        "enforcement: auto={auto}, manual={manual}, test={test}）".format(
            total=counts["total"], **counts["level"], **counts["enforcement"]
        )
    )
    return "\n".join(lines) + "\n"


def write_atomic(path: Path, text: str) -> None:
    """原子写出：同目录临时文件 + rename，避免半截生成物。"""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(dir=path.parent, prefix=path.name + ".", suffix=".tmp")
    tmp = Path(tmp_name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
        os.replace(tmp, path)
    except BaseException:
        tmp.unlink(missing_ok=True)
        raise


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="规则注册表覆盖校验器（rule_registry.json）。")
    parser.add_argument("registry", nargs="?", type=Path, default=DEFAULT_REGISTRY, help="注册表路径（默认脚本同目录 rule_registry.json）")
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT, help="doc_anchor 与 checker/fixture/test 路径的解析根（默认仓库根）")
    parser.add_argument("--json", action="store_true", help="输出机器可读 JSON 结果")
    parser.add_argument(
        "--emit-doc",
        nargs="?",
        const=DEFAULT_EMIT_DOC,
        default=None,
        type=Path,
        metavar="PATH",
        help="校验全部通过后渲染规则追溯视图到 PATH（缺省 docs/rule-traceability.md，相对 --root 解析）",
    )
    args = parser.parse_args(argv)

    try:
        rules = load_registry(args.registry.resolve())
    except UsageError as exc:
        if args.json:
            print(json.dumps({"status": "error", "error": str(exc)}, ensure_ascii=False))
        else:
            print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    root = args.root.resolve()
    errors, manual_review = validate(rules, root)
    status = "fail" if errors else "ok"

    # emit 与校验正交：校验失败退出 1 且不写任何文件（失败路径零副作用）；
    # 相对路径按 --root 解析，绝对路径原样使用（pathlib 拼接语义）。
    emitted: Path | None = None
    if args.emit_doc is not None and status == "ok":
        target = root / args.emit_doc
        try:
            write_atomic(target, render_traceability(rules, manual_review))
        except OSError as exc:
            message = f"追溯视图写入失败: {exc}"
            if args.json:
                print(json.dumps({"status": "error", "error": message}, ensure_ascii=False))
            else:
                print(f"ERROR: {message}", file=sys.stderr)
            return 2
        emitted = target

    if args.json:
        print(json.dumps(
            {
                "status": status,
                "registry": str(args.registry),
                "root": str(args.root),
                "counts": tally(rules),
                "errors": errors,
                "manual_review": manual_review,
            },
            ensure_ascii=False,
        ))
    else:
        print(render_human(tally(rules), errors, manual_review))
        if emitted is not None:
            print(f"emitted: {emitted}")
    return {"ok": 0, "fail": 1}.get(status, 2)


if __name__ == "__main__":
    sys.exit(main())
