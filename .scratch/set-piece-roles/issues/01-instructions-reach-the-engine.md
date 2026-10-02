# 01: Set-piece instructions reach the engine

Spec: [spec.md](../spec.md)

**What to build:** each slot's `setPieceRoles` travels with the slot into `MatchTactic` and the runtime team
state, and survives substitutions and tactic changes the way slot instructions do. No behaviour change.

**Acceptance:** the roles of every player on the pitch are readable at a corner and a free kick; seeded
matches produce identical events before and after.

**Blocked by:** None

**Status:** resolved

## Answer

- `MatchSlot` gains optional `setPieceRoles`; `toMatchTactic` copies them from the stored Tactic's slots,
  and `ResolvedSlot.setPieceRoles` holds them at run time (all `default` when absent, as for a tactic
  stored in a match already being played). A substitute inherits the slot's roles; a live tactics change
  brings the new tactic's roles.
- `packages/game-engine/test/match/set-piece-roles.test.ts` covers all of that, and that explicit all-default
  roles leave three seeded matches event-for-event identical. The main-process match and season suites
  pass unchanged.

Found on the way and split out: per-slot **player instructions** never reach a real match either
(`toMatchTactic` drops them, and nothing else supplies them). Fixing it changes every match, so it is
[formations-and-instructions 35](../../formations-and-instructions/issues/35-player-instructions-reach-real-matches.md),
needs-triage.
