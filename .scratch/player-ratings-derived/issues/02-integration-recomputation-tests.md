# Integration tests for post-mutation recomputation

Status: ready-for-agent

## Summary

Add integration tests proving that Player Development and injury-driven Attribute changes
automatically affect subsequent rating reads without explicit synchronization.

## Acceptance criteria

- **Player Development → rating recomputation**: run `developPlayersForSeason`, then read the same
  player's squad view — ratings reflect the changed Attributes without any rating-write step
- **Attribute mutation → rating recomputation**: directly UPDATE a player's Attribute in SQLite,
  then read ratings — the derived value changes
- Both tests assert no rating-write SQL statements were executed (by inspecting the test DB's
  write log or by asserting no rating columns exist to write to)
- Tests use the real `createSchema`, a generated squad, and the real `loadSquadPlayers` / squad view
- Tests run as part of `pnpm check:all`

## Rationale

The current implementation is correct (the audit confirmed zero violations), but no test proves
it stays correct when someone refactors Player Development or the squad read model.

## References

- Agent Note: `.agents/notes/proposed/architecture/2026-08-29-player-ratings-are-derived-projections.md`
- Development wiring: `apps/desktop/src/main/development.ts`
- Squad read model: `apps/desktop/src/main/squad.ts`