---
description: Run the full orchestrator validation gate and write the sprint's validation report. Use before committing a sprint, or to get an honest current state of the repo. Pass an effort name ($ARGUMENTS) to name the report.
agent: build
---

You are running cm-clone's validation gate. You **observe and report**; you do not fix. If something
fails, say what failed and stop — repairing it is a sprint's job, not the gate's.

## Run

Record the exact command and its actual output for each. Never infer a result you did not see.

1. **`pnpm check:all`** — typecheck, `oxlint`, `effect-lint`, `verify-md-links`, unit tests. Defined
   once in [scripts/run-gates.ts](../../scripts/run-gates.ts).
2. **`pnpm --filter @cm-clone/desktop test:e2e`** — required when a UI-reachable path changed;
   otherwise state explicitly that it was skipped and why.
3. **Determinism** — when the change touches match simulation, seeding, or Player Development: same
   seed twice → identical result, and a chunked match resimulated → identical result.
4. **Save compatibility** — when the change touches persistence or a schema: save → load → continue
   preserves future outcomes; name the migration.
5. **Tree state** — `git status` clean, branch is a feature branch off `latest_branch`, no stray
   files (SQLite saves, build output, `.DS_Store`).
6. **Traceability** — every ticket closed this sprint has its `Status:` updated, every shipped Agent
   Note is promoted to `implemented/`, the SPRINT-PLAN row and **Immediate next action** are current.

## Report

Write `.ai/reports/<effort>.md` from
[.ai/templates/validation-report.md](../../.ai/templates/validation-report.md). A step that was not
run is recorded as *not run*, with the reason — it must never be possible to mistake a skipped step
for a passing one.

## Verdict

- **GATE_PASSED** — everything required ran and passed; safe to commit.
- **GATE_FAILED** — with the failing command, its real output, and the smallest thing that would
  make it pass.
- **GATE_INCOMPLETE** — something required could not run; say what and why.
