# 35: Player instructions reach real matches

Found 2026-10-02 while wiring set-piece roles ([set-piece-roles 01](../../set-piece-roles/issues/01-instructions-reach-the-engine.md)).

**What's wrong:** no real match applies per-slot player instructions. The engine reads them from
`MatchTactic.slotInstructions` (`resolveTeamTactics` in `packages/game-engine/src/match/tactical-modifiers.ts`),
but nothing produces that field: the stored Tactic keeps instructions on each slot, and `toMatchTactic`
(`packages/game-engine/src/match/types.ts`) falls back to `null`, which resolves to the default
instructions. Every human and AI match since ticket 26 has played with default player instructions; the
engine's own tests pass `slotInstructions` directly, so nothing failed. Ticket 26 meant to replace the
transitional adapter and didn't for this field.

**The fix is one line** (read `slot.instructions` in `toMatchTactic`), **but it changes every match:**
built-in templates seed non-default instructions per slot. Measured on 2026-10-02: 16 main-process tests
fail across about 11 pinned seeds (`INJURY_SEED`, `GOALKEEPER_STAND_IN_SEED`, `SEED` in
revealed-state, `KEEPER_SENT_OFF_SEED`, …).

**To decide:** whether the calibration targets (goals 2.5-2.8, yellows 3-4, fouls 20-26) hold with the
instructions real tactics carry, measured through `toMatchTactic` on built-in templates rather than the
engine fixtures; then repin the seeds.

**Blocked by:** None

**Status:** needs-triage
