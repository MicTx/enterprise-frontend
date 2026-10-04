# Adaptation Playbook

Use for foundation migration or a flow whose dependency boundary is unclear. For local changes, the workflow in `SKILL.md` is sufficient. This playbook adds migration decisions, not another universal sequence.

## Inventory the relevant layers

Compare target and reference using `SKILL.md` source precedence. Trace only active dependencies; record conflicts that change implementation.

| Layer | Evidence |
|---|---|
| Toolchain/runtime | manifests, lockfile, scripts, framework config, entry, providers, locale, theme, error boundary |
| Navigation/identity | routes, menu, redirects, session/current user, guards, authorization and backend enforcement |
| Data/state | request client, error normalization, services, query/store keys, invalidation, polling, optimistic updates |
| Shared UI/style | shell, forms, tables, overlays, tokens, responsive rules, fonts/assets |
| Domain/quality | types, schemas, endpoint contracts, vocabulary, fixtures, tests and verification commands |

A useful page dependency trace is:

```text
route/menu → access → shell/page → shared components/hooks
          → service/request → query/store → domain types → styles/assets/tests
```

Follow imports and callers in both directions. Include a dependency because it affects the flow, not because it appears in this list.

## Decide what transfers

| Decision | Meaning |
|---|---|
| `reuse` | Keep a capability already owned by the target |
| `adapt` | Transfer proven structure while changing domain semantics |
| `replace` | Deliberately migrate an incompatible or superseded subsystem |
| `bridge` | Coexist temporarily behind one interface |
| `omit` | Leave out an irrelevant source capability |
| `remove` | Delete target legacy made redundant by the migration |

Prefer reuse/adapt. Give replace/bridge an engineering reason; give bridges a deletion condition. For broad migrations, record these decisions per capability. For one bounded flow, a short implementation note is enough.

## Land one working path before scaling

Migrate in dependency order:

1. toolchain and runtime/providers/theme;
2. shell, navigation, authentication and authorization;
3. request and server-state layers;
4. shared interaction infrastructure;
5. one representative page, mutation and permission path;
6. remaining slices, then remove superseded code.

Prove the representative path end to end before broad copying. For high-risk changes, define staged rollout or rollback before replacing the old path. Keep rollback artifacts separate from active production code; they are not a reason to retain duplicate infrastructure indefinitely.

Use `references/verification.md` for tests, browser interactions and source-residue checks. Keep unrelated target files unchanged; fix a shared defect only if it blocks the requested flow. Completion uses the Final Gate in `SKILL.md`, not a separate migration checklist.
