# Decision Request: does the save take a fourth and fifth index, for the club-scoped transfer read?

## Question

Transfer History (Screen 146) reads `player_transfers` with `from_club_id = ? OR to_club_id = ?`,
ordered by `transferred_on DESC`. No existing index serves that predicate, so the read is a full
scan of the one table in the schema with unbounded growth. Should the save carry
`player_transfers(from_club_id, transferred_on)` and `player_transfers(to_club_id, transferred_on)`?

## Why this is blocking

Not blocking the screen — ticket 07 shipped without them and is correct, just slower than it could
be. It is blocking because **the repo has a process for adding an index and I cannot complete it
alone.**

`db/schema.ts` states the save carries "exactly three" indexes, "every one measured against the
scale probe rather than assumed", and records that the third "was added by open question 22 rather
than by whoever happened to be writing the migration, which is what the index-count test exists to
force." `test/main/season/query-plans.test.ts:96` asserts the exact three by name.

I added the two indexes during this sprint, tripped that assertion, and backed them out rather than
edit it. The guard is working as designed: an agent adding an index in passing is the thing it
exists to stop. Going further needs a scale-probe measurement, which is a decision about what the
save costs, not an implementation detail.

## What is already settled

- `db/schema.ts` § Indexes — three indexes, each with a recorded justification; an index is "not
  free: it is written on every insert, and world generation writes hundreds of thousands of rows."
- The table's own comment — `player_transfers` grows ~32,000 rows a season, ~640,000 and ~124 MB
  after twenty; the unindexed career read was measured at 26.8 ms "and rising every season."
- [Group J v1 scope](../../.agents/notes/proposed/architecture/2026-09-15-group-j-v1-scope.md) —
  Screen 146 is own-club only.
- Ticket 07 shipped and is correct without this. Nothing here reopens the screen.

## Evidence gathered

`EXPLAIN QUERY PLAN` on the shipped query, against a table built from the real DDL:

```
-- with the three shipped indexes
|--SCAN t
`--USE TEMP B-TREE FOR ORDER BY

-- with the two proposed indexes added
|--MULTI-INDEX OR
|  |--SEARCH t USING INDEX player_transfers_from_club_date_idx (from_club_id=?)
|  `--SEARCH t USING INDEX player_transfers_to_club_date_idx (to_club_id=?)
`--USE TEMP B-TREE FOR ORDER BY
```

The full scan is eliminated. The sort is not — SQLite still sorts the union of the two index scans,
but over the matched subset rather than the whole table. **This is a query-plan shape, not a
measurement**: it was run on an empty table, so it says the indexes are *usable*, not what they are
worth at 640,000 rows. The scale probe (`db/prototype-scale-probe/`) is what would say that.

## Options

### Option A — add both indexes, after a scale-probe run

- **What the player experiences**: Transfer History opens in constant-ish time as a career ages,
  instead of degrading every season.
- **What it costs to build**: a probe run to produce the number; the schema change and regenerated
  drizzle artifacts; updating the "exactly three" prose and the index-count test together.
- **What it forecloses**: nothing, but it raises the write cost of every completed transfer and
  makes the save bigger — the cost the schema comment insists is real.
- **Save compatibility**: additive. There is no migration runner for existing saves; the generated
  DDL runs once at creation. An older save simply lacks the indexes and returns identical results
  more slowly, so nothing breaks either way.

### Option B — one index on `to_club_id` only

- **What the player experiences**: the same, for incoming transfers; outgoing still scans.
- **What it costs to build**: half the write cost.
- **What it forecloses**: the OR is only half-served, and SQLite's MULTI-INDEX OR needs *both*
  halves indexed — with one it falls back to the full scan. So this buys nothing for this query.
- **Save compatibility**: same as A.

### Option C — leave it, revisit when the club-scoped Transfers Detail screen is built

- **What the player experiences**: a screen that is fine now and slower after ten seasons.
- **What it costs to build**: nothing now.
- **What it forecloses**: nothing. The question returns with the deferred Screen 132/142/143 work,
  which hits this same query shape harder and against other clubs too.
- **Save compatibility**: unchanged.

## Recommendation

**Option C for now, Option A when the probe is next run.**

The read is a screen-open cost, paid once when a manager opens one screen — not a per-frame or
per-Matchday cost. At v1 save sizes the scan is cheap, and the schema's own standard is that an
index ships with a measurement behind it. I have a query plan, not a measurement, and inventing the
justification is exactly what the index-count test is there to prevent.

The deferred club-scoped screens (132, 142, 143) will ask this question again with more at stake.
Answering it once, then, with a probe number in hand, is better than answering it twice on a query
plan.

---

## Answer — Option C, and the trigger for Option A, 2026-09-19

**Not yet — and that is a decision, not a deferral of one.**

`db/schema.ts` states the save carries "exactly three" indexes, "every one measured against the scale
probe rather than assumed", and records that the third "was added by open question 22 rather than by
whoever happened to be writing the migration, which is what the index-count test exists to force".
`test/main/season/query-plans.test.ts:96` asserts the exact three by name.

**Adding an index on a query plan rather than a measurement is precisely what that test exists to
prevent.** Approving Option A now would satisfy this request by breaking the rule it invokes. This request
was right to refuse to complete itself.

So: **Option C holds, and Option A is pre-approved on one condition** — the next scale-probe run includes
the club-scoped `player_transfers` read, and if it measures badly, both indexes ship with that measurement
behind them and the index-count test's expected set grows to five by the same process that took it to
three.

The reasoning that makes waiting safe: this is a screen-open cost, paid once when a manager opens one
screen, not a per-frame or per-Matchday cost. At v1 save sizes a full scan of `player_transfers` is cheap,
and the table's unbounded growth is the thing to watch rather than the thing to pre-empt.

**What this needs from whoever runs the probe next** — live probe code already exists under
`apps/desktop/src/main/db/prototype-scale-probe/`, and the `world-data-model` effort's open questions 20
and 21 are also waiting on a probe run. Adding this read to that run costs almost nothing; running a probe
for this alone is not worth it.

Decided under the human's standing delegation ("i need you to solve the decisions"). No Agent Note: this
reaffirms a rule `db/schema.ts` already records rather than establishing a new one.
