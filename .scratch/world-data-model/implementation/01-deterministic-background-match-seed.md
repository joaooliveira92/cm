# 01: Seed the background match deterministically

**What to build:** a bug reporter who regenerates a world from its seed and advances it gets the
same results every time, including for fixtures the human never watched. Today a background fixture
is simulated from a seed drawn out of `Math.random()`, so two advances of the same save produce
different league tables and no result in the world is reproducible from the two values a report can
carry. After this ticket the seed for every fixture is derived from the world seed and the fixture's
own identity, so the whole world — not only its squads — replays.

This was found while resolving decision ticket 11 and ruled a query-layer and engine-call defect
rather than a shape on disk: no table changes, and the fix is the same before and after the schema
reshaping. It lands first because every determinism acceptance criterion in the tickets below is
false while it stands.

The slice's edge promise: resolving a fixture stays an effect over the save's SQL client with no new
service in `R`, and its failure channel is unchanged — a missing full-time whistle stays the one
typed failure, and an undrawable seed is impossible rather than an error.

**Decisions:**

- Two Deciders fold a stream and the third never did: the log records only facts no table holds, it
  grows at human scale rather than world scale, none of the five named read models becomes a table,
  and one new authoritative table `player_transfers` replaces the transfer events this removes. See
  [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-02-event-streams-and-read-models.md).
- Both draw and match seeds hash canonical ids, so the bracket reproduces without being stored. See
  [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-02-season-fixture-and-cup-schedule.md).

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Files:** `apps/desktop/src/main/season.ts` (`resolveFixtureScore`, and `resolveMatchday` which
calls it), `packages/game-engine/src/seed.ts` if a derivation helper is missing,
`apps/desktop/test/season.test.ts`.

- [ ] No call to `Math.random()` remains anywhere in `apps/desktop/src/main`; the match seed for a
      fixture is derived from the save's world seed together with values that identify that fixture
      and no other.
- [ ] The derivation reads only stored, replayable values. It does not read the clock, a row count,
      a collection length, or an iteration position.
- [ ] A test advances the same save twice from the same starting state and asserts every fixture's
      goals are identical, and that two saves generated from one world seed produce identical
      results after the same number of advances.
- [ ] The human's own watched fixture is unaffected: its seed still comes from where it comes from
      today, and the match-stream replay tests stay green.
- [ ] `pnpm check:all` is green at this commit.
