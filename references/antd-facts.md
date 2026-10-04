# Ant Design Facts

Load this file only when the task uses Ant Design and needs version-sensitive API, token, semantic DOM, migration, or behavior evidence. Project code and installed version remain authoritative.

## Preferred lookup path

If `@ant-design/cli` is available, query the target version:

```bash
antd env --format json
antd info <Component> --version <installed-version> --format json
antd demo <Component> <demo> --version <installed-version> --format json
antd token <Component> --version <installed-version> --format json
antd semantic <Component> --version <installed-version> --format json
antd lint <changed-path> --format json
```

Use lookups when:

- the prop or token is unfamiliar;
- installed version differs from the example;
- an API is deprecated or recently changed;
- virtualization, controlled state, semantic styles, portals, or responsive behavior is tricky;
- lint/build reports an Ant Design issue.

Do not query every familiar component as ceremony.

## Offline fallback

This skill bundles `references/antd/llms-full.txt` and `references/antd/llms-index.md` as an offline documentation mirror. Never load the entire large file.

1. Confirm the mirror version:

```bash
grep -m1 -E '^## [0-9]+\.[0-9]+\.[0-9]+' references/antd/llms-full.txt
```

2. Find the component offset in `references/antd/llms-index.md`.
3. Extract only the relevant `API`, `Component Token`, `Semantic DOM`, or `FAQ` section, normally no more than 80 lines.
4. If the target version differs materially, prefer its installed types/CLI or official docs over the bundled mirror.

## Implementation rules

- Prefer official components for standard interaction semantics and accessibility.
- Reuse the target project's wrappers before importing primitives directly.
- Match the installed major/minor behavior; do not upgrade merely to obtain a convenient prop unless requested.
- Theme system-wide decisions through `ConfigProvider`; use Component Tokens and semantic `classNames`/`styles` for scoped customization when supported.
- Composition and scoped CSS are valid when a domain layout cannot be expressed by component props alone.
- Run the project's lint/typecheck after changes and `antd lint` when available.

## References in this repository

- `references/antd/llms-index.md` — component offsets for the bundled mirror
- `references/antd/llms-full.txt` — offline Ant Design documentation mirror
