#!/usr/bin/env bash
set -euo pipefail

SKILL_NAME="enterprise-frontend"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGER="$SCRIPT_DIR/scripts/package_skill.py"
DESTINATION_CHECKER='import pathlib, sys
root = pathlib.Path(sys.argv[2]).resolve()
raw = pathlib.Path(sys.argv[1]).expanduser()
destination = raw.parent.resolve() / raw.name
if destination == root or root in destination.parents or destination in root.parents:
    raise SystemExit("destination must not be the source repository or one of its ancestors/descendants")
print(destination)'
CODEX_SKILLS_DIR="${CODEX_HOME:-$HOME/.codex}/skills"
CLAUDE_SKILLS_DIR="${CLAUDE_HOME:-$HOME/.claude}/skills"
BACKUP_ROOT="${BACKUP_ROOT:-$SCRIPT_DIR/.install-backups}"

INSTALL_CODEX=1
INSTALL_CLAUDE=1
DRY_RUN=0
FORCE=0
BACKUP=1
EXTRAS_MODE="auto"
ONLY_MODE=0

usage() {
  cat <<'EOF'
Install the enterprise-frontend runtime bundle.

Default: Codex + Claude Code + detected extra agent tools.

Usage:
  ./install.sh [options]

Options:
  --codex-only       Install only for Codex
  --claude-only      Install only for Claude Code
  --all              Install for every known target
  --no-extras        Install only for Codex and Claude Code
  --force            Replace an existing matching installation
  --no-backup        Replace without preserving the previous installation
  --dry-run          Print target paths without writing
  -h, --help         Show this help

Environment:
  CODEX_HOME         Override the Codex home directory
  CLAUDE_HOME        Override the Claude Code home directory
  BACKUP_ROOT        Override the local backup directory
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --codex-only)
      INSTALL_CODEX=1
      INSTALL_CLAUDE=0
      ONLY_MODE=1
      ;;
    --claude-only)
      INSTALL_CODEX=0
      INSTALL_CLAUDE=1
      ONLY_MODE=1
      ;;
    --all) EXTRAS_MODE="all" ;;
    --no-extras) EXTRAS_MODE="none" ;;
    --force) FORCE=1 ;;
    --no-backup) BACKUP=0 ;;
    --dry-run) DRY_RUN=1 ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
  shift
done

check_dependencies() {
  local missing=()
  local command_name
  for command_name in python3 diff mv rm mkdir dirname mktemp; do
    if ! command -v "$command_name" >/dev/null 2>&1; then
      missing+=("$command_name")
    fi
  done
  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "Missing required commands: ${missing[*]}" >&2
    exit 1
  fi
  if [[ ! -f "$PACKAGER" ]]; then
    echo "Missing runtime packager: $PACKAGER" >&2
    exit 1
  fi
}

extra_targets() {
  printf '%s\t%s\n' \
    "copilot"  "$HOME/.copilot/skills" \
    "gemini"   "$HOME/.gemini/skills" \
    "windsurf" "$HOME/.codeium/windsurf/skills" \
    "cline"    "$HOME/.cline/skills" \
    "goose"    "$HOME/.config/goose/skills" \
    "opencode" "$HOME/.config/opencode/skills" \
    "kiro"     "$HOME/.kiro/skills" \
    "roo"      "$HOME/.roo/skills" \
    "agents"   "$HOME/.agents/skills" \
    "pi"       "$HOME/.pi/agent/skills"
}

