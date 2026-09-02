# 22: [Open question] What is `player_transfers`' primary key, and does it need a player-keyed index?

**Type:** open question — a decision, not execution. Do not implement an answer from this file; the
answer does not exist yet. Ticket 17 is blocked on it, because that ticket creates the table and
cannot invent a key silently.

**The question, unanswered:** the event-streams decision names five columns for the transfer table —
the player, a nullable from-club, a to-club, the in-world date, and the fee — and no key. Those
columns are not a key: a player may transfer to the same club twice, in two different seasons or
even twice within one, so the natural tuple is not unique. Whether the table takes a surrogate id, a
composite that includes the date, or something else is undecided.

The access path is undecided with it. The career-history read is player-keyed and ordered by date,
against the one table in this schema with unbounded growth: roughly 32,000 rows per season, about
3 MB, reaching roughly 640,000 rows and 64 MB over twenty seasons. It is the largest permanent growth
the schema accepts, and it is the only table the spec lists as unindexed-by-choice with a pointer to
this question rather than a reason.

The map did not reach this. It is recorded here rather than answered because a key chosen by whoever
writes the migration is a shape on disk nobody decided.

**What would settle it:**

- Decide the key. State whether a surrogate id or a composite, and say what makes rows distinct when
  a player joins the same club twice.
- Measure the career-history read against the existing prototype scale-probe harness at
  `apps/desktop/src/main/db/prototype-scale-probe/`, at twenty seasons of accumulated rows: its
  unindexed cost and plan, and its cost and plan under a player-and-date index, with that index's
  byte cost against the table's own ~64 MB.
- Record the outcome in the same form as the two shipping indexes, or as a stated
  unindexed-by-choice line.

**Blocked by:** None (can start immediately).

**Status:** ready-for-human

**Files:** `apps/desktop/src/main/db/prototype-scale-probe/probe.ts` and its results document;
`apps/desktop/src/main/db/schema.ts`, whose table definition ticket 17 writes from this answer.

- [ ] The table's primary key is decided and written down, with the reason the named columns alone
      are not a key.
- [ ] The player-keyed, date-ordered read is measured at twenty seasons of rows, unindexed and
      indexed, with query plans recorded.
- [ ] Ticket 17 is unblocked: it has a key and an index answer to build from.
