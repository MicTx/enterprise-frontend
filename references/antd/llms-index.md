# Ant Design offline documentation index

Generated navigation for the bundled mirror. Read this index first, then extract only the needed fragment; never load the entire mirror into context.

- Mirror version: **6.4.3** (first changelog entry, not a compatibility claim for the target).
- SHA-256: `1e894e539d7ca0a21aae50b25623e462033f33d115aa735bd0d6dd8c9e4f5d47`
- Coverage: 71 components · 55 Component Token sections · 35 FAQ sections · 3 utility types.
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
| `affix` | 93 | ✓ | — | ✓ |
| `alert` | 243 | ✓ | ✓ | — |
| `anchor` | 816 | ✓ | ✓ | ✓ |
| `app` | 1413 | ✓ | — | ✓ |
| `auto-complete` | 1669 | ✓ | ✓ | ✓ |
| `avatar` | 2425 | ✓ | ✓ | — |
| `badge` | 2746 | ✓ | ✓ | — |
| `border-beam` | 3308 | ✓ | — | ✓ |
| `breadcrumb` | 3552 | ✓ | ✓ | — |
| `button` | 4007 | ✓ | ✓ | ✓ |
| `calendar` | 5138 | ✓ | ✓ | ✓ |
| `card` | 5908 | ✓ | ✓ | — |
| `carousel` | 6514 | ✓ | ✓ | ✓ |
| `cascader` | 6872 | ✓ | ✓ | — |
| `checkbox` | 9216 | ✓ | — | ✓ |
| `collapse` | 9639 | ✓ | ✓ | — |
| `color-picker` | 10346 | ✓ | — | ✓ |
| `config-provider` | 10964 | ✓ | — | ✓ |
| `date-picker` | 12458 | ✓ | ✓ | ✓ |
| `descriptions` | 14119 | ✓ | ✓ | — |
| `divider` | 14843 | ✓ | ✓ | — |
| `drawer` | 15197 | ✓ | ✓ | — |
| `dropdown` | 16356 | ✓ | ✓ | ✓ |
| `empty` | 17545 | ✓ | — | — |
| `flex` | 17832 | ✓ | — | — |
| `float-button` | 18069 | ✓ | — | — |
| `form` | 18606 | ✓ | ✓ | ✓ |
| `grid` | 22818 | ✓ | — | — |
| `icon` | 23566 | ✓ | — | ✓ |
| `image` | 23967 | ✓ | ✓ | — |
| `input` | 24923 | ✓ | ✓ | ✓ |
| `input-number` | 25969 | ✓ | ✓ | ✓ |
| `layout` | 26588 | ✓ | ✓ | — |
| `list` | 27472 | ✓ | ✓ | ✓ |
| `masonry` | 28695 | ✓ | — | — |
| `mentions` | 29093 | ✓ | ✓ | — |
| `menu` | 29803 | ✓ | ✓ | ✓ |
| `message` | 31087 | ✓ | ✓ | ✓ |
| `modal` | 31665 | ✓ | ✓ | ✓ |
| `notification` | 33035 | ✓ | ✓ | ✓ |
| `pagination` | 33938 | ✓ | ✓ | — |
| `popconfirm` | 34377 | ✓ | ✓ | ✓ |
| `popover` | 34958 | ✓ | ✓ | ✓ |
| `progress` | 35469 | ✓ | ✓ | — |
| `qr-code` | 36082 | ✓ | — | ✓ |
| `radio` | 36582 | ✓ | ✓ | — |
| `rate` | 37255 | ✓ | ✓ | — |
| `result` | 37501 | ✓ | ✓ | — |
| `segmented` | 37859 | ✓ | ✓ | — |
| `select` | 38384 | ✓ | ✓ | ✓ |
| `skeleton` | 40155 | ✓ | ✓ | — |
| `slider` | 40601 | ✓ | ✓ | — |
| `space` | 41243 | ✓ | — | — |
| `spin` | 42025 | ✓ | ✓ | — |
| `splitter` | 42403 | ✓ | — | — |
| `statistic` | 43052 | ✓ | ✓ | — |
| `steps` | 43479 | ✓ | ✓ | — |
| `switch` | 44250 | ✓ | ✓ | ✓ |
| `table` | 44523 | ✓ | ✓ | ✓ |
| `tabs` | 50027 | ✓ | ✓ | — |
| `tag` | 51030 | ✓ | ✓ | — |
| `time-picker` | 51886 | ✓ | ✓ | ✓ |
| `timeline` | 52503 | ✓ | ✓ | — |
| `tooltip` | 53087 | ✓ | ✓ | ✓ |
| `tour` | 53632 | ✓ | ✓ | — |
| `transfer` | 54403 | ✓ | ✓ | ✓ |
| `tree` | 55492 | ✓ | ✓ | ✓ |
| `tree-select` | 56685 | ✓ | ✓ | ✓ |
| `typography` | 57760 | ✓ | ✓ | — |
| `upload` | 58601 | ✓ | ✓ | ✓ |
| `watermark` | 60235 | ✓ | — | ✓ |

## TypeScript utilities

| Type | Offset |
|------|--------|
| `GetRef` | 27 |
| `GetProps` | 38 |
| `GetProp` | 63 |

## Maintenance and freshness

This file is generated from the exact mirror bytes. Repository maintainers regenerate it with the repository's `index_antd.py --write` command; the project validator checks both headings and fingerprint. The maintenance script is intentionally not part of the installed runtime bundle.

Check the mirror version before using its APIs:

```bash
grep -m1 -E '^## [0-9]+\.[0-9]+\.[0-9]+' references/antd/llms-full.txt
```

The target's installed version, types, and official version-matched documentation outrank this mirror. A matching index only proves navigation consistency, not that these APIs exist in the target version.
