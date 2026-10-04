#!/usr/bin/env python3
"""Generate or check the offline Ant Design navigation index (stdlib only)."""
from __future__ import annotations

import argparse
import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIRROR = ROOT / "references/antd/llms-full.txt"
INDEX = ROOT / "references/antd/llms-index.md"


def render_index(mirror: Path) -> str:
    raw = mirror.read_bytes()
    lines = raw.decode("utf-8").splitlines()
    sections = []
    for index, line in enumerate(lines):
        match = re.fullmatch(r"## ([a-z_][a-z_-]*)", line)
        if match and f"Source: https://ant.design/components/{match[1]}.md" in lines[index + 1:index + 4]:
            sections.append((match[1], index))
    versions = [line[3:] for line in lines if re.fullmatch(r"## \d+\.\d+\.\d+", line)]
    if not sections or not versions:
        raise ValueError("mirror must contain component source headings and a changelog version")
    rows = []
    ct_count = faq_count = 0
    for position, (name, start) in enumerate(sections):
        if name in {"_util", "changelog", "overview"}:
            continue
        end = sections[position + 1][1] if position + 1 < len(sections) else len(lines)
        content = lines[start:end]
        api = any(re.match(r"^## API\b", line) for line in content)
        ct = any(line.startswith("## Component Token (") for line in content)
        faq = any(re.match(r"^## FAQ\b", line) for line in content)
        ct_count += ct
        faq_count += faq
        def mark(value: bool) -> str:
            return "✓" if value else "—"
        rows.append(f"| `{name}` | {start + 1} | {mark(api)} | {mark(ct)} | {mark(faq)} |")
    utility_rows = []
    for name in ("GetRef", "GetProps", "GetProp"):
        try:
            offset = lines.index(f"## {name}") + 1
        except ValueError as exc:
            raise ValueError(f"mirror missing utility {name}") from exc
        utility_rows.append(f"| `{name}` | {offset} |")
    return f"""# Ant Design offline documentation index

Generated navigation for the bundled mirror. Read this index first, then extract only the needed fragment; never load the entire mirror into context.

- Mirror version: **{versions[0]}** (first changelog entry, not a compatibility claim for the target).
- SHA-256: `{hashlib.sha256(raw).hexdigest()}`
- Coverage: {len(rows)} components · {ct_count} Component Token sections · {faq_count} FAQ sections · 3 utility types.
- All paths below are relative to the installed skill root, not the target repository.

## Bounded lookup

Find the component offset, then read at most 80 lines per extraction:

```bash
# Replace OFFSET with the component/section line and run at the skill root.
sed -n 'START,ENDp' references/antd/llms-full.txt
# Replace START with the offset and END with at most START + 79.
```

Search for API, Component Token, Semantic DOM, or FAQ headings within that component's range (ending before the next component). Extract at most 80 lines around the selected heading; do not print an unbounded section.

## Components

| Component | Offset | API | CT | FAQ |
|-----------|--------|-----|----|-----|
{chr(10).join(rows)}

## TypeScript utilities

| Type | Offset |
|------|--------|
{chr(10).join(utility_rows)}

## Maintenance and freshness

This file is generated from the exact mirror bytes. Repository maintainers regenerate it with the repository's `index_antd.py --write` command; the project validator checks both headings and fingerprint. The maintenance script is intentionally not part of the installed runtime bundle.

Check the mirror version before using its APIs:

```bash
grep -m1 -E '^## [0-9]+\\.[0-9]+\\.[0-9]+' references/antd/llms-full.txt
```

The target's installed version, types, and official version-matched documentation outrank this mirror. A matching index only proves navigation consistency, not that these APIs exist in the target version.
"""


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="regenerate instead of checking")
    args = parser.parse_args()
    try:
        expected = render_index(MIRROR)
        if args.write:
            INDEX.write_text(expected, encoding="utf-8")
            print("Ant Design index regenerated")
        elif INDEX.read_text(encoding="utf-8") != expected:
            parser.exit(1, "Ant Design index is stale; run python3 scripts/index_antd.py --write\n")
        else:
            print("Ant Design index passed")
    except (OSError, ValueError) as exc:
        parser.exit(1, f"Ant Design index failed: {exc}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
