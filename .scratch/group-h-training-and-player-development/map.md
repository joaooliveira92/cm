# Map: Group H — Training and Player Development

Label: `wayfinder:map`

## Destination

A reconciled spec covering all 13 Group H screens (105-117) — training overview, calendar/schedule, training unit assignment, individual training plan, position/role training, additional focus and trait development, coaching assignments, workload and recovery, performance report, player development centre, mentoring groups, youth intake and academy development, training camp and pre-season plan — stating per screen what is already built and what needs new surfaces.

## Notes

- Training screen (`apps/desktop/src/renderer/training/TrainingScreen.tsx`) is a placeholder stub.
- `SetTrainingFocus` command and `TrainingFocusSetEvent` exist; `PlayerDevelopedEvent` drives per-season attribute changes.
- No training calendar, unit, coaching, workload, mentoring, or youth academy domain model exists.
- The `packages/game-engine` and `packages/shared` are pure — any new training simulation logic goes there.
- Training Focus is set per-player-per-season via the Squad screen; the training screens will need new UIs and potentially new RPCs.
- Player Development Centre (Screen 114) and Youth Intake (Screen 116) are large features that may need their own substructures.

## Decisions so far

*None yet — this map is being chartered.*

## Not yet specified

- Which screens already have backend domain models vs. need new ones (coaching assignments, workload, mentoring, youth intake)
- Whether Screens 114-117 (development centre, mentoring, youth intake, training camp) are in scope for v1 or deferred
- Build sequence and shared components

## Out of scope

- Game-engine simulation logic for training outcomes (the domain model for *how* training affects attributes is speculative — chart the UI surfaces first)