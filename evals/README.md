# enterprise-frontend evaluations

Evaluate whether the skill produces working, target-native changes with proportionate effort. `SKILL.md` owns the operating rules; `evals/evals.json` owns prompts and expected behavior. This guide owns only evaluation procedure.

## What to compare

Measure outcomes, not compliance with a long workflow:

- requested behavior and applicable states work;
- target contracts and conventions are preserved;
- the selected reuse boundary is complete but no larger than needed;
- verification addresses the changed risk and claims only executed evidence;
- unnecessary reads, rewrites, lookups and process artifacts are avoided.

No universal pixel values, mandatory page topology, or fixed file-count target belongs in the score. A small change should not fail merely because it did not produce a full migration plan.

## Contract checks versus behavior

`python3 scripts/validate_project.py` checks scenario structure, unique positive IDs, non-empty prompt/output/expectations and safe existing fixture paths. It does **not** run a model or a frontend.

Current scenarios have no bundled executable application fixtures. To claim behavioral results, supply runnable fixtures and execute the comparisons below. Until then, report contract checks and manual decision-path review separately from model evaluation.

## Run a comparison

1. Select the affected scenarios from `evals/evals.json`; include adjacent cases when a rule or trigger changes.
2. Supply the same target fixture and task to both configurations: current skill versus an explicit previous snapshot, or no skill for a new baseline.
3. Use separate sibling workspaces and the same tools/model/environment. Record revisions, commands, outputs and duration; keep generated results out of the installed bundle.
4. Run each fixture's required checks and critical interactions. Grade scenario expectations using tests/build/browser/diff evidence where available; use qualitative judgment for analogue selection and proportionality.
5. Record failures and limitations in the `evals/baseline.md` format. Revise the responsible rule, then rerun affected cases; do not reward less effort if correctness was lost.

Use repeat runs before interpreting token/time differences as a reliable improvement. A shorter instruction file alone does not prove better model behavior.

## Add or change a scenario

Each case needs a realistic prompt, expected result, discriminating expectations, and a `files` array of repository-relative fixture paths (empty when no fixture is supplied). Check both the capability being added and the behavior that must remain unchanged.

When simplifying the workflow, retain full-journey/migration cases and add local-change and no-analogue cases. These distinguish proportionate reuse from either excessive ceremony or incomplete implementation.
