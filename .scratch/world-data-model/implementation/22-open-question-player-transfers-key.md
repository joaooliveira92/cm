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

**Status:** resolved

**Files:** `apps/desktop/src/main/db/prototype-scale-probe/probe.ts` and its results document;
`apps/desktop/src/main/db/schema.ts`, whose table definition ticket 17 writes from this answer.

- [x] The table's primary key is decided and written down, with the reason the named columns alone
      are not a key.
- [x] The player-keyed, date-ordered read is measured at twenty seasons of rows, unindexed and
      indexed, with query plans recorded. See below.
- [x] Ticket 17 is unblocked: it has a key and an index answer to build from.

## Measurement

Run against `player-transfers-key-probe.ts`, a focused harness beside the original probe. The
original was not revived: it builds a whole world against a DDL that has since moved on —
`clubs.name`, `season.current_matchday` and `fixtures.matchday` are all gone — and this question is
about one table's key and one read.

640,000 transfers (20 seasons x 32,000), 400,000 players, 16,000 clubs, 36-character ids as
`deriveId` produces them. The read is `WHERE player_id = ? ORDER BY transferred_on ASC`, averaged
over 25 players, measured on a cold connection.

| Candidate | Rows kept | File | Career read | Plan |
|---|---|---|---|---|
| Surrogate `id`, no index | 640,000 | 82.5 MB | **26.821 ms** | `SCAN` + `USE TEMP B-TREE FOR ORDER BY` |
| Surrogate `id` + `(player_id, transferred_on)` | 640,000 | 123.9 MB | 0.149 ms | `SEARCH ... USING INDEX` |
| `PRIMARY KEY (player_id, transferred_on)` | 596,120 | 112.8 MB | 0.139 ms | `SEARCH ... USING sqlite_autoindex` |
| `PRIMARY KEY (player_id, transferred_on, to_club_id)` | 597,520 | 137.9 MB | 0.143 ms | `SEARCH ... USING sqlite_autoindex` |
| The same, `WITHOUT ROWID` | 597,520 | **85.8 MB** | **0.088 ms** | `SEARCH ... USING PRIMARY KEY` |

**Unindexed is not viable.** 26.8 ms to read one career, scanning every transfer in the save and
sorting into a temp B-tree, growing without bound. This is the one table with unbounded growth, so
the cost is not a fixed tax but a rising one.

**No natural tuple is unique.** Both composite candidates dropped rows under `INSERT OR IGNORE` —
43,880 and 42,480 respectively. Those collisions are an artefact of the probe drawing players, clubs
and dates at random over a small date space, not a claim that the game produces them at that rate.
What they establish is the ticket's own point from the other side: uniqueness under a natural key
rests on a domain claim ("a player cannot transfer to the same club twice on one date"), never on
construction.

**The trade-off is 38 MB and a domain claim.** `WITHOUT ROWID` on the three-column composite stores
the row inside the primary-key B-tree rather than beside it, so it pays for no duplicate storage: it
is 38 MB smaller and slightly faster than a surrogate plus a separate index, and needs no second
index at all. A surrogate is unique by construction and costs those 38 MB — about a 46% increase over
the table itself — to be right without argument.

## Answer

**A surrogate `INTEGER PRIMARY KEY`, with an index on `(player_id, transferred_on)`.**

The 38 MB is real, and so is the reason to spend it. Every other key in this schema is either a
canonical id or a tuple whose uniqueness is structural; a `WITHOUT ROWID` composite here would be the
first key in the save whose correctness rests on a sentence about the domain rather than on the
shape. When that sentence turns out to be wrong — a two-stage transfer recorded on one date, a
loan-and-recall, a bug that writes twice — the failure mode is a silently dropped row in the one
table that is a permanent historical record. A surrogate cannot fail that way.

The named columns are not a key for the reason the question states: a player may join the same club
twice, in two seasons or twice within one, so no subset of (player, from-club, to-club, date, fee) is
unique by construction. Adding the date narrows it without closing it, and adding the destination
narrows it again without closing it either — both leave a sentence about the domain holding the key
up.

The 38 MB is the price of not needing that sentence. It buys the third index in the save, which is
exactly the kind of addition ticket 19's index-count test exists to force a decision about; this is
that decision, and that test is updated to three with this one named.

The measurement above is what the choice was made against, and a later reader who weighs 38 MB per
save differently has the numbers to reopen it with.
