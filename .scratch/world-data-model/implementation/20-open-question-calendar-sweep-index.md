# 20: [Open question] Is there an index for the calendar advance's date sweep?

**Type:** open question — a decision, not execution. Do not implement an answer from this file; the
answer does not exist yet.

**The question, unanswered:** the date-bearing calendar makes "every unplayed fixture scheduled on or
before this date" the hot query of every Continue, replacing the season-and-played scan the scale
probe measured. No decision in the world-data-model map prices an index for it, and the shipping
fixture index does not serve it — that index leads on the competition, and the sweep names no
competition. So the sweep's cost at world scale is unknown, and whether an index on the scheduled
date, or a composite over the scheduled date and the played flag, is worth its write cost is
undecided.

The map did not reach this. It is recorded here rather than answered because guessing an index is how
a save acquires cost nobody priced, and because the whole point of the index list being two is that
each entry is measured.

**What would settle it:** a measurement against the existing prototype scale-probe harness at
`apps/desktop/src/main/db/prototype-scale-probe/`, extended to the dated fixture shape. Generate a
representative world — the probe's documented ceiling is 16,000 clubs, 400,000 players, and roughly
304,000 league fixtures per season — and record, for the sweep query:

- the unindexed cost and the query plan;
- the cost and plan with an index on the scheduled date alone;
- the cost and plan with a composite over the scheduled date and the played flag;
- each candidate's byte cost and its added generation time, in the probe's own units.

Then decide, and record the decision the way the spec records the other two: the query it serves, its
measured value, and its cost — or a per-table line saying why it is unindexed. If the answer is an
index, adding it is a small follow-up ticket; the shape on disk does not otherwise change.

**Blocked by:** 10 (the sweep query only exists once the advance is date-driven).

**Status:** ready-for-human

**Files:** `apps/desktop/src/main/db/prototype-scale-probe/probe.ts` and its results document;
`apps/desktop/src/main/db/schema.ts` only if the answer is an index.

- [ ] The sweep is measured at the probe's representative world, unindexed and under each candidate
      index, with query plans recorded.
- [ ] A decision is recorded with its measured value and its cost, in the same units as the two
      shipping indexes.
- [ ] If the answer is an index, a follow-up implementation ticket exists for it; if it is not, the
      fixture table's unindexed-by-choice line says so and why.
