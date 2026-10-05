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

**Status:** resolved

## Resolved 2026-10-05

The adapter's dual shape is gone. `MatchTactic.slotInstructions` is deleted; each `MatchSlot` now
carries its own required `instructions`, `toMatchTactic` reads `slot.instructions`, and
`resolveTeamTactics` passes it straight to `resolveSlotVectors`. The `resolvePlayerInstructionSlots`
helper and its null fallback are deleted — there is no unreachable branch left to be the default.

**Balance.** Measured through `toMatchTactic` on built-in templates over 300 matches, seeded
instructions shift the aggregates negligibly against the default-instruction run: goals
4.13 → 4.07, yellows 0.58 → 0.60, fouls 3.77 → 3.74. The gap to the stated calibration targets
(2.5–2.8 goals, 3–4 yellows, 20–26 fouls) predates this change and is unchanged by it, so no engine
constant was retuned. (`packages/game-engine/test/match/calibrate.test.ts` no longer asserts the
targets — it simulates without an assertion.)

**Re-pinned seeds.** 14 main-process tests across 8 pinned seeds now read the new timelines:
`INJURY_SEED` 34→110 (`commands.test.ts`), `KEEPER_SENT_OFF_SEED` 645→1322 with
`RED_CARD_MINUTE` 56→11, `RED_CARD_THEN_FORCED_SUB_SEED` 334→944,
`FORCED_SUB_AFTER_COMMAND_SEED` 334→43, `SEED` 1301→5933,
`GOALKEEPER_STAND_IN_SEED` 942→43, `MINUTE_45_FORCED_SUB_SEED` 8→3840 and
`STOPPAGE_FORCED_SUB_SEED` 4381→5225. Each was found by enumerating seeds over `deriveMatchEvents`
under the AI clubs' preferences, and each test's own guard re-checks the property it needs.
