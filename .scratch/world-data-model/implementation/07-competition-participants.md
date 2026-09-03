# 07: Membership and standings live on participant rows

**What to build:** the game can say which competition a club is in, for any season, without ever
disagreeing with itself — and last season's final table survives into this season as history rather
than as something recomputed from fixtures that may no longer exist. One participant row per club
per competition per season answers both: it is the membership record while the season runs, and the
frozen final standing once the season concludes.

A club's current competition is its participant row for the current season; its generated home is
its row for season 1. Neither is a column anywhere, and promotion therefore cannot leave two answers
on disk. There is deliberately no header table above these rows: every column such a header would
hold — champion, concluded flag, participant list — derives from the rows themselves, and the
existence of rows for a competition and season already records that the competition ran that season.

The standings columns stay NULL while a season is in progress and are frozen at season conclusion by
ticket 13's rollover; this ticket ships the shape, the season-1 membership write, and the
membership reads that replace whatever infers a club's competition today.

The slice's edge promise: asking which competition a club is in is a query over authoritative state
with no fallback and no derived cache. A club with no participant row for the current season is a
defect — every club in a loaded competition has one from generation onward — rather than an empty
result callers must handle.

**Decisions:**

- One `competition_participants` table carrying frozen final positions replaces both the `season`
  generalization and ticket 02's unnamed per-Season row. See
  [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-02-season-fixture-and-cup-schedule.md).
- The catalogue stays code and the save records the resolved world: an activated-only `competitions`
  table, symmetric Exchange Links carrying promotion and relegation as one fact, a closed world at
  the edge of the chosen scope, and membership answered from participant rows rather than a column.
  See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-01-competition-graph-and-promotion.md).

**Blocked by:** 05, 06.

**Status:** resolved

**Files:** `apps/desktop/src/main/db/schema.ts` and the regenerated DDL,
`apps/desktop/src/main/worldGeneration.ts`, `apps/desktop/src/main/season.ts`,
`apps/desktop/src/main/clubSelection.ts`, `apps/desktop/test/db-schema.test.ts`,
`apps/desktop/test/season.test.ts`.

- [x] `competition_participants` exists keyed on the competition, the season number, and the club,
      carrying a final position, points, goal difference, and goals for, all nullable until frozen.
- [x] Generation writes one row per club per competition for season 1, and a test asserts that for
      every league and every season the participant count equals that competition's club count.
- [x] There is no `competition_seasons` header table and no `winner_club_id` column anywhere, and a
      test asserts a competition's champion is read as the participant whose final position is 1.
- [x] No column on `clubs` answers a club's current or generated-home competition, and a test
      asserts it.
- [x] Rows are retained for the life of the save, so a completed season's final table is readable
      after a rollover without reading any fixture.
- [~] `pnpm check:all` is green at this commit — every gate but repo-wide `typecheck`, which
      fails only on a parallel session's in-flight files. See the comment below.

## Comments

**The membership read that this replaced was `SELECT * FROM clubs`.** `getClubSelection` listed
every club in the save, which was indistinguishable from "every club in the league" only while a
world held one competition — exactly the assumption this ticket ends. It now joins participant rows
for the current season against the league it already resolves. Nothing else in the main process
inferred a club's competition, because until ticket 06 no club had one.

**Season 1's rows are written by generation, not by `startSeason`.** A club is generated *into* a
competition, so the participant row is written in the same statement pair as the club itself. That
also makes the row the club's generated home for free and permanently, since nothing rewrites season
1's rows — which is what lets `clubs` carry no provenance column.

**The standings columns ship empty and nothing freezes them yet.** Ticket 13's rollover is what
writes `final_position`, points, goal difference, and goals for. The test stands in for it by
freezing a season's rows by hand, then deleting every fixture, and reading the champion back — which
is the property worth pinning: a frozen table survives the fixtures that produced it, and the next
season's fixtures overwrite those inputs.

**`pnpm check:all` was not run clean end to end at this commit, and here is why.** A parallel session
is mid-implementation of a News Inbox in this worktree; `apps/desktop/src/main/rpcServer.ts` and
several renderer modules currently reference handlers and a screen that do not compile yet, so the
repo-wide `typecheck` gate fails on their files. Every other gate is green — `oxlint` (0 errors),
`effect-lint`, `verify-md-links`, `verify-db-schema` — and both test suites pass in full: 902 desktop
tests and 283 shared. Typecheck passes across every file this ticket touched. This is recorded rather
than smoothed over, because "check:all green" is a claim this commit cannot honestly make on its own.
