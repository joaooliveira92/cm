# 17: Retraining a player toward a new line or side

**What to build:** On a player's screen the manager can set, change or clear one retraining
target: a line or a side. Each weekly training tick raises that rating gradually, faster for younger
and more determined players (rate as a tuning constant), up to 20; no other positional rating changes,
nothing decays, and match minutes change nothing. The target is stored with the player.

Seam: a new manager command in the main process with an observable failure channel: the player is
not in the manager's club, or the target is not a line or a side. It needs the training tick's
existing services; the tick itself adds no failure. Tested at [the spec](../spec.md)'s seam 3, advancing with the
existing boundary helpers.

**Decisions:**

- **Retraining only: one line-or-side target per player, rising through the weekly training tick, no decay, no growth from playing.** See [Agent Note](../../../.agents/notes/proposed/feature/2026-09-29-positions-retrain-through-training-only.md).

**Blocked by:** 13

**Status:** ready-for-agent

- [ ] Setting a target for a player outside the manager's club fails with a typed error the screen shows.
- [ ] Over several weeks of advancing, a targeted rating rises and no other positional rating changes.
- [ ] A player without a target keeps identical positional ratings through a season.
- [ ] A younger, more determined player gains faster than an older one with the same target.
- [ ] `pnpm check:all` is green, and the player-screen e2e spec passes.
