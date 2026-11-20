#!/usr/bin/env python3
"""token_scan.py — token 一致性机检（design-tokens 篇「token 真源」条文的机械面）。

design-tokens 篇真源跟随规则：样式值必须经 token 真源（主题配置文件
src/theme/tokens.ts 的 theme.token / theme.components 段）解析落地，页面/组件层
散落的裸样式字面量即「绕过 token——偏离必须改真源并带 why 注释」。本工具对其
做行级正则匹配，无 AST，与 ban_scan.py 同一最小化立场：误报优先通过扫描面收窄
与豁免形态消除，残余近似如实记录，findings 由人裁定。

扫描面：CLI 目标目录（或单个 .ts/.tsx 文件），递归收集 .ts/.tsx。永久排除目录：
node_modules/、.umi*/、dist/、coverage/、__pycache__/。白名单（不扫描）：文件名
含 .test. 的测试文件、路径段 src/theme/tokens.ts（token 唯一真源，色值只允许在
真源落地）。.less/.css 不扫：global.less 高度链 calc 是规范明文允许的骨架层形态。

违禁形态（逐行匹配；同一行同一形态只记一条，列取首个非豁免命中；人读输出为
文件:行:行内摘要，--json 另附 column）：
- hex-color：#RGB / #RRGGBB / #RRGGBBAA（大小写不敏感）。要求命中后随字符不是
  字母数字或 URL 路径续符（/ . _ ~ ? & % = $ : @ # -），以放行 #anchor 等 URL
  锚点/路由 hash——这是近似边界：#fff.jpg 这类「3 位 hex + 路径点」仍会命中，
  非法色值长度（#1234、#12345、10 位以上）一律不命中。
- rgb-func：rgb( / rgba( 函数调用（形态前无字母：srgb(、Rgba( 不命中）。
- px-literal：数字+px 字面量（含小数与负号）。豁免：数值为零（0px / 0.0px /
  -0px）；calc(...) 括号表达式整段豁免——按括号配平提取（支持嵌套），行内以
  等长空格掩膜后匹配，列偏移不受影响。

输出：默认人读按形态分组逐条 {path, line, snippet≤120} + scanned / findings /
RESULT 汇总；--json 输出 {status, scanned, counts, findings, errors}，findings
逐条 {rule_id, path, line, column, snippet}。退出码：0 干净 / 1 存在违例 / 2
用法或 IO 错误（缺参数、目标路径不存在、扫描面零文件、单文件读取失败）。豁免
全部内置、无外部豁免配置：扩大豁免必须改本文件并补 fixtures/测试，禁止为过门
临时放宽形态。
"""

from __future__ import annotations

import argparse
import codecs
import json
import os
import re
import sys
from pathlib import Path

SCAN_EXTENSIONS = {".ts", ".tsx"}
EXCLUDED_DIR_NAMES = {"node_modules", "dist", "coverage", "__pycache__"}
EXCLUDED_DIR_PREFIXES = (".umi",)
TOKEN_SOURCE_SEGMENTS = ("src", "theme", "tokens.ts")
SNIPPET_MAX_CHARS = 120
CALC_OPEN = "calc("

# 十六进制色：{3} 精确定长起配（3/6/8 位三种合法色值长度），后随负向断言排除
# 字母数字与 URL 路径续符——两者合起来放行 #anchor（凑不满 3 位 hex）与
# #2026-recap（3 位 hex 后接字母数字续符），同时拒绝 #1234 / #12345 等非法长度。
HEX_COLOR_RE = re.compile(
    r"#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3}(?:[0-9a-fA-F]{2})?)?(?![0-9A-Za-z/._~?&%=$:@#-])"
)
RGB_FUNC_RE = re.compile(r"(?<![a-zA-Z])rgba?\(")
PX_LITERAL_RE = re.compile(r"-?\d+(?:\.\d+)?px")

RULES = (
    ("hex-color", HEX_COLOR_RE),
    ("rgb-func", RGB_FUNC_RE),
    ("px-literal", PX_LITERAL_RE),
)

HELP_EPILOG = """\
违禁形态与豁免（全部内置，无外部豁免配置；扩大豁免须改本文件并补 fixtures/测试）:
  hex-color   #RGB / #RRGGBB / #RRGGBBAA（大小写不敏感）；后随字符为字母数字或
              URL 路径续符(/ . _ ~ ? & % = $ : @ # -)时不命中——近似边界：#fff.jpg
              这类 3 位 hex + 路径点仍会命中，#1234/#12345 等非法长度不命中
  rgb-func    rgb( / rgba(（形态前无字母，srgb( 不命中）
  px-literal  数字+px；0px / 0.0px / -0px 零值豁免；calc(...) 括号表达式整段豁免
白名单: *.test.* 文件、路径段 src/theme/tokens.ts（token 真源）不扫描
排除目录: node_modules/ .umi*/ dist/ coverage/ __pycache__/；仅扫 .ts/.tsx
退出码: 0 干净 / 1 存在违例 / 2 用法或 IO 错误（缺参数/目标不存在/扫描面零文件）"""


class FileScanError(Exception):
    """单文件读取失败——记入 errors，扫描继续，最终退出码 2。"""


