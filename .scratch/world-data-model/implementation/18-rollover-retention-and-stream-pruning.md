# 18: Retention at rollover — the player's history survives, the world's does not

**What to build:** the player's own past seasons' fixtures are kept and everyone else's are discarded
at the rollover, so their history survives without the save doubling every twenty seasons. A match
stream is pruned exactly when its fixture is, so the log never outlives the thing it describes.

The rule is participation: past-season fixtures survive only for competitions the player's club
played in. Everything else is deleted irreversibly, so no screen can ever show a rival nation's
history — the frozen participant standings from ticket 07 are all that remains of it. That is worth
carrying forward as a constraint on later features rather than as a footnote.

Nothing else in the log is ever pruned. There is no partitioning and no snapshotting, because the
only fold in the system is one 90-minute match.

The slice's edge promise: pruning runs inside the rollover's existing transaction, so a save is never
left with a stream whose fixture is gone. Deleting nothing is the normal case for a player's first
season and is not a failure.

**Decisions:**

- Past-Season fixtures survive only for competitions the human played in. See
  [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-02-season-fixture-and-cup-schedule.md).
- Two Deciders fold a stream and the third never did: the log records only facts no table holds, it
  grows at human scale rather than world scale, none of the five named read models becomes a table,
  and one new authoritative table `player_transfers` replaces the transfer events this removes. See
  [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-02-event-streams-and-read-models.md).

**Blocked by:** 13, 17.

**Status:** ready-for-agent

**Files:** `apps/desktop/src/main/season.ts` (the rollover), `apps/desktop/test/season.test.ts`,
`apps/desktop/test/season-summary-archived.test.tsx`.

- [ ] At the rollover, past-season fixtures are deleted for every competition the player's club did
      not participate in, and retained for every competition it did.
- [ ] A match stream is deleted exactly when its fixture is, and a test asserts that after a rollover
      a match stream exists only for a surviving fixture.
- [ ] Nothing else in the log is pruned, and no partitioning or snapshotting is introduced.
- [ ] A season summary for a past season still reads, sourced from the frozen participant rows rather
      than from deleted fixtures.
- [ ] `pnpm check:all` is green at this commit.

## Input from ticket 13

The rollover landed with **nothing pruned**, which is a starting position rather than an answer.

`season` was described as a per-save singleton, but three tables key onto `season_number` —
`fixtures`, `board_objective`, and `player_fitness`. A singleton whose number advanced at the
rollover could only work by deleting every child row of the season just finished, which would have
made this ticket's decision by deletion. So `season` now holds one row per season and nothing is
discarded: season 1's fixtures are still on disk after the rollover, and so is its board objective.

`player_fitness` is the exception, and not by choice: its primary key is `player_id` alone, so it is
a current-state ledger with a season stamp rather than per-season history. The rollover updates those
rows in place. If retention wants a fitness history, that table needs a composite key first.

What this ticket has to decide: whether a save keeps every season's fixtures forever, and what a
growing `fixtures` table costs after ten seasons at pyramid scale. The freeze is what makes any
answer safe — final positions live on participant rows, so discarding fixtures never discards a
table.
