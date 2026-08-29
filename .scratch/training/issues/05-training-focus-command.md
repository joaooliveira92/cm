Type: task
Status: resolved
Blocked by: 03, 04

# 05: Training Focus command, persistence & application

**What to build:** the full Training Focus loop on top of the wired Player Development. A `SetTrainingFocus`
RPC command lets a manager set (or clear) a player's focused Category on their own club, persisting it
and emitting a `TrainingFocusSet` event on that club's stream. A read path surfaces a player's current
focus (a missing value reads as the no-focus default — no migration/backfill). And the `SeasonConcluded`
development now applies the focused-Category multiplier from the shared math: a player with a focus gets
that Category's growth step multiplied, while a no-focus player develops unmodified. The manager gains a
working lever over how a prospect develops, and AI clubs' players (with no focus set) are unchanged.

**Blocked by:** 03, 04.

**Status:** ready-for-agent

- [ ] `SetTrainingFocus` is a typed RPC command (`packages/contracts`), scoped to a player of the user's
      club, setting a focused Category (or no-focus).
- [ ] Setting a focus persists it and appends a `TrainingFocusSet` event on the club stream, in the same
      transaction.
- [ ] A read path surfaces a player's current focus; a missing value reads as the no-focus default with
      no schema migration.
- [ ] At `SeasonConcluded`, the player's stored focus applies the focused-Category multiplier to that
      season's development; a no-focus player (including all AI clubs) develops on unmodified Player
      Development.
- [ ] New `SetTrainingFocus` / `TrainingFocusSet` schemas round-trip (`packages/contracts`).
- [ ] Verified end-to-end following the `apps/desktop/test/aiClubs.test.ts` pattern: set a focus on a
      user-club player, drive `advanceCalendar`, assert that Category grew more than the others and the
      focus event fired.

## Comments

- Published from the approved `to-tickets` breakdown (spec: `.scratch/training/spec.md`).
- Implemented in commit `5e39c4a` ("Implement Player Development & Training Focus (tickets 03-05)").