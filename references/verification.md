# Verification Guide

Choose evidence that can reveal failures introduced by the change. Repository-required checks remain mandatory; additional checks follow the affected behavior and risk, not a universal command sequence.

## Select checks

| Change | Useful evidence |
|---|---|
| Documentation only | References, examples/contracts and diff; no application build solely for prose |
| Local logic/component | Focused regression plus required type/lint checks; callers if the contract changed |
| Layout/interaction | Affected route, keyboard/focus, geometry and critical interactions at relevant viewports |
| Route/data/mutation/permission | Complete changed journey, failure/retry and restricted access; integration tests |
| Shared runtime/foundation | Broader tests, production build and representative browser journeys |

Discover actual commands from the target's manifest and local instructions. Do not invent test/build scripts. Reuse results only for the same unchanged scope and environment; rerun after affected inputs change. A command already covering a check does not need a second equivalent invocation.

## Browser evidence

Exercise the changed path, not every action in the product. Depending on scope, verify:

- route renders and load resolves into data, empty, or explicit error;
- filters/reset/pagination/sort and navigation preserve intended state;
- create/edit validation keeps useful input, success refreshes data, failure remains recoverable;
- destructive actions confirm impact, pending actions prevent duplicates, restricted users cannot invoke protected operations;
- no new console errors or unhandled rejections.

For layout changes, use the product viewport matrix; if absent, sample standard and narrow layouts. Check:

- intended document versus region scroll, with complete height/shrink chains (`min-height: 0` / `min-width: 0` where needed);
- no unintended document overflow, competing scrollers, hidden content, clipped overlays, or overlapping fixed elements;
- long labels/content and relevant empty/large states remain usable;
- keyboard access, visible focus and map/chart resize behavior where affected.

Prefer geometry and interaction assertions over screenshots alone. A screenshot proves appearance, not a working mutation or permission boundary.

## Residue and scope

Search the changed boundary for source-specific product names, branding/assets, routes, endpoints, roles, feature flags, storage/environment keys, analytics, fixtures, comments, and unused dependencies. Derive the search terms from the actual source; do not invent a universal forbidden-word list.

Review the diff for unrelated rewrites, generated/local files, or parallel request/state/style infrastructure. Every changed file should belong to the requested flow or a necessary dependency.

## Report the evidence

- **Passed:** executed successfully.
- **Failed:** executed and failed; give the cause.
- **Blocked:** an external dependency prevented execution.
- **Unavailable:** the project defines no such check or runnable surface.
- **Not run:** explicitly omitted; explain when it matters to confidence.

Do not turn compilation, static review, or contract validation into a claim of browser or model behavior. The main skill's Final Gate owns completion; this file supplies the verification method.
