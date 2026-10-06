# Agent Note: The match adapter reads one tactic shape

Status: implemented

## Problem

`toMatchTactic` admitted two representations of a slot's player instructions: the stored Tactic's
per-slot `instructions`, and a parallel top-level `MatchTactic.slotInstructions` array. Production
never set the array — `loadPersistedTactic` returns the Tactic, whose instructions live on each slot —
so the adapter filled the array with a `null as unknown as PlayerInstructions` placeholder that the
engine resolved to the default. Every match played with default player instructions, while the engine
tests set `slotInstructions` directly and exercised a path production could not reach. The interface
was nearly as wide as its implementation, and the wrong branch was the default.

## Decision

`MatchSlot` carries a required `instructions`; `MatchTactic` has no separate array. `toMatchTactic`
maps the stored slot's own instructions into the slot, and `resolveTeamTactics` reads them straight
from the slot. The `resolvePlayerInstructionSlots` helper and its null fallback are gone.

The rule: the match adapter reads the one shape the persisted Tactic already has, and never invents a
parallel one. A field the engine needs is either on the slot the Tactic stores or it does not exist.

## Alternatives considered

- **Keep `slotInstructions` and have production populate it.** Rejected: two sources of truth for the
  same fact, and nothing stops one from drifting from the other. The stored Tactic already names the
  slot as the owner (see
  [`2026-09-29-tactic-templates-and-grid-cell-slots`](../architecture/2026-09-29-tactic-templates-and-grid-cell-slots.md)).
- **Keep a null fallback for callers that omit instructions.** Rejected: the interface would still
  admit the impossible state, and a caller that omitted the field would silently play the default
  rather than fail. The type now makes the omission a compile error.
- **Delete `MatchSlot` and read the stored `Tactic` directly in the engine.** Rejected: the engine
  stays tactic-vocabulary-free by adapting at the boundary; that boundary is the point of the adapter.

## Consequences

- Reading the real instructions changes every match's timeline, because built-in templates seed
  non-default instructions per slot. The pinned main-process seeds were repinned in the same change
  ([formations-and-instructions 35](../../../../.scratch/formations-and-instructions/issues/35-player-instructions-reach-real-matches.md));
  `apps/desktop/test/main/match/seedSearch.ts` makes the next repin mechanical.
- The measured balance shift is negligible (goals 4.13 → 4.07, yellows 0.58 → 0.60, fouls 3.77 →
  3.74 over 300 matches), so no engine constant moved. The engine's distance from its stated
  calibration targets predates this change and is tracked separately
  ([match-engine-detail 20](../../../../.scratch/match-engine-detail/issues/20-calibration-harness-asserts-nothing.md)).
- The adapter can no longer represent "a slot with no instructions"; a future caller must supply them
  or the type rejects the call.