install_one() (
  local label="$1"
  local skills_dir="$2"
  local destination="$skills_dir/$SKILL_NAME"
  local destination_dir candidate_root="" candidate backup_dir="" rollback_path=""

  if ! destination="$(python3 -B -c "$DESTINATION_CHECKER" "$destination" "$SCRIPT_DIR")"; then
    echo "Could not resolve installation destination: $destination" >&2
    return 1
  fi
  destination_dir="$(dirname "$destination")"

  echo "Installing $SKILL_NAME for $label: $destination"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] python3 $PACKAGER --dest $destination"
    return 0
  fi

  mkdir -p "$destination_dir"
  candidate_root="$(mktemp -d "$destination_dir/.enterprise-frontend-candidate.XXXXXX")"
  candidate="$candidate_root/$SKILL_NAME"
  trap 'rm -rf "${candidate_root:-}"' EXIT
  python3 "$PACKAGER" --dest "$candidate" >/dev/null

  if [[ -d "$destination" && ! -L "$destination" ]] && diff -qr "$candidate" "$destination" >/dev/null 2>&1; then
    if [[ "$FORCE" -eq 0 ]]; then
      echo "Already up to date: $destination"
      return 0
    fi
  fi

  if [[ -e "$destination" || -L "$destination" ]]; then
    if [[ "$BACKUP" -eq 1 ]]; then
      # Never move an installation into itself; resolve backup parents first.
      if ! python3 -c 'import pathlib, sys
backup, destination = (pathlib.Path(p).resolve() for p in sys.argv[1:])
if backup == destination or destination in backup.parents:
    raise SystemExit("backup root must not be inside the installation")' "$BACKUP_ROOT" "$destination"; then
        return 1
      fi
      mkdir -p "$BACKUP_ROOT"
      backup_dir="$(mktemp -d "$BACKUP_ROOT/$label-$SKILL_NAME.XXXXXX")/previous"
      rollback_path="$backup_dir"
    else
      rollback_path="$destination_dir/.$SKILL_NAME.rollback.$$"
      if [[ -e "$rollback_path" || -L "$rollback_path" ]]; then
        echo "Refusing to overwrite rollback path: $rollback_path" >&2
        return 1
      fi
    fi
    mv "$destination" "$rollback_path"
    if [[ "$BACKUP" -eq 1 ]]; then
      echo "Backed up previous installation: $backup_dir"
    fi
  fi

  if ! mv "$candidate" "$destination"; then
    if [[ -e "$destination" || -L "$destination" ]]; then
      rm -rf "$destination"
    fi
    if [[ -n "$rollback_path" && ( -e "$rollback_path" || -L "$rollback_path" ) ]]; then
      echo "Installation failed; restoring previous installation: $destination" >&2
      if ! mv "$rollback_path" "$destination"; then
        echo "Previous installation could not be restored; preserved at: $rollback_path" >&2
      fi
    fi
    return 1
  fi
  if [[ ! -f "$destination/SKILL.md" || ! -d "$destination/references" ]]; then
    echo "Installation verification failed: $destination" >&2
    rm -rf "$destination"
    if [[ -n "$rollback_path" && ( -e "$rollback_path" || -L "$rollback_path" ) ]]; then
      echo "Restoring previous installation: $destination" >&2
      if ! mv "$rollback_path" "$destination"; then
        echo "Previous installation could not be restored; preserved at: $rollback_path" >&2
      fi
    fi
    return 1
  fi
  if [[ "$BACKUP" -eq 0 && -n "$rollback_path" ]]; then
    rm -rf "$rollback_path"
  fi
  trap - EXIT
  rm -rf "$candidate_root"

  echo "Installed $label skill: $destination"
)

main() {
  check_dependencies

  if [[ "$INSTALL_CODEX" -eq 1 ]]; then
    install_one "codex" "$CODEX_SKILLS_DIR"
  fi
  if [[ "$INSTALL_CLAUDE" -eq 1 ]]; then
    install_one "claude" "$CLAUDE_SKILLS_DIR"
  fi

  if [[ "$ONLY_MODE" -eq 0 && "$EXTRAS_MODE" != "none" ]]; then
    while IFS=$'\t' read -r label directory; do
      [[ -z "${directory:-}" ]] && continue
      if [[ "$EXTRAS_MODE" == "all" || -d "$(dirname "$directory")" ]]; then
        install_one "$label" "$directory"
      else
        echo "Skipping $label (tool home not detected)"
      fi
    done < <(extra_targets)
  fi

  echo "Restart installed agent tools to reload the skill."
}

main
