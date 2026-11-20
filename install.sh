#!/usr/bin/env bash
# install.sh — enterprise-frontend skill 宿主无关安装器（D15：仅接受用户指定目录，
# 无任何宿主自动发现/自动全局安装）。
#
# 依赖：bash >=3.2、python3 >=3.9、coreutils（mkdir/mv/rm/mktemp/dirname/diff/find）。
# 行为契约：候选暂存 → 内容 diff 幂等检测 → 既有安装移备份（默认开，落目标侧）→
# 原子 mv 就位 → 装后校验 → 任一步失败回滚；回滚失败保留备份并如实报告。
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_NAME="enterprise-frontend"
DEFAULT_SKILL_DIR="$SCRIPT_DIR/$SKILL_NAME"

usage() {
  cat <<'USAGE'
用法: ./install.sh <目标目录> [选项]
  --skill-dir <path>   源 skill 目录（默认: 脚本所在目录下的 enterprise-frontend/）
  --force              强制替换内容不同（或已损坏）的既有安装
  --no-backup          替换时不保留旧安装备份
  --dry-run            只打印将执行的动作，不写盘
  -h | --help          本帮助
退出码: 0 = 成功或已最新；1 = 安装失败（含已回滚）；2 = 用法/前置校验失败
依赖: bash >=3.2、python3 >=3.9、coreutils（mkdir/mv/rm/mktemp/dirname/diff/find）
USAGE
}

die_usage() {
  echo "ERROR: $1" >&2
  usage >&2
  exit 2
}

TARGET_DIR=""
SKILL_DIR=""
FORCE=0
NO_BACKUP=0
DRY_RUN=0

while [ $# -gt 0 ]; do
  case "$1" in
    --skill-dir)
      [ $# -ge 2 ] || die_usage "--skill-dir 需要一个路径参数"
      SKILL_DIR="$2"
      shift 2
      ;;
    --force)
      FORCE=1
      shift
      ;;
    --no-backup)
      NO_BACKUP=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      die_usage "未知选项: $1"
      ;;
    *)
      if [ -n "$TARGET_DIR" ]; then
        die_usage "多余的位置参数: $1"
      fi
      TARGET_DIR="$1"
      shift
      ;;
  esac
done

[ -n "$TARGET_DIR" ] || die_usage "缺少位置参数 <目标目录>"
[ -n "$SKILL_DIR" ] || SKILL_DIR="$DEFAULT_SKILL_DIR"
[ -d "$SKILL_DIR" ] || die_usage "源 skill 目录不存在: $SKILL_DIR"
[ -f "$SKILL_DIR/SKILL.md" ] || die_usage "源 skill 目录缺 SKILL.md: $SKILL_DIR"

# 目标与源相同或互为祖先/后代 → 拒绝（python3 内联 realpath 前缀检查）
if ! python3 - "$TARGET_DIR" "$SKILL_DIR" <<'PYEOF'
import os, sys
t = os.path.realpath(sys.argv[1])
s = os.path.realpath(sys.argv[2])
def nested(a, b):
    a = a.rstrip(os.sep) + os.sep
    b = b.rstrip(os.sep) + os.sep
    return b.startswith(a)
sys.exit(0 if not (nested(t, s) or nested(s, t)) else 1)
PYEOF
then
  die_usage "目标目录与源 skill 目录相同或互为祖先/后代"
fi

INSTALL_DIR="$TARGET_DIR/$SKILL_NAME"

# 交付面 = manifest.runtime 闭式清单 + manifest.json（与 build_package.py 同口径）。
# 预检：manifest 可读、runtime 为非空相对路径数组、条目全部存在且落在源目录内；
# 条目不得为 `.`、纯/内嵌 `..`、绝对路径或 resolve 后越界。git 跟踪模式下显式文件条目
# 必须在索引中（未跟踪或被忽略 → 拒绝）。任一不满足 → 用法错误 exit 2。
if ! RUNTIME_ERR="$(python3 - "$SKILL_DIR" <<'PYEOF' 2>&1
import json, os, subprocess, sys
skill = sys.argv[1]
try:
    with open(os.path.join(skill, "manifest.json"), encoding="utf-8") as fh:
        runtime = json.load(fh).get("runtime")
except (OSError, ValueError, AttributeError) as exc:
    sys.exit(f"manifest.json 不可读或非法: {exc}")
if not isinstance(runtime, list) or not runtime or not all(isinstance(e, str) and e for e in runtime):
    sys.exit("manifest.json 缺 runtime 闭式清单（非空字符串数组）")
