#!/usr/bin/env python3
"""visual_baseline_check.py — 视觉回归基线比对器（stdlib PNG 逐像素比对）。

把 references/visual-review.md §基线回归机制 的比对语义落成可执行规则：
- 比对政策只读复用 visual_review_check.alpha_aware_equal：同 RGB 异 alpha 判
  不等，三通道输入退化为 RGB 比较；**尺寸不一致默认判失败**（输出期望 vs 实际
  尺寸）；
- 差异像素占比 > threshold（默认 0.001 = 0.1%）判失败；逐图报告差异像素数、
  占比与差异坐标样本（上限 DIFF_SAMPLE_LIMIT，按行扫描先遇先记）；
- 逐行快路径：两图同一行原始字节相等即整行无差异，跳过逐像素比较（与
  alpha_aware_equal 语义恒等，只为加速同图自比对）；
- 基线只读：本工具不写任何基线文件。基线只能随判定通过的复采推进且在 spec 包
  记录（registry 条目 GVR-BASELINE-NO-AUTO-UPDATE），禁止自动更新/原地覆盖。

两种模式（--manifest 可与比对模式同用；校验模式必须与 --validate-only 搭配）：
- 比对：--baseline <dir> --capture <dir> [--manifest <path>] [--threshold N] [--json]
  ——先加载并校验 manifest（缺省 <baseline>/manifest.json，含图集与环境元数据），
  再遍历基线目录全部 PNG（文件名排序），在 capture 目录找同名文件逐图比对；
  缺 manifest、manifest 结构错误、基线图缺失或 sha256 不一致均退出 2，基线目录
  零 PNG 视为用法错误。
- 校验：--manifest <path> --validate-only——校验 manifest 结构（schema_version、
  version、source_pack、viewport、environment、source_commit、images 逐图
  file/route/theme/locale/sha256）与逐图 sha256 同磁盘一致；响应式图可另带
  breakpoint/viewport，breakpoint 限 xl/lg/md/sm，viewport 必须与 PNG 实际
  尺寸一致；供 spec 包 verify 快速自证。manifest 结构错误、路径非法（绝对路径/
  `..`/反斜杠）、文件缺失或 sha256 不一致均退出 2。

PNG 支持边界：8-bit、非隔行、真彩 RGB（color_type 2）与 RGBA（color_type 6）、
compression/filter method 0。灰度（0）、调色板（3）、灰度+alpha（4）、16-bit、
隔行（Adam7）等一律明确报错退出 2。解码仅用 zlib + struct：PNG 签名与逐 chunk
CRC 校验、IDAT 拼接解压、0–4 五类滤波重建（None/Sub/Up/Average/Paeth）。

输出：默认人读逐图一行 + 末行 RESULT；--json 输出 {status, baseline, capture,
threshold, images:[{file, status, diff_pixels, total_pixels, ratio, size,
diff_samples}]}（missing 项仅 file/status；校验模式 {status, manifest,
images:[{file, status}]}）。退出码：0 全部通过 / 1 有失败或缺失 / 2 用法、IO、
manifest 或 PNG 格式错误。仅标准库；不联网、不渲染页面。
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import struct
import sys
import zlib
from pathlib import Path

try:  # 脚本直跑时 sys.path[0] 即 scripts/ 目录，比对政策就近复用
    from visual_review_check import alpha_aware_equal
except ImportError:  # 作为模块被导入（如测试加载器）时回退到脚本同目录
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from visual_review_check import alpha_aware_equal

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
SUPPORTED_COLOR_TYPES = {2: 3, 6: 4}  # color_type -> 通道数（RGB / RGBA）
DEFAULT_THRESHOLD = 0.001
DIFF_SAMPLE_LIMIT = 10
MANIFEST_REQUIRED_KEYS = ("schema_version", "version", "source_pack", "viewport", "environment", "source_commit", "images")
IMAGE_REQUIRED_KEYS = ("file", "route", "theme", "locale", "sha256")
ENV_REQUIRED_KEYS = ("viewport", "dpr", "browser", "os", "font_env", "engine", "page_scale")
RESPONSIVE_BREAKPOINT_NAMES = ("xl", "lg", "md", "sm")
VIEWPORT_RE = re.compile(r"^(\d+)x(\d+)$")


class PngFormatError(Exception):
    """PNG 格式不支持或数据损坏——对应退出码 2。"""


class UsageError(Exception):
    """用法/IO/manifest 形态错误——对应退出码 2。"""


# ---------------------------------------------------------------------------
# PNG 解码（仅 8-bit 非隔行真彩）
# ---------------------------------------------------------------------------


def decode_png(data: bytes, origin: str = "") -> tuple[int, int, int, list[bytes]]:
    """解码 8-bit 非隔行 RGB/RGBA PNG，返回 (width, height, channels, rows)。

    rows 为逐行滤波重建后的原始字节（每行 channels*width 字节，RGBA 每像素
    4 字节，保留原始 alpha——比对政策要求透明资产不压平背景）。origin 仅用于
    错误消息定位。
    """
    where = f"{origin}: " if origin else ""
    if not data.startswith(PNG_SIGNATURE):
        raise PngFormatError(f"{where}PNG 签名不匹配（非 PNG 或已损坏）")
    ihdr: bytes | None = None
    idat = bytearray()
    seen_iend = False
    pos = len(PNG_SIGNATURE)
    while pos + 8 <= len(data):
        (length,) = struct.unpack(">I", data[pos : pos + 4])
        ctype = data[pos + 4 : pos + 8]
        start = pos + 8
        end = start + length
        if end + 4 > len(data):
            raise PngFormatError(f"{where}chunk {ctype!r} 数据越界（文件截断）")
        chunk = data[start:end]
        (crc_stored,) = struct.unpack(">I", data[end : end + 4])
        if zlib.crc32(ctype + chunk) & 0xFFFFFFFF != crc_stored:
            raise PngFormatError(f"{where}chunk {ctype!r} CRC 校验失败")
        if ctype == b"IHDR":
            ihdr = chunk
        elif ctype == b"IDAT":
            idat.extend(chunk)
        elif ctype == b"IEND":
            seen_iend = True
            break
        pos = end + 4
    if ihdr is None:
        raise PngFormatError(f"{where}缺 IHDR chunk")
    if not seen_iend:
        raise PngFormatError(f"{where}缺 IEND chunk（文件截断）")
    if len(ihdr) != 13:
        raise PngFormatError(f"{where}IHDR 长度非法: {len(ihdr)}")
    width, height, bit_depth, color_type, compression, filter_method, interlace = struct.unpack(
        ">IIBBBBB", ihdr
    )
    if width == 0 or height == 0:
        raise PngFormatError(f"{where}尺寸非法: {width}x{height}")
    if color_type not in SUPPORTED_COLOR_TYPES:
        raise PngFormatError(
            f"{where}不支持的 color_type {color_type}（仅支持真彩 RGB=2 / RGBA=6；"
            "灰度、调色板、灰度+alpha 不在基线比对支持面）"
        )
    if bit_depth != 8:
        raise PngFormatError(f"{where}不支持的位深 {bit_depth}（仅支持 8-bit）")
    if interlace != 0:
        raise PngFormatError(f"{where}不支持隔行（Adam7）PNG")
    if compression != 0 or filter_method != 0:
        raise PngFormatError(
            f"{where}不支持的 compression={compression} / filter_method={filter_method}（仅支持 0/0）"
        )
    channels = SUPPORTED_COLOR_TYPES[color_type]
    try:
        raw = zlib.decompress(bytes(idat))
    except zlib.error as exc:
        raise PngFormatError(f"{where}IDAT 解压失败: {exc}") from exc
    stride = width * channels
    if len(raw) != (stride + 1) * height:
        raise PngFormatError(
            f"{where}解压后数据长度不符: 期望 {(stride + 1) * height} 字节，实际 {len(raw)}"
        )
    return width, height, channels, _reconstruct_filters(raw, width, height, channels, where)


def _reconstruct_filters(
    raw: bytes, width: int, height: int, channels: int, where: str
) -> list[bytes]:
    """滤波重建（PNG 规范 0–4 五类），返回逐行原始字节。"""
    stride = width * channels
    rows: list[bytes] = []
    prior = bytes(stride)
    pos = 0
    for _ in range(height):
        ftype = raw[pos]
        pos += 1
        line = bytearray(raw[pos : pos + stride])
        pos += stride
        if ftype == 0:  # None
            pass
        elif ftype == 1:  # Sub
            for i in range(channels, stride):
                line[i] = (line[i] + line[i - channels]) & 0xFF
        elif ftype == 2:  # Up
            for i in range(stride):
                line[i] = (line[i] + prior[i]) & 0xFF
        elif ftype == 3:  # Average
            for i in range(stride):
                left = line[i - channels] if i >= channels else 0
                line[i] = (line[i] + ((left + prior[i]) >> 1)) & 0xFF
        elif ftype == 4:  # Paeth
            for i in range(stride):
                a = line[i - channels] if i >= channels else 0
                b = prior[i]
                c = prior[i - channels] if i >= channels else 0
                p = a + b - c
                pa = abs(p - a)
                pb = abs(p - b)
                pc = abs(p - c)
                if pa <= pb and pa <= pc:
                    predictor = a
                elif pb <= pc:
                    predictor = b
                else:
                    predictor = c
                line[i] = (line[i] + predictor) & 0xFF
        else:
            raise PngFormatError(f"{where}未知滤波类型 {ftype}（合法 0–4）")
        prior = bytes(line)
        rows.append(prior)
    return rows


# ---------------------------------------------------------------------------
# 比对
# ---------------------------------------------------------------------------


def compare_images(
    baseline: tuple[int, int, int, list[bytes]],
    capture: tuple[int, int, int, list[bytes]],
) -> tuple[int, int, list[list[int]]]:
    """逐像素比对，返回 (diff_pixels, total_pixels, diff_samples)。

    前置：两图宽高一致（尺寸不一致由调用方按协议直接判失败，不进入本函数）。
    差异判定复用 alpha_aware_equal：同 RGB 异 alpha 判不等，三通道输入退化为
    RGB 比较。逐行快路径：同通道且整行字节相等即无差异。
    """
    width, height, channels, rows = baseline
    channels_b, rows_b = capture[2], capture[3]
    total = width * height
    diff = 0
    samples: list[list[int]] = []
    same_channels = channels == channels_b
    for y in range(height):
        row_a = rows[y]
        row_b = rows_b[y]
        if same_channels and row_a == row_b:
            continue
        for x in range(width):
            if not alpha_aware_equal(
                row_a[x * channels : (x + 1) * channels],
                row_b[x * channels_b : (x + 1) * channels_b],
            ):
                diff += 1
                if len(samples) < DIFF_SAMPLE_LIMIT:
                    samples.append([x, y])
    return diff, total, samples


def load_png(path: Path) -> tuple[int, int, int, list[bytes]]:
    try:
        data = path.read_bytes()
    except OSError as exc:
        raise UsageError(f"文件读取失败: {path} ({exc})") from exc
    return decode_png(data, origin=path.name)


# ---------------------------------------------------------------------------
# manifest 校验（--validate-only）
# ---------------------------------------------------------------------------


def _clean_relpath(value) -> str | None:
    """manifest 内文件路径安全形态：相对、正斜杠、无 `..` 段。"""
    if not isinstance(value, str) or not value.strip():
        return None
    if "\\" in value or value.startswith("/") or value.startswith("~"):
        return None
    parts = value.split("/")
    if any(part in {"", ".", ".."} for part in parts):
        return None
    return value


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(65536), b""):
            digest.update(block)
    return digest.hexdigest()


def _validate_responsive_entry(
    image: dict, label: str, target: Path, rel: str, errors: list[str]
) -> None:
    """响应式图的可选结构断言：断点档位 + viewport 与实际 PNG 尺寸一致。

    桌面基线不含 breakpoint/viewport 字段，行为保持原样；响应式基线一旦声明
    这两个字段就必须同时可校验，防止截图尺寸与响应式断言脱节。
    """
    if "breakpoint" not in image and "viewport" not in image:
        return
    breakpoint = image.get("breakpoint")
    viewport = image.get("viewport")
    if not isinstance(breakpoint, str) or breakpoint not in RESPONSIVE_BREAKPOINT_NAMES:
        errors.append(
            f"{label}.breakpoint 必须为 {'/'.join(RESPONSIVE_BREAKPOINT_NAMES)} 之一"
        )
    match = VIEWPORT_RE.fullmatch(viewport) if isinstance(viewport, str) else None
    if match is None:
        errors.append(f"{label}.viewport 必须为 <宽>x<高>（如 375x900）")
        return
    try:
        width, height, _channels, _rows = decode_png(target.read_bytes(), origin=rel)
    except (OSError, PngFormatError) as exc:
        errors.append(f"{label}.file PNG 读取/解码失败: {rel} ({exc})")
        return
    expected = (int(match.group(1)), int(match.group(2)))
    if (width, height) != expected:
        errors.append(
            f"{label}.viewport 与 PNG 实际尺寸不一致: {viewport} != {width}x{height}"
        )


def validate_manifest(record, root: Path) -> tuple[list[str], list[str]]:
    """校验 manifest 结构与逐图 sha256。返回 (oks, errors)：errors 非空即失败。

    结构（schema v1）：{schema_version=1, version, source_pack, viewport 非空
    字符串, environment 对象（viewport/dpr/browser/os/font_env/engine/page_scale
    非空）, source_commit 非空字符串, images 非空数组且逐图
    file/route/theme/locale 非空字符串、sha256 为 64 位 hex；file 为安全相对
    路径且不重复}。结构与磁盘检查合并报错——本模式供 verify 快速自证，
    manifest 与磁盘不一致即该基线不可信。
    """
    errors: list[str] = []
    oks: list[str] = []
    if not isinstance(record, dict):
        return oks, ["manifest 必须是 JSON 对象"]
    for key in MANIFEST_REQUIRED_KEYS:
        if key not in record:
            errors.append(f"缺必需字段 {key}")
    if record.get("schema_version") != 1:
        errors.append("schema_version 必须为 1")
    for key in ("version", "source_pack", "viewport"):
        value = record.get(key)
        if not isinstance(value, str) or not value.strip():
            errors.append(f"{key} 必须为非空字符串")
    source_commit = record.get("source_commit")
    if not isinstance(source_commit, str) or not source_commit.strip():
        errors.append("source_commit 必须为非空字符串")
    environment = record.get("environment")
    if not isinstance(environment, dict):
        errors.append("environment 必须为对象")
    else:
        for key in ENV_REQUIRED_KEYS:
            value = environment.get(key)
            if value is None or (isinstance(value, str) and not value.strip()):
                errors.append(f"environment.{key} 必须为非空值")
    images = record.get("images")
    if not isinstance(images, list) or not images:
        errors.append("images 必须为非空数组")
        return oks, errors
    seen: set[str] = set()
    for index, image in enumerate(images):
        label = f"images[{index}]"
        if not isinstance(image, dict):
            errors.append(f"{label} 必须是对象")
            continue
        for key in IMAGE_REQUIRED_KEYS:
            if key not in image:
                errors.append(f"{label} 缺必需字段 {key}")
        for key in ("route", "theme", "locale"):
            value = image.get(key)
            if not isinstance(value, str) or not value.strip():
                errors.append(f"{label}.{key} 必须为非空字符串")
        digest = image.get("sha256")
        if not isinstance(digest, str) or len(digest) != 64:
            errors.append(f"{label}.sha256 必须为 64 位 hex 摘要")
        rel = _clean_relpath(image.get("file"))
        if rel is None:
            errors.append(f"{label}.file 必须为安全相对路径（正斜杠、无 .. 与绝对路径）")
            continue
        if rel in seen:
            errors.append(f"{label}.file 重复: {rel}")
            continue
        seen.add(rel)
        target = root / rel
        if not target.is_file():
            errors.append(f"{label}.file 不存在: {rel}")
            continue
        if isinstance(digest, str) and len(digest) == 64:
            try:
                actual = _sha256(target)
            except OSError as exc:
                errors.append(f"{label}.file 读取失败: {rel} ({exc})")
                continue
            if actual != digest.lower():
                errors.append(f"{label}.sha256 与磁盘内容不一致: {rel}")
                continue
        _validate_responsive_entry(image, label, target, rel, errors)
        if any(error.startswith(f"{label}.") for error in errors):
            continue
        oks.append(rel)
    return oks, errors


# ---------------------------------------------------------------------------
# 输出与 CLI
# ---------------------------------------------------------------------------


def _ratio(diff: int, total: int) -> float:
    return diff / total if total else 0.0


def _print_validate_report(oks: list[str], errors: list[str], images: list) -> None:
    for rel in oks:
        print(f"{rel}: sha256 ok")
    for error in errors:
        print(f"ERROR: {error}", file=sys.stderr)
    print(f"images: {len(images)}")
    print(f"RESULT: {'invalid' if errors else 'ok'}")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        description="视觉回归基线比对器（--baseline/--capture 或 --manifest --validate-only）。"
    )
    parser.add_argument("--baseline", type=Path, help="基线目录（内含 PNG）")
    parser.add_argument("--capture", type=Path, help="复采目录（与基线同名文件逐图比对）")
    parser.add_argument(
        "--threshold",
        type=float,
        default=DEFAULT_THRESHOLD,
        help=f"差异像素占比阈值（默认 {DEFAULT_THRESHOLD} = 0.1%%；占比 > 阈值判失败）",
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        help="基线 manifest 路径（--validate-only 必需；比对模式缺省读取 <baseline>/manifest.json）",
    )
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="只校验 manifest 结构与逐图 sha256，不做像素比对",
    )
    parser.add_argument("--json", action="store_true", help="输出机器可读 JSON 结果")
    args = parser.parse_args(argv)

    if args.validate_only:
        if args.manifest is None:
            parser.error("--validate-only 必须与 --manifest 搭配使用")
        if args.baseline is not None or args.capture is not None:
            parser.error("--validate-only 与 --baseline/--capture 互斥")
    else:
        if args.baseline is None or args.capture is None:
            parser.error("需要 --baseline 与 --capture（或 --manifest 与 --validate-only）")
    if args.threshold < 0 or math.isnan(args.threshold) or math.isinf(args.threshold):
        parser.error(f"--threshold 必须为非负有限数（得到 {args.threshold}）")

    if args.validate_only:
        manifest_path = args.manifest
        if not manifest_path.is_file():
            print(f"usage error: manifest 不存在: {manifest_path}", file=sys.stderr)
            return 2
        try:
            record = json.loads(manifest_path.read_text(encoding="utf-8"))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            print(f"usage error: manifest 无法解析: {exc}", file=sys.stderr)
            return 2
        oks, errors = validate_manifest(record, manifest_path.resolve().parent)
        raw_images = record.get("images") if isinstance(record, dict) else []
        if args.json:
            print(json.dumps(
                {
                    "status": "ok" if not errors else "invalid",
                    "manifest": str(manifest_path),
                    "images": [
                        {"file": rel, "status": "ok"} for rel in oks
                    ],
                    "errors": errors,
                },
                ensure_ascii=False,
            ))
        else:
            _print_validate_report(oks, errors, images=raw_images or [])
        return 2 if errors else 0

    baseline_dir: Path = args.baseline
    capture_dir: Path = args.capture
    if not baseline_dir.is_dir():
        print(f"usage error: 基线目录不存在: {baseline_dir}", file=sys.stderr)
        return 2
    if not capture_dir.is_dir():
        print(f"usage error: 复采目录不存在: {capture_dir}", file=sys.stderr)
        return 2
    baseline_pngs = sorted(
        p for p in baseline_dir.iterdir() if p.is_file() and p.suffix.lower() == ".png"
    )
    if not baseline_pngs:
        print(f"usage error: 基线目录无 PNG: {baseline_dir}", file=sys.stderr)
        return 2
    manifest_path = args.manifest if args.manifest is not None else baseline_dir / "manifest.json"
    if not manifest_path.is_file():
        print(f"usage error: 比对模式需要基线 manifest，未找到: {manifest_path}", file=sys.stderr)
        return 2
    try:
        manifest_record = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        print(f"usage error: manifest 无法解析: {exc}", file=sys.stderr)
        return 2
    _, manifest_errors = validate_manifest(manifest_record, manifest_path.resolve().parent)
    if manifest_errors:
        for error in manifest_errors:
            print(f"ERROR: {error}", file=sys.stderr)
        print("RESULT: invalid")
        return 2

    entries: list[dict] = []
    failed = False
    for png in baseline_pngs:
        capture_path = capture_dir / png.name
        if not capture_path.is_file():
            entries.append({"file": png.name, "status": "missing"})
            failed = True
            if not args.json:
                print(f"{png.name}: missing（capture 目录无同名文件）")
            continue
        try:
            base_dec = load_png(png)
            cap_dec = load_png(capture_path)
        except PngFormatError as exc:
            print(f"usage error: PNG 格式错误 — {exc}", file=sys.stderr)
            return 2
        except UsageError as exc:
            print(f"usage error: {exc}", file=sys.stderr)
            return 2
        wb, hb = base_dec[0], base_dec[1]
        wc, hc = cap_dec[0], cap_dec[1]
        if (wb, hb) != (wc, hc):
            entry = {
                "file": png.name,
                "status": "fail",
                "reason": "size-mismatch",
                "size": {"baseline": [wb, hb], "capture": [wc, hc]},
                "diff_pixels": None,
                "total_pixels": wb * hb,
                "ratio": 1.0,
                "diff_samples": [],
            }
            failed = True
        else:
            diff, total, samples = compare_images(base_dec, cap_dec)
            ratio = _ratio(diff, total)
            over = ratio > args.threshold
            failed = failed or over
            entry = {
                "file": png.name,
                "status": "fail" if over else "match",
                "size": {"baseline": [wb, hb], "capture": [wc, hc]},
                "diff_pixels": diff,
                "total_pixels": total,
                "ratio": ratio,
                "diff_samples": samples,
            }
        entries.append(entry)
        if not args.json:
            print(_human_line(entry, args.threshold))

    status = "fail" if failed else "pass"
    if args.json:
        print(json.dumps(
            {
                "status": status,
                "baseline": str(baseline_dir),
                "capture": str(capture_dir),
                "threshold": args.threshold,
                "images": entries,
            },
            ensure_ascii=False,
        ))
    else:
        print(f"RESULT: {status}")
    return 1 if failed else 0


def _human_line(entry: dict, threshold: float) -> str:
    if entry["status"] == "missing":
        return f"{entry['file']}: missing（capture 目录无同名文件）"
    wb, hb = entry["size"]["baseline"]
    wc, hc = entry["size"]["capture"]
    if entry.get("reason") == "size-mismatch":
        return (
            f"{entry['file']}: FAIL（尺寸不一致默认判失败 — 期望 {wb}x{hb}，"
            f"实际 {wc}x{hc}）"
        )
    ratio = entry["ratio"]
    diff = entry["diff_pixels"]
    total = entry["total_pixels"]
    verdict = "FAIL" if entry["status"] == "fail" else "match"
    line = f"{entry['file']}: {verdict}（差异 {diff}/{total}，{ratio:.4%}"
    if entry["status"] == "fail":
        line += f" > 阈值 {threshold:.4%}"
    line += f"；尺寸 {wb}x{hb}"
    if entry["diff_samples"]:
        coords = " ".join(f"({x},{y})" for x, y in entry["diff_samples"])
        line += f"；差异样本 {coords}"
    line += "）"
    return line


if __name__ == "__main__":
    sys.exit(main())
