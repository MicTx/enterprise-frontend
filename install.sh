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

if ! cp -R "$SKILL_DIR/." "$STAGE/$SKILL_NAME/"; then
  echo "ERROR: 源复制到暂存失败" >&2
  restore_backup
  cleanup_stage
  exit 1
fi

# 2) 暂存净化与拒绝 symlink（打包/安装面不携带系统差异物与链接逃逸）
# 依赖树与内部证据档案不入交付面（与 manifest.runtime 闭式清单同口径）
find "$STAGE" -type d \( -name 'node_modules' -o -name 'dist' \) -prune -exec rm -rf {} +
find "$STAGE" \( -name '.DS_Store' -o -name '*.pyc' \) -delete
find "$STAGE" -type d -name '__pycache__' -prune -exec rm -rf {} +
rm -rf "$STAGE/$SKILL_NAME/library" "$STAGE/$SKILL_NAME/LICENSE-LIBRARY" \
      "$STAGE/$SKILL_NAME/scripts/index_library.py" \
      "$STAGE/$SKILL_NAME/scripts/verify_snapshot.py" \
      "$STAGE/$SKILL_NAME/scripts/tests"
if find "$STAGE" -type l -print -quit | grep -q .; then
  echo "ERROR: 源包含 symlink，拒绝安装" >&2
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