def mask_calc_spans(line: str) -> str:
    """calc(...) 括号表达式整段替换为等长空格（括号配平、支持嵌套），保留列偏移；
    未配平的残缺 calc( 不掩膜（行级近似，残余交由人判读）。"""
    chars = list(line)
    lower = line.lower()
    start = lower.find(CALC_OPEN)
    while start != -1:
        depth = 1
        cursor = start + len(CALC_OPEN)
        while cursor < len(line) and depth:
            if line[cursor] == "(":
                depth += 1
            elif line[cursor] == ")":
                depth -= 1
            cursor += 1
        if depth == 0:
            for index in range(start, cursor):
                chars[index] = " "
            start = lower.find(CALC_OPEN, cursor)
        else:
            start = lower.find(CALC_OPEN, start + len(CALC_OPEN))
    return "".join(chars)


def first_hit_column(rule_id: str, regex: re.Pattern[str], line: str) -> int | None:
    """该行该形态首个非豁免命中的 0 起始列；无命中返回 None。"""
    text = mask_calc_spans(line) if rule_id == "px-literal" else line
    for match in regex.finditer(text):
        if rule_id == "px-literal" and float(match.group(0).removesuffix("px")) == 0.0:
            continue  # 0px / 0.0px / -0px：零值豁免
        return match.start()
    return None


def scan_lines(path: Path, text: str) -> list[dict]:
    findings: list[dict] = []
    for lineno, line in enumerate(text.split("\n"), start=1):
        for rule_id, regex in RULES:
            column = first_hit_column(rule_id, regex, line)
            if column is not None:
                findings.append({
                    "rule_id": rule_id,
                    "path": str(path),
                    "line": lineno,
                    "column": column + 1,
                    "snippet": line.strip()[:SNIPPET_MAX_CHARS],
                })
    return findings


def is_whitelisted(path: Path) -> bool:
    return ".test." in path.name or path.parts[-len(TOKEN_SOURCE_SEGMENTS):] == TOKEN_SOURCE_SEGMENTS


def iter_scan_files(root: Path):
    """确定性收集（目录与文件名排序）；白名单与排除目录在收集期剔除。"""
    if root.is_file():
        if root.suffix.lower() in SCAN_EXTENSIONS and not is_whitelisted(root):
            yield root
        return
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(
            d for d in dirnames
            if d not in EXCLUDED_DIR_NAMES and not d.startswith(EXCLUDED_DIR_PREFIXES)
        )
        for name in sorted(filenames):
            path = Path(dirpath) / name
            if path.suffix.lower() not in SCAN_EXTENSIONS or is_whitelisted(path):
                continue
            yield path


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


def scan(root: Path) -> tuple[list[dict], list[dict], int]:
    """返回 (findings, errors, scanned)：单文件失败记入 errors 后继续。"""
    findings: list[dict] = []
    errors: list[dict] = []
    scanned = 0
    for path in iter_scan_files(root):
        scanned += 1
        try:
            findings.extend(scan_lines(path, read_source(path)))
        except FileScanError as exc:
            errors.append({"path": str(path), "error": str(exc)})
    return findings, errors, scanned


def render_human(findings: list[dict], errors: list[dict], scanned: int, status: str) -> str:
    lines: list[str] = []
    by_rule: dict[str, list[dict]] = {}
    for finding in findings:
        by_rule.setdefault(finding["rule_id"], []).append(finding)
    for rule_id, _regex in RULES:
        if rule_id not in by_rule:
            continue
        lines.append(f"{rule_id} ({len(by_rule[rule_id])}):")
        for finding in by_rule[rule_id]:
            lines.append(f"  {finding['path']}:{finding['line']}: {finding['snippet']}")
    for error in errors:
        lines.append(f"ERROR: {error['path']}: {error['error']}")
    if scanned == 0:
        lines.append("ERROR: 扫描面零文件（目标下没有 .ts/.tsx 文件），不能判定为干净")
    counts = ", ".join(f"{rule_id}={len(by_rule[rule_id])}" for rule_id, _regex in RULES if rule_id in by_rule)
    lines.append(f"scanned: {scanned} files")
    lines.append(f"findings: {len(findings)} ({counts or 'none'})")
    lines.append(f"RESULT: {status}")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="token 一致性机检：页面/组件层 .ts/.tsx 裸样式字面量检查。",
        epilog=HELP_EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("target", type=Path, help="扫描目标目录（或单个 .ts/.tsx 文件）")
    parser.add_argument("--json", action="store_true", help="输出机器可读 JSON 结果（findings 附 column，1 起始行内列）")
    args = parser.parse_args(argv)

    target = args.target.resolve()
    if not target.exists():
        message = f"目标路径不存在: {target}"
        if args.json:
            print(json.dumps({"status": "error", "error": message}, ensure_ascii=False))
        else:
            print(f"ERROR: {message}", file=sys.stderr)
        return 2

    findings, errors, scanned = scan(target)
    status = "error" if errors or scanned == 0 else ("dirty" if findings else "clean")
    counts: dict[str, int] = {}
    for finding in findings:
        counts[finding["rule_id"]] = counts.get(finding["rule_id"], 0) + 1
    if args.json:
        print(json.dumps(
            {"status": status, "scanned": scanned, "counts": counts,
             "findings": findings, "errors": errors},
            ensure_ascii=False,
        ))
    else:
        print(render_human(findings, errors, scanned, status))
    if status == "error":
        return 2
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())