real_root = os.path.realpath(skill)
for entry in runtime:
    if os.path.isabs(entry):
        sys.exit(f"runtime 条目越界（绝对路径）: {entry}")
    parts = entry.replace("\\", "/").split("/")
    norm = os.path.normpath(entry)
    if norm in (".", "") or any(part == ".." for part in parts):
        sys.exit(f"runtime 条目越界（不得为 . 或含 .. 段）: {entry}")
    if not os.path.lexists(os.path.join(skill, norm)):
        sys.exit(f"runtime 条目缺失: {entry}")
    real_entry = os.path.realpath(os.path.join(skill, norm))
    try:
        inside = os.path.commonpath([real_root, real_entry]) == real_root
    except ValueError:
        inside = False
    if not inside:
        sys.exit(f"runtime 条目 resolve 后越出源目录: {entry}")
def git(*args):
    try:
        return subprocess.run(["git", "-C", skill, *args], capture_output=True, check=True).stdout
    except (OSError, subprocess.CalledProcessError):
        return None
# git 跟踪模式（SKILL.md 已跟踪）下，显式文件条目必须以索引为边界；目录条目在暂存时按 tracked 收集。
if git("ls-files", "--error-unmatch", "--", "SKILL.md") is not None:
    for entry in runtime:
        norm = os.path.normpath(entry)
        if os.path.isdir(os.path.join(skill, norm)):
            continue
        listed = git("ls-files", "-z", "--", norm)
        if not listed or not any(part for part in listed.split(b"\0")):
            sys.exit(f"runtime 文件条目未被 git 跟踪（先 git add，或移出 runtime）: {entry}")
PYEOF
)"; then
  die_usage "$RUNTIME_ERR"
fi

if [ "$DRY_RUN" -eq 1 ]; then
  echo "dry-run: 源            $SKILL_DIR"
  echo "dry-run: 安装落点      $INSTALL_DIR"
  if [ -d "$INSTALL_DIR" ]; then
    if [ "$NO_BACKUP" -eq 0 ]; then
      echo "dry-run: 将备份旧安装  $TARGET_DIR/.install-backup.$SKILL_NAME.*（默认保留备份）"
    else
      echo "dry-run: 将不保留旧安装备份（--no-backup）"
    fi
  else
    echo "dry-run: 目标尚无旧安装（首装）"
  fi
  echo "dry-run: 未写盘"
  exit 0
fi

mkdir -p "$TARGET_DIR" || { echo "ERROR: 无法创建目标目录: $TARGET_DIR" >&2; exit 1; }

cleanup_stage() {
  [ -n "${STAGE:-}" ] && [ -d "$STAGE" ] && rm -rf "$STAGE"
}

restore_backup() {
  # 回滚：恢复旧安装；失败时保留备份路径并如实报告
  if [ -n "$BACKUP" ] && [ -d "$BACKUP" ]; then
    rm -rf "$INSTALL_DIR"
    if mv "$BACKUP" "$INSTALL_DIR"; then
      echo "已回滚旧安装。" >&2
    else
      echo "ERROR: 回滚失败；旧安装备份保留于: $BACKUP" >&2
    fi
  fi
}

# 1) 候选暂存（目标父目录 mktemp，保证 mv 同盘原子）
STAGE="$(mktemp -d "$TARGET_DIR/.install-staging.XXXXXX")" || { echo "ERROR: mktemp 失败" >&2; exit 1; }
BACKUP=""

# 2) 按 runtime 白名单复制到暂存：不带 .git/.spec/agent 状态等私有目录；
#    依赖树、生成目录、缓存与系统差异物不入交付面；遇 symlink 拒绝（链接逃逸）。
#    源目录的 SKILL.md 受 git 跟踪时（仓库顶层或 monorepo 子目录）只装已跟踪文件
#    （与 build_package.py 同口径），runtime 内有未跟踪且未忽略的文件则拒绝安装。
if ! python3 - "$SKILL_DIR" "$STAGE/$SKILL_NAME" <<'PYEOF'
import json, os, shutil, subprocess, sys
skill, dest = sys.argv[1], sys.argv[2]
SKIP_DIRS = {"node_modules", "dist", "coverage", ".git", ".spec", "__pycache__",
             "test-results", "playwright-report"}
SKIP_FILES = {".DS_Store", "package-lock.json"}
with open(os.path.join(skill, "manifest.json"), encoding="utf-8") as fh:
    runtime = json.load(fh)["runtime"]
def ignore(directory, names):
    skipped = []
    for name in names:
        full = os.path.join(directory, name)
        if os.path.islink(full):
            sys.exit(f"ERROR: 源包含 symlink，拒绝安装: {full}")
        if os.path.isdir(full) and (name in SKIP_DIRS or name.startswith(".umi")):
            skipped.append(name)
        elif name in SKIP_FILES or name.endswith((".pyc", ".pyo")):
            skipped.append(name)
    return skipped
