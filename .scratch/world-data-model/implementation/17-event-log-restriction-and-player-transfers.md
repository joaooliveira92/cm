# 17: The log records only facts no table holds, and transfers become a table

**What to build:** the save's event log stops growing with the size of the world and starts growing
with the player's own career. The timeline of a match the player watched stays re-derivable, their
own squad's development stays recorded, and the career's narrative moments — season start, window
open and close, board judgment, warnings, sacking, retirement — carry the in-world date, so a career
reads as a chronology. Everything else stops being written: a background fixture resolves with zero
rows in the log, and the per-advance resolution event carries the date and a count of the fixtures it
resolved rather than every result, so its size is independent of how many fixtures resolved.

The governing rule this implements is that an event is appended only where it is the sole record of a
fact. Two measured costs disappear with it: about 204 MB per season of development payloads across
every club, and a roughly 1.2 MB single row on every Continue. One deliberate exception stays —
scouting progress restates a table, kept as the recovery path for a missed or double-fired matchday
hook, and it costs about forty rows a season because scouts exist only for the human's club.

What the log stops recording, a table starts. Completed transfers become authoritative rows,
world-wide, including transfers between two clubs the player never sees, so a player's career history
— the clubs they played for and when — is answerable years later by one query over the player and
those rows, with no need to read the log and no career-history table.

A match stream's identity becomes the fixture's own id, restoring the keyspace the code drifted from.
Collapsing the match id brand onto the fixture id in the RPC contract is a separate contracts change
and is out of scope here.

The slice's edge promise: appending is unchanged as an effect; what changes is which call sites do
it. Reading a career history is a query over authoritative tables with no fold, so it adds no
service to `R` and no failure to any caller.

**Decisions:**

- Two Deciders fold a stream and the third never did: the log records only facts no table holds, it
  grows at human scale rather than world scale, none of the five named read models becomes a table,
  and one new authoritative table `player_transfers` replaces the transfer events this removes. See
  [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-02-event-streams-and-read-models.md).

**Blocked by:** 10 (every event needs the save's current date, and a match stream needs the integer
fixture id), 11 (a background fixture must already resolve without the engine), 22 (the transfer
table's primary key is an open question this ticket may not answer by itself).

**Status:** ready-for-agent

**Files:** `apps/desktop/src/main/db/schema.ts` and the regenerated DDL,
`apps/desktop/src/main/decider.ts`, `apps/desktop/src/main/match.ts`,
`apps/desktop/src/main/season.ts`, `apps/desktop/src/main/development.ts`,
`apps/desktop/src/main/transfers.ts`, `packages/contracts/src/schemas.ts`,
`apps/desktop/test/decider.test.ts`, `apps/desktop/test/match.test.ts`,
`apps/desktop/test/matchday-streaming.test.ts`, `apps/desktop/test/transfers.test.ts`.

- [ ] `events` gains an in-world date column alongside its existing created-at column, keyed
      unchanged on stream type, stream id, and sequence.
- [ ] A club stream exists only for the human's club, and a test asserts no row carries a club stream
      type for any other club.
- [ ] A background fixture resolves with zero rows written to the log, and a test asserts it.
- [ ] The per-advance resolution event carries the date and a resolved-fixture count; a test asserts
      its payload size is independent of how many fixtures resolved, and that no payload anywhere
      carries a field named `matchday`.
- [ ] A match stream's stream id is the fixture's id; the column stays text and carries no foreign
      key, with a comment recording that the stream type varies.
- [ ] `player_transfers` exists carrying the player, a nullable from-club, a to-club, the in-world
      date, and the fee. A freshly generated world has zero rows; every completed transfer
      world-wide writes exactly one.
- [ ] A player's career history is answerable by one query over the player row and these rows
      ordered by date, without reading the log, and a test asserts it. No career-history table
      exists.
- [ ] Deleting a player deletes their transfer rows.
- [ ] None of the five named read models becomes a table; a test asserts no such table exists.
- [ ] `pnpm check:all` is green at this commit.
