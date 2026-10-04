---
name: enterprise-frontend
description: >-
  Build, extend, migrate, or review production enterprise frontends by learning from
  the target repository and its strongest runnable examples. Use for admin systems,
  dashboards, workbenches, CRUD pages, settings, maps, Ant Design/Pro pages, frontend
  initialization, UI migration, visual alignment, page development, and consistency
  review—even when the user does not explicitly name enterprise-frontend. Prefer adapting a
  complete proven vertical slice over generating a page from abstract rules.
---

# enterprise-frontend

Build the requested workflow so it works and feels native to the target product. Reuse proven behavior, not just visible JSX. A **vertical slice** connects the route, permissions, UI, data, state, feedback, and tests needed for one user journey.

Use the smallest complete change. A step earns its cost only if it resolves a decision, protects affected behavior, or supplies verification evidence. Do not turn a local fix into a migration, a repository census, or a documentation exercise.

## Source Precedence

When evidence conflicts, use:

1. the user's current request and explicit constraints;
2. target repository code, configuration, tests, and local instructions;
3. a user-supplied reference repository, page, screenshot, or design;
4. the closest proven target-local example;
5. framework documentation and runnable demos;
6. bundled defaults, only for unresolved choices.

A screenshot does not override executable behavior. An external example does not replace target-owned theme, routes, request, state, permissions, styling, or naming unless that replacement is requested or demonstrably necessary.

## Workflow

### 1. Locate the decision and affected behavior

Read local instructions and the relevant implementation, tests, and configuration. Follow imports, callers, and state transitions until the affected boundary is clear; inspect other layers only when they influence it. For a local style fix, do not inventory unrelated authentication or services. For a new application or migration, inspect the foundations.

Establish the user-visible result and external contracts. Use reasonable target-native defaults for open details; ask only when an unresolved decision changes scope or correctness. Do not invent an API or simulate production success to hide a missing contract.

### 2. Choose the reuse boundary

| Task | Boundary |
|---|---|
| Local behavior or style change | Existing primitive, component group, or layout chain plus affected tests |
| **Extend** — new or changed user journey | Smallest complete vertical slice |
| **Adopt** — initialize or deliberately replace foundations | Dependency-ordered migration; use the playbook |
| **Align** — review or repair | Inspect behavior/integration before interaction, layout/accessibility, then visual detail; fix the affected boundary |

Choose an analogue by user job, interaction and data/mutation lifecycle, then shell constraints, stack, and appearance. Prefer a complete working implementation over a similar-looking mockup. If none exists, build the necessary flow from target primitives and explicit contracts; do not search indefinitely or transplant an incompatible subsystem.

Keep the evidence map internal and proportional. Write a capability matrix or rollout plan when coordinating a broad migration, not for every component edit. For a new page, load the example only if a concrete adaptation demonstration is useful.

### 3. Implement the complete behavior

Preserve the target's integration seams and transfer source semantics to the target domain. For each affected journey, cover what applies:

- route/menu entry, authorization, and inaccessible state; hiding an action is not backend enforcement;
- typed data and state boundaries, loading, empty, error, and retry behavior;
- validation, mutation pending/duplicate prevention, success/failure feedback, and cache refresh or rollback;
- destructive confirmation naming the object and consequence;
- long content, relevant viewports, keyboard/focus behavior, and reachable controls.

Do not add these concerns to an unrelated local change; check the ones it can affect. Preserve existing tests and adapt their fixtures with the domain. Remove source-specific routes, names, roles, APIs, assets, and unused dependencies rather than leaving two competing systems.

### 4. Verify and deliver

Use the Final Gate below. Failed checks lead back to the affected implementation, not to more process artifacts. Stop expanding the patch when the requested behavior is complete and the evidence supports it.

## Engineering Decisions

- **Reuse versus replacement:** reuse sound target primitives; adapt compatible examples; replace only for a concrete incompatibility or deliberate migration. Classify broad migrations with the playbook's reuse/adapt/replace/bridge/omit/remove decisions. A temporary bridge needs a deletion condition.
- **Styling:** follow target tokens, component APIs, and scoped styling conventions. Custom CSS is valid for layout or domain behavior; a parallel design system or unscoped duplication is not.
- **Scrolling:** choose page, region, or combined scroll by user job. Keep the full size/shrink chain and reachable content; avoid accidental clipping and competing scroll owners. Do not impose one card or viewport topology on every page.
- **Component APIs:** use the installed version. Look up unfamiliar, deprecated, or behaviorally/version-sensitive APIs; do not query every familiar component as ceremony.
- **Missing project choices:** load defaults only for that unresolved decision, not as a conformance test.

## Resources — Load Only When Needed

Resolve bundled paths relative to this `SKILL.md`, not the target repository. Run application commands in the target repository.

| Need | Owner |
|---|---|
| Concrete page adaptation | `examples/adapt-existing-slice.md` |
| Foundation migration or unclear dependency closure | `references/adaptation-playbook.md` |
| Test selection, browser geometry/interactions, residue checks | `references/verification.md` |
| Unspecified product/design choices | `references/default-profile.md` |
| Ant Design API/version evidence | `references/antd-facts.md` |

## Output

- **Implementation:** changed behavior/files, non-obvious decisions, actual verification and unresolved dependencies.
- **Review:** severity-ordered findings with file/line evidence and fixes.
- **Plan-only:** selected source, boundary, adaptation/rollout decisions, and acceptance checks.

Lead with the result. Do not print internal checklists or repeat the workflow unless the user needs them to decide.

## Final Gate

Before returning, verify:

- the change satisfies the requested behavior and applicable states without replacing unrelated target conventions;
- focused tests and repository-required checks pass; select additional checks by affected risk, not habit;
- affected UI interactions and geometry were exercised when runnable; compilation alone is not UI evidence;
- the diff contains no unintended source residue, parallel infrastructure, or generated/local files.

Use `references/verification.md` for the detailed procedure. Distinguish passed, failed, blocked, unavailable, and not run; never claim that inspection or a skipped check proves runtime behavior.
