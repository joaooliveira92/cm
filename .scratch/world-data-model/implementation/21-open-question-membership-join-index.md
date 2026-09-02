# 21: [Open question] Is there an index for the club-keyed membership join?

**Type:** open question — a decision, not execution. Do not implement an answer from this file; the
answer does not exist yet.

**The question, unanswered:** membership lives on participant rows rather than on a column, which the
competition-graph decision recorded as a risk in its own words — membership through participant rows
costs a join on hot paths, and no measurement backs the claim that this is affordable. The
participant key's competition-and-season prefix serves every competition-keyed read: the standings
freeze, the rollover, and the league table. The club-keyed read — which competition is this club in
this season — has no covering prefix, and no decision measured it.

The map did not reach this. It is recorded here rather than answered because the alternative to
measuring is a column on the club row, and that is exactly the second home for a fact the whole
schema is arranged to avoid.

**What would settle it:** a measurement against the existing prototype scale-probe harness at
`apps/desktop/src/main/db/prototype-scale-probe/`, extended to the participant shape. At the probe's
representative world — 16,000 clubs across roughly 800 competitions, so roughly 16,000 participant
rows per season retained for the life of the save — record:

- how often the club-keyed read actually runs per Continue and per screen, since a cheap query run
  sixteen thousand times is a different problem from an expensive one run once;
- its unindexed cost and query plan after twenty seasons of accumulated rows;
- the cost and plan with an index leading on the club, and that index's byte and generation cost.

Then decide, and record it in the same form as the two shipping indexes. If the honest answer is that
the read is rare enough not to matter, that is a per-table unindexed-by-choice line, which is equally
a result.

**Blocked by:** 07 (the participant rows must exist to be measured).

**Status:** ready-for-human

**Files:** `apps/desktop/src/main/db/prototype-scale-probe/probe.ts` and its results document;
`apps/desktop/src/main/db/schema.ts` only if the answer is an index.

- [ ] The club-keyed membership read's frequency and cost are measured at the probe's representative
      world, at season 1 and after twenty seasons of retained rows.
- [ ] A decision is recorded with its measured value and its cost, or a stated reason the table stays
      unindexed.
- [ ] If the answer is an index, a follow-up implementation ticket exists for it.
