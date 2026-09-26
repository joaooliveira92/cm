# 12: Domestic cups with real bracket progression

**What to build:** a season has more than one competition in it. A domestic cup runs alongside the
league, drawn from the source competitions the graph names, with real round-by-round progression. A
drawn tie is settled by a penalty shootout, so a knockout always produces a winner. A field whose
size is not a power of two works, with byes going to clubs from the strongest source divisions, so
the catalogue is free to describe real fields. A tie between a squad-bearing club and a
`results-only` club resolves through ticket 11's collapse function, so giant-killing rounds exist
across the depth boundary.

The bracket reproduces from the world seed rather than being stored: both the draw seed and the
match seed hash canonical ids, so the same career replays the same bracket. A cup fixture row is
created only once both its participants are known, and its date is what the slot template always
yielded for that round, whenever the row was computed.

There is no extra time, no replay, and no second leg: a drawn tie goes straight to a shootout,
leaving the engine's two halves and its 90-minute fatigue calibration untouched. A shootout resolves
outside the minute loop and emits no match events, so the timeline shows a drawn 90 minutes with a
winner from elsewhere; surfacing that is a screen, not part of this ticket.

The slice's edge promise: drawing a round and materialising its fixtures happens inside the advance's
existing transaction. A round whose participant set is not yet complete is not an error — the round
is simply not drawn yet — while an entrant count the bracket cannot seat is a typed failure at
generation, since it is reachable from a catalogue that names too few or too many sources.

**Decisions:**

- Cup fixtures materialise as their participants become known, with dates still a pure function of
  round; drawn ties go straight to a shootout, leaving the two-half engine untouched; both draw and
  match seeds hash canonical ids, so the bracket reproduces without being stored. See
  [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-02-season-fixture-and-cup-schedule.md).

**Blocked by:** 05 (cup entry edges), 09 (dated fixtures and penalty columns), 10 (the advance is
date-driven before a cup can interleave with a league), 11 (a mixed tie needs the depth collapse).

**Status:** resolved

**Files:** `apps/desktop/src/main/season.ts` (the advance and the round draw), a bracket module in
`packages/shared/src`, `packages/game-engine/src/seed.ts`, the calendar slot-template module,
`apps/desktop/test/season.test.ts`.

- [x] A cup competition's first round is drawn from the clubs its entrant edges name, and each later
      round is drawn once its participants are known; no bracket is stored.
- [x] A field of 44 produces a valid bracket with byes held by clubs from the highest-tier source
      competitions, and a test covers it.
- [x] Two saves from one world seed produce identical draws through every round, and a test asserts
      it.
- [x] A drawn tie is settled by a shootout recorded in the fixture's penalty columns; both penalty
      columns are NULL together or set together, and no fixture goes to extra time or a replay.
- [x] A cup fixture exists only once both participants are known, at the date its round would always
      have had.
- [x] A tie between a squad-bearing club and a `results-only` club resolves without invoking the
      match engine, and a test covers it. **Note:** no shipped scope option can produce this tie yet
      — England's pyramid loads all four divisions playable, and a nation set to `view_only` has no
      playable division for one to meet. The test stages the state instead: it puts the fourth
      division at `results-only` and discards its squads, which is exactly and entirely what a
      results-only division is on disk. The code path is real; the catalogue cannot currently reach
      it. Worth a scope option that mixes depths within one nation.
- [x] The cup winner is readable as the participant whose final position is 1; no winner column
      exists.
- [ ] `pnpm check:all` is green at this commit. **Not met, and not by this ticket's doing** — see
      ticket 11's note. HEAD is red from the Base UI Select migration, and a second session's
      in-flight `useTransfersScreen.ts` now also fails typecheck. Every test this ticket touches is
      green, and no failure is attributable to it.