def skipped_path(rel):
    parts = rel.split("/")
    return (any(p in SKIP_DIRS or p.startswith(".umi") for p in parts[:-1])
            or parts[-1] in SKIP_FILES or parts[-1].endswith((".pyc", ".pyo")))
def git(*args):
    try:
        return subprocess.run(["git", "-C", skill, *args], capture_output=True, check=True).stdout.decode()
    except (OSError, subprocess.CalledProcessError):
        return None
def git_tracked():
    # 解包在其他仓库未跟踪目录里的归档不算开发源：SKILL.md 未被跟踪 → 按文件系统复制。
    if git("ls-files", "--error-unmatch", "--", "SKILL.md") is None:
        return None
    pending = [p for p in git("ls-files", "-z", "--others", "--exclude-standard", "--", *runtime).split("\0")
               if p and not skipped_path(p)]
    if pending:
        sys.exit("ERROR: runtime 内有未跟踪且未忽略的文件（先 git add，或写入 .gitignore）: " + ", ".join(pending[:5]))
    return [p for p in git("ls-files", "-z", "--", *runtime).split("\0") if p and not skipped_path(p)]
def copy_file(rel):
    src, out = os.path.join(skill, rel), os.path.join(dest, rel)
    if os.path.islink(src):
        sys.exit(f"ERROR: 源包含 symlink，拒绝安装: {src}")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    shutil.copy2(src, out)
os.makedirs(dest)
copy_file("manifest.json")
tracked = git_tracked()
for rel in tracked or []:
    copy_file(rel)
for entry in runtime if tracked is None else []:
    src = os.path.join(skill, os.path.normpath(entry))
    out = os.path.join(dest, os.path.normpath(entry))
    if os.path.islink(src):
        sys.exit(f"ERROR: 源包含 symlink，拒绝安装: {src}")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    if os.path.isdir(src):
        shutil.copytree(src, out, ignore=ignore, dirs_exist_ok=True)
    else:
        shutil.copy2(src, out)
# 逐条核对闭式清单：每个 runtime 条目都必须在暂存树留下至少一个文件。
# 条目被排除规则整体滤除（如目录下只有 .DS_Store）→ 视为非白名单零产出，拒绝半装。
staged = []
for dirpath, _dirnames, filenames in os.walk(dest):
    for name in filenames:
        staged.append(os.path.relpath(os.path.join(dirpath, name), dest).replace(os.sep, "/"))
for entry in runtime:
    norm = os.path.normpath(entry).replace(os.sep, "/")
    if not any(rel == norm or rel.startswith(norm + "/") for rel in staged):
        sys.exit(f"ERROR: runtime 条目在暂存树零产出（被排除规则滤除）: {entry}")
PYEOF
then
  echo "ERROR: 按 runtime 清单复制到暂存失败" >&2
  restore_backup
  cleanup_stage
  exit 1
fi

# 3) 内容 diff 幂等检测（相同且未 --force → already up to date）
if [ -d "$INSTALL_DIR" ] && [ "$FORCE" -eq 0 ]; then
  if diff -r -q "$INSTALL_DIR" "$STAGE/$SKILL_NAME" >/dev/null 2>&1; then
    cleanup_stage
    echo "already up to date"
    exit 0
  fi
fi

# 4) 既有安装移备份（默认开；备份落目标目录一侧，不写源目录）
if [ -d "$INSTALL_DIR" ]; then
  if [ "$NO_BACKUP" -eq 0 ]; then
    BACKUP="$TARGET_DIR/.install-backup.$SKILL_NAME.$(date +%Y%m%d%H%M%S).$$"
    if ! mv "$INSTALL_DIR" "$BACKUP"; then
      echo "ERROR: 旧安装移备份失败" >&2
      restore_backup
      cleanup_stage
      exit 1
    fi
  else
    rm -rf "$INSTALL_DIR"
  fi
fi

# 5) 原子 mv 就位
if ! mv "$STAGE/$SKILL_NAME" "$INSTALL_DIR"; then
  echo "ERROR: 安装就位失败" >&2
  restore_backup
  cleanup_stage
  exit 1
fi
cleanup_stage

# 6) 装后校验（SKILL.md 与 manifest.json 存在）
if [ ! -f "$INSTALL_DIR/SKILL.md" ] || [ ! -f "$INSTALL_DIR/manifest.json" ]; then
  echo "ERROR: 装后校验失败（SKILL.md / manifest.json 缺失）" >&2
  restore_backup
  exit 1
fi

echo "installed: $INSTALL_DIR"
[ -n "$BACKUP" ] && echo "backup: $BACKUP"
exit 0
