# Sprint Plan

## Immediate next action

`.scratch/world-data-model/implementation/03-generation-provenance-and-snapshot-handoff` — the
world-data-model implementation frontier: lowest-numbered `ready-for-agent` build ticket in that
effort. Re-derive from `.scratch/world-data-model/implementation/` before starting; plan rows decay,
the tracker is truth.

## Queue

World-data-model implementation tickets (in dependency order, all `ready-for-agent` unless noted):

- 02 nations-and-cities-rows ← next
- 03 generation-provenance-and-snapshot-handoff
- 04 display-names-through-the-content-pack
- 05 competition-graph-tables (blocked by 02, 03)
- 06 clubs-generated-per-competition (blocked by 02, 04, 05)
- 07 competition-participants (blocked by 05, 06)
- 08 player-provenance-and-name-pools (blocked by 02, 06)
- 09 fixtures-competition-scoped-and-dated (blocked by 06, 07, 23)
- 10 continue-advances-by-date (blocked by 09)
- 11 simulation-depth-on-disk (blocked by 06, 10)
- 12 domestic-cups (blocked by 05, 09, 10, 11)
- 13 promotion-and-relegation-rollover (blocked by 07, 10, 11)
- 14 board-objective-names-its-competition (blocked by 07, 13)
- 15 staff-coach-and-scouts
- 16 scouting-assignments-and-progress (blocked by 15)
- 17 event-log-restriction-and-player-transfers (blocked by 10, 11, 22)
- 18 rollover-retention-and-stream-pruning (blocked by 13, 17)
- 19 the-two-indexes (blocked by 07, 09)
- 20-23: open questions, `ready-for-human`

See `implementation/README.md` for the authoritative sequence and blockers.