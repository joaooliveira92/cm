# Map: Group H — Training and Player Development

Label: `wayfinder:map`

## Destination

A reconciled spec covering all 13 Group H screens (105-117) — training overview, calendar/schedule, training unit assignment, individual training plan, position/role training, additional focus and trait development, coaching assignments, workload and recovery, performance report, player development centre, mentoring groups, youth intake and academy development, training camp and pre-season plan — stating per screen what is already built and what needs new surfaces.

## Notes

- Training screen (`apps/desktop/src/renderer/training/TrainingScreen.tsx`) is a placeholder stub.
- `SetTrainingFocus` command and `TrainingFocusSetEvent` exist; `PlayerDevelopedEvent` drives per-season attribute changes.
- Training Focus (single-category toggle) is the only training-plan concept; fully implemented with RPC, DB, domain logic.
- Player Development (`developPlayer`, `developPlayersForSeason`) is fully implemented including coach modifier.
- Coach model exists (`coachModifier` in `staff.ts`, `Technical Coaching` manager pillar) but no assignments UI.
- Match-driven condition/recovery engine exists; no training-specific workload model.
- No training calendar, unit, position-training, traits, mentoring, youth-academy-generation, or training-camp code exists.
- The `packages/game-engine` and `packages/shared` are pure — any new training simulation logic goes there.

## Decisions so far

- [01 — Group H screen inventory survey](issues/01-screen-inventory.md): 0 built, 7 partial, 6 absent. Backend models for Training Focus and Player Development are fully implemented; calendar/units/position-training/traits/mentoring/youth-intake/training-camp have no code.
- [02 — Scope decision for absent screens](issues/02-scope-absent-screens.md): 6 screens in scope for v1 (105, 108, 111, 112, 113, 114); 7 deferred (106, 107, 109, 110, 115, 116, 117). See [Agent Note: Group H v1 scope](../../.agents/notes/proposed/architecture/2026-09-15-group-h-v1-scope.md).
- [03 — Build sequence](issues/03-partial-screen-build-sequence.md): Priority 1=Coaching Assignments, 2=Workload/Recovery, 3=Individual Training Plan, 4=Performance Report, 5=Player Dev Centre, 6=Training Overview.
- [Spec published](spec.md): Reconciled spec marking handoff from charting to slicing.
- [Implementation tickets](issues/): 6 vertical slices (04-09), all unblocked except 09 (blocked on 04-08).
- [05 — Workload and Recovery](issues/05-workload-and-recovery.md): shipped. The Rest/Active indicator is derived in main from stored Condition against the engine's non-contact threshold (75), so the renderer never imports the engine; v1 shows stored Condition, not a projection to the next kickoff. The detail line states the last injury's Severity this Season, since the ledger keeps it until Season start. Recorded in [spec.md](spec.md).
- [06 — Individual Training Plan](issues/06-individual-training-plan.md): shipped at `/training/plan/$playerId`, reached from Workload and Recovery rows; focus read from `getSquad`, set through the existing `setTrainingFocus`. Goalkeeping offered only to players with goalkeeping Attributes, renderer-side for now; main-side enforcement filed as [10](issues/10-enforce-goalkeeping-focus-rule.md).
- [07 — Performance Report](issues/07-performance-report.md): partly shipped, needs-info. The coach report stub shows Training Focus and season-over-season Attribute changes from `PlayerDeveloped` events through a new own-club-only read, `getPlayerDevelopmentHistory`. Open: what "coach rating" shows ([decision request 01](decision-request-01-performance-report-coach-rating.md)) and whether events should record pre-development Attributes so the first Season shows changes ([decision request 02](decision-request-02-development-baseline-in-events.md)).

## Not yet specified

None — all known decisions resolved. Proceeding to spec.

## Out of scope

- Screens 106 (Training Calendar), 107 (Training Unit Assignment), 109 (Position/Role Training), 110 (Additional Focus/Traits), 115 (Mentoring Groups), 116 (Youth Intake), 117 (Training Camp/Pre-Season Plan) — deferred to post-v1; each requires a new domain model.
- Game-engine simulation logic for training outcomes — chart UI surfaces first.