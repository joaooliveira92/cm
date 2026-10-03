# Validation Report: squad-instructions

## Ticket 04 — a Sort control in the position list's toolbar, 2026-09-29

- Ticket closed: [04](../../.scratch/squad-instructions/issues/04-sort-control-for-the-position-list.md),
  built from the ruling in [01](../../.scratch/squad-instructions/issues/01-reconcile-the-loose-squad-instruction.md)
  and after its dependency [02](../../.scratch/squad-instructions/issues/02-contract-view.md)
- What shipped: `renderer/squad/SquadSortSelect.tsx`, rendered in the Squad toolbar for the position
  list layout only. It offers eight columns and runs the shared `cycleSort` through the screen's own
  `onSortCycle` — the header's control relocated, not a second sort model. Ten unit tests and one
  Playwright spec.

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` | exit 0. Six gates green: typecheck, lint (0 warnings / 0 errors), effect-lint, verify-md-links, verify-db-schema, test. desktop 2423 of 2423 (288 files); shared 559, contracts 233, game-engine 98. |
| e2e | `pnpm --filter @cm-clone/desktop test:e2e` | 68 passed (2.8m), against a bundle built by `pretest:e2e` in the same invocation |

The gate and e2e were both run by the orchestrator after review, not taken from a subagent's report.

### Review

Adversarial review ran twice. Round one returned **NEEDS_REWORK** on one blocker: the
[squad view selector note](../../.agents/notes/proposed/feature/2026-09-07-squad-view-selector-and-position-list.md)
listed this control under `## Not done here` with the reasoning that a sort dropdown "would be a new
control rather than a relocated one" — asserting as current fact both that the control was omitted
and a rationale the code disproves. Fixed in the same change: the bullet is gone, the correction and
the wrongness of the old reasoning are recorded in the note's `## Decision`, and the note is linked
from the component. Six advisories closed with it; four were left as found and are recorded in the
ticket's `## Answer`. Round two returned **APPROVE** after re-reading the whole note to confirm the
contradiction had been closed rather than relocated.

### Changed files

| File | Change |
|---|---|
| `apps/desktop/src/renderer/squad/SquadSortSelect.tsx` | new — the control |
| `apps/desktop/src/renderer/squad/SquadTable.tsx` | renders it when `view.layout === "list"`; `sort` and `onSortCycle` added to the toolbar memo's deps |
| `apps/desktop/src/renderer/squad/SquadPositionList.tsx` | doc comment only |
| `apps/desktop/test/renderer/squad/squad-sort-select.test.tsx` | new — 10 tests |
| `apps/desktop/e2e/app.spec.ts` | one new Playwright spec |
| `.agents/notes/proposed/feature/2026-09-07-squad-view-selector-and-position-list.md` | the contradicted ruling, corrected |
| `.scratch/squad-instructions/` | ticket resolved, map Decisions-so-far appended |
| `.ai/SPRINT-PLAN.md`, this report | queue and evidence |

No Agent Note shipped. No `.ai/TRACEABILITY.md` row: a Sort control is an affordance over a shared
sort that already existed, not a new capability.

### Filed alongside

[desktop-suite-red 20](../../.scratch/desktop-suite-red/issues/20-playwright-can-run-a-stale-dist.md)
— Playwright can run a stale `dist/` and report green, because `pretest:e2e` fires for the script
name and not for the binary. Found here: a mutation to `cycleSort` passed e2e because it had never
been compiled. The e2e figure above was taken through the script, so it is not affected.
