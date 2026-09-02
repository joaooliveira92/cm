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
