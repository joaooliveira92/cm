# 08: Player Development display

**What to build:** A view of a player's development trajectory, either as a dedicated route at `player/$playerId/development` or a panel within Player Profile. Shows:

- Current Training Focus (reads existing value, `SquadPlayerView.trainingFocus` already exists)
- Training Focus management surface (reuses `setTrainingFocus` RPC)
- Development progress indicators: how attributes have changed season to season (requires reading the attribute history across Season boundaries)

The development history display requires a projection of attribute snapshots per season. Initial v1 can compute this from the event stream rather than persisting a separate table.

**Decisions:**

- Screen 61 (Player Development / Training Effects) is in scope per ticket 04.
- `setTrainingFocus` RPC already exists (rpc.ts:376) and is consumed inline in squad table.

**Blocked by:** 05 (if profile RPC is extended to include development data), otherwise 06 (if development is a sub-section of profile).

**Status:** ready-for-agent

- [ ] Development display component showing Training Focus and per-season attribute changes
- [ ] Training Focus management (reads current, calls setTrainingFocus)
- [ ] Three view states
- [ ] Unit tests
- [ ] `pnpm check:all` passes