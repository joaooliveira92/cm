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

**Status:** resolved

- [x] Setting a target for a player outside the manager's club fails with a typed error the screen shows.
- [x] Over several weeks of advancing, a targeted rating rises and no other positional rating changes.
- [x] A player without a target keeps identical positional ratings through a season.
- [x] A younger, more determined player gains faster than an older one with the same target.
- [x] `pnpm check:all` is green, and the player-screen e2e spec passes.

## Comments

2026-09-29: shipped in d87f20f1. The ticket's "weekly training tick" does not exist (the calendar has no
weeks), so progress advances once per Microcycle, at the human's Matchday commit, the unit the
Training Schedule plans in. Verified: typecheck, lint and effect-lint (apart from a parallel
session's staged file) pass; shared (619), contracts (233), the new main retraining test, and the
renderer plus main club, season and rpc suites (2078) pass. The note's "weekly training tick"
wording should read "each Microcycle" when the note is promoted in ticket 19.
