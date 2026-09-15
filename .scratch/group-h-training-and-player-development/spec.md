# Group H: Training and Player Development — Reconciled Spec

Status: ready-for-slicing

## Problem Statement

The Training and Player Development screens (screens 105–117) cover the full training lifecycle from the manager's training overview through individual player development. The codebase has a placeholder training screen, a working per-player development screen, and fully implemented backend models for Training Focus and Player Development, but 10 of the 13 screen UIs are partial stubs or absent. The spec files at `.scratch/group-h-training-and-player-development/` define each screen in detail but must be reconciled with the current codebase state and scoped to what is feasible for v1.

## Solution

Produce a reconciled spec that states per screen what is already built and what needs new surfaces. Six screens are in scope for Group H v1; seven are deferred (require new domain models that do not exist). Build in dependency order so shared components are reusable.

## User Stories

1. As a manager, I want to see my coaching staff and their assignments, so that I know which coaches are responsible for which training areas. (Screen 111)
2. As a manager, I want to see my players' training workload and recovery status, so that I can manage injury risk and match readiness. (Screen 112)
3. As a manager, I want to view and set each player's individual training plan, so that I can guide their development toward my preferred categories. (Screen 108)
4. As a manager, I want to see a player's training performance report, so that I can evaluate their development and training compliance. (Screen 113)
5. As a manager, I want a squad-wide development centre view, so that I can monitor all my players' development at a glance. (Screen 114)
6. As a manager, I want a training overview dashboard, so that I can see coaching assignments, workload status, training plans, and development progress in one place. (Screen 105)

## Implementation Decisions

- **Existing backend used for all 6 in-scope screens** — No new domain models are required for v1. Coaching data flows through the existing staff/coach model; Training Focus uses the existing `setTrainingFocus` RPC and `training_focus` table; player condition and recovery use the existing match-driven engine; player attribute and development data use existing read paths. (Ticket 02 — Group H v1 scope: 6 screens in scope, 7 deferred. See [Agent Note: Group H v1 scope](../../.agents/notes/proposed/architecture/2026-09-15-group-h-v1-scope.md).)

- **Build sequence follows dependency order** — Coaching Assignments (111) first, then Workload/Recovery (112), Individual Training Plan (108), Performance Report (113), Player Dev Centre (114), then Training Overview (105) last. (Ticket 03 — Build sequence.)

- **Shared components across screens** — Workload gauge (112, 105, 114), coach assignment card (111, 105), training plan summary card (108, 105, 114).

- **Screen 105 (Training Overview) is the landing page** — Aggregates data from the other 5 screens. Built last when all sub-screens exist.

- **Screen 108 stays as a single-Category Training Focus toggle** — No richer UI for v1. The existing `setTrainingFocus` RPC supports one `Technical | Mental | Physical | Goalkeeping | null` toggle per player. Enhancing this to a multi-week schedule planner is deferred. Screen 108 lives at `/career/$saveId/training/plan/$playerId`, reached from each Workload and Recovery row; current focus is read from `getSquad`. Goalkeeping is offered only to players carrying goalkeeping Attributes (CONTEXT.md, Training Focus); that rule is applied in the renderer only until [ticket 10](issues/10-enforce-goalkeeping-focus-rule.md) moves it into main. An off-rule focus already saved shows pressed and disabled. (Ticket 06.)

- **Screen 111 uses existing coach data** — The coach model (`coachModifier`, `staff.ts`) attaches one coach per club. UI lists assigned coach with their quality rating and specialty. No new coaching hierarchy or assignment editing in v1.

- **Screen 112 uses existing condition/recovery data** — Player fitness (`player_fitness` table) has `condition` and `last_injury_severity`. No training-specific workload model exists; v1 shows a simple rest/active indicator. The indicator is **Rest** when the stored Condition is below the engine's `NON_CONTACT_CONDITION_THRESHOLD` (75, the line the Squad screen's "Tired" status uses) and **Active** otherwise, derived in main on every read. v1 shows the stored Condition, not a projection to the next kickoff via `conditionAfterDays`. The detail line states the last injury's Severity this Season and does not claim a recovery is under way, because the ledger keeps that Severity until the next Season starts. (Ticket 05.)

- **Screen 113 (Performance Report) populates the existing coach report stub** — Shows player's Training Focus, development progress (attribute changes), coach rating, and training compliance.

- **Screen 114 (Player Dev Centre) is a squad-wide view** — Lists all players with training focus, development trajectory indicators, and quick-link to the per-player development screen.

## Testing Decisions

- Screen-level tests follow the existing pattern: Playwright e2e specs in `apps/desktop/e2e/` for reachable UI paths, and focused unit tests in the owning package for any new domain logic.
- RPC roundtrip tests in `packages/contracts/test/` for any new RPC endpoints. v1 adds read-only RPCs per screen where no existing read fits (`getCoachingAssignments` in ticket 04, `getWorkload` in ticket 05).
- Prior art: `test/renderer/playerDevelopment/` for per-player development screens, `test/renderer/squad/` for list views.

## Out of Scope

- Screens 106 (Training Calendar), 107 (Training Unit Assignment), 109 (Position/Role Training), 110 (Additional Focus/Traits), 115 (Mentoring Groups), 116 (Youth Intake), 117 (Training Camp/Pre-Season Plan) — deferred to post-v1 per ticket 02.
- Training Focus multi-week schedule planner — deferred.
- Training load calculation — existing match-driven condition is used; no training-specific load model.
- Game-engine training simulation — chart UI surfaces first; training simulation logic is a separate domain effort.

## Further Notes

- The existing `TrainingScreen.tsx` stub at `apps/desktop/src/renderer/training/TrainingScreen.tsx` will become the Training Overview (105).
- The existing `PlayerDevelopmentScreen.tsx` at `apps/desktop/src/renderer/playerDevelopment/` already implements per-player Training Focus setting and development info — Screen 114 (Player Dev Centre) is a squad-wide wrapper around this per-player view.
- The existing `PlayerCoachReportScreen.tsx` at `apps/desktop/src/renderer/playerCoachReport/` is a placeholder — Screen 113 populates it.