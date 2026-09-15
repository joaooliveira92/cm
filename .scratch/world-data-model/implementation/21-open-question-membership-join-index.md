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

**Files:** `apps/desktop/src/main/db/prototype-scale-probe/membership-join-index-probe.ts` and its results document;
`apps/desktop/src/main/db/schema.ts` only if the answer is an index.

- [x] The club-keyed membership read's frequency and cost are measured at the probe's representative
      world, at season 1 and after twenty seasons of retained rows.
- [ ] A decision is recorded with its measured value and its cost, or a stated reason the table stays
      unindexed.
- [ ] If the answer is an index, a follow-up implementation ticket exists for it.

## Measured, not answered

The measurement the ticket asked for is done — `membership-join-index-probe.ts` and the *club-keyed
membership join* section of
[RESULTS.md](../../../apps/desktop/src/main/db/prototype-scale-probe/RESULTS.md). The decision is
still open, and this file is still `ready-for-human`.

**The frequency question first, because it changes what the cost means.** The club-keyed read is
`clubStrength` in `season.ts`, and `resolveFixtureScore` calls it once per side of any fixture where
either club cannot field eleven — which is every results-only fixture in the world. At 799
results-only competitions playing ten fixtures each, **one Continue makes this call 15,980 times.**
The ticket asked whether this was a cheap query run sixteen thousand times or an expensive one run
once. It is the first, and that turns out to be the worse of the two.

| Candidate | Season | Rows | File | Per call | Per Continue |
|---|---|---|---|---|---|
| Primary key only | 1 | 16,000 | 2.6 MB | 0.359 ms | 5.74 s |
| `+ (club_id)` | 1 | 16,000 | 3.0 MB | 0.0047 ms | 0.08 s |
| `+ (club_id, season_number)` | 1 | 16,000 | 3.0 MB | 0.0048 ms | 0.08 s |
| Primary key only | 20 | 320,000 | 28.5 MB | 8.838 ms | **141.22 s** |
| `+ (club_id)` | 20 | 320,000 | 35.9 MB | 0.0119 ms | 0.19 s |
| `+ (club_id, season_number)` | 20 | 320,000 | 36.5 MB | 0.0054 ms | 0.09 s |

Unindexed, every one of the 15,980 calls scans the whole participant table. The cost is therefore
quadratic in the size of the world and linear again in the age of the save, because nothing prunes
these rows: 5.7 s of blocking work per Continue in a first season, 141 s after twenty. The risk the
competition-graph decision recorded in its own words — that membership through participant rows costs
a join on hot paths, unmeasured — is now measured, and it is the largest cost in the save that a
single index would remove.

Between the two indexes, the composite is what the drift argues for. `(club_id)` alone seeks to the
club and then walks its rows checking the season, and that walk grows by one row per season forever;
`(club_id, season_number)` seeks to the pair, so its cost is flat in the age of the save (0.0048 ms
at season 1, 0.0054 ms at season 20) for 0.6 MB more.

The other read with no competition prefix, `loadHumanCompetitionId`, scans 320,000 rows in 0.03 ms
once per season. No index changes it and none is needed for it — that part is an unindexed-by-choice
line whichever way the main question goes.

What is left is the call itself, and if it is an index, the follow-up implementation ticket for it.
