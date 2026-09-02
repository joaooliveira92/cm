# 19: The two indexes, and the league table stops reading the world

**What to build:** opening a squad is instant in a four-hundred-thousand-player world, and rendering
a league table reads one competition's fixtures rather than every fixture in the save. The save has
zero indexes today; two ship, and every other table stays unindexed as a stated choice rather than an
oversight.

The squad index is measured: the squad view goes from 127 ms to 0.9 ms at 400,000 players, faster
than the same query on an unindexed 20,000-player save. The league-table index only pays once the
standings query names the competition it is rendering — an unindexed scan costs 302 ms at 400,000
players precisely because it reads every played fixture in the save. Adding that predicate is in
scope here; the other read-path defects the scale probe measured are not.

The reason every other table is unindexed is recorded per table, so a later reader finds a decision
rather than a gap: the log's three-column primary key already serves both access paths the code has;
the scouting tables are read either by their club prefix or as point lookups on their full key, with
the unique player constraint itself serving the "already assigned" question; the catalogue tables
hold tens to hundreds of rows read by id or wholesale; the participant key's competition-and-season
prefix serves every competition-keyed read; and the rest are point lookups on a primary key.

The scale probe's third measured index does not ship: the contract table's player column is already
its primary key, so SQLite's automatic index over it serves the same lookups and a second index on
the same column would be pure cost.

The slice's edge promise: an index changes no observable behaviour, so no caller's error channel or
service set changes. What is observable is the query plan, and that is what the tests assert.

**Decisions:**

- The save's size and its cliffs are measured rather than estimated. A 400,000-player world is
  ~335 MB and ~22 seconds to generate, both linear. The save has zero indexes, and one on
  `players(club_id)` takes the squad view from 127 ms to 0.9 ms. Full numbers, per-table byte
  breakdown, and query plans:
  [RESULTS.md](../../../apps/desktop/src/main/db/prototype-scale-probe/RESULTS.md).

**Blocked by:** 07, 09.

**Status:** ready-for-agent

**Files:** `apps/desktop/src/main/db/schema.ts` and the regenerated DDL,
`apps/desktop/src/main/season.ts` (`computeStandings`, `getLeagueTable`),
`apps/desktop/src/main/db/prototype-scale-probe/probe.ts` if the probe needs the new shape,
`apps/desktop/test/season.test.ts`, `apps/desktop/test/db-schema.test.ts`.

- [ ] An index on the player table's club column ships, and a test asserts `EXPLAIN QUERY PLAN` on
      the squad view uses it rather than scanning.
- [ ] An index on the fixture table's competition, season, and played columns ships, and a test
      asserts `EXPLAIN QUERY PLAN` on the league table uses it.
- [ ] The standings query names the competition it is rendering, so a league table reads one
      competition's fixtures.
- [ ] Exactly two indexes exist beyond SQLite's automatic primary-key and unique-constraint indexes,
      and a test asserts the count so a third cannot be added without a decision.
- [ ] Each unindexed table carries a comment recording why it needs no index.
- [ ] The N+1 club loop, the quadratic position filter, and the other read-path defects the scale
      probe measured are deliberately untouched: they are out of scope per the map.
- [ ] `pnpm check:all` is green at this commit.
