# 15: Staff — a named coach and named scouts at the human's club

**What to build:** the manager has a backroom. Their club has one named coach who lifts the whole
squad's development, so the backroom is a reason to take a bigger job, and one named scout per
assignment slot, so directing scouting is directing a person rather than spending an abstract slot.
The number of scouts comes from the club's Stature Tier, which already owns headcount.

Staff exist only for a club that is or has been human-managed, at any Simulation Depth, and they cost
world generation nothing: the rows are materialised when a club becomes human-managed, and they are a
deterministic function of the world seed and the club's canonical id, so taking the same club twice
in one career yields identical rows. Taking a new job leaves the old club's staff behind — the rows
are deleted when the manager leaves.

Quality is one static 1-20 number per person, and that is all a staff member is besides a name and a
role. There are no wages, no candidate pool, and no hiring or firing, so contracts and the wage
budget are untouched. A staff hiring market is out of scope; making staff a lever the manager pulls
would reopen both.

The coach's binding is to the passive development baseline only: the coach scales it, and the
modifier is at least 1.0 across the whole quality domain, so a poor coach is never worse than no
coach. Technical Coaching's own binding is untouched.

The slice's edge promise: materialising staff happens inside the career-commit transaction, so a
committed career always has its backroom. A club with no staff rows is a club nobody has managed,
which is an ordinary empty result rather than a failure.

**Decisions:**

- Two roles, Coach and Scout, on the human's club only: scout quality drives accrual rate, the coach
  scales the passive development baseline, one static 1-20 quality column each, no wages and no
  hiring market. See
  [Agent Note](../../../.agents/notes/proposed/feature/2026-09-01-staff-entity-and-bindings.md).

**Blocked by:** None (can start immediately).

**Status:** resolved

**Files:** `apps/desktop/src/main/db/schema.ts` and the regenerated DDL,
`apps/desktop/src/main/saves.ts` (`commitCareer`), `apps/desktop/src/main/managerStatus.ts` (leaving
a club), `apps/desktop/src/main/development.ts`, `packages/contracts/src/schemas.ts`,
`apps/desktop/test/development.test.ts`, `apps/desktop/test/retireManager.test.ts`,
`apps/desktop/test/db-schema.test.ts`.

- [x] `staff` exists with a surrogate id, a club reference, a role, a quality, and a directly stored
      name, with `CHECK role IN ('coach','scout')` and `CHECK quality BETWEEN 1 AND 20`.
- [x] Committing a career writes exactly one coach row and exactly N scout rows for the chosen club,
      N from the Stature Tier table; world generation writes no staff row at all, and a test asserts
      a provisional world has none.
- [x] Staff rows are a deterministic function of the world seed and the club's canonical id, and a
      test asserts taking the same club at two points in one career produces identical rows.
- [x] The coach's modifier on the passive development baseline is at least 1.0 across the whole 1-20
      domain, and a test asserts it over the full domain.
- [x] Leaving a club deletes that club's staff rows.
- [x] Nothing in the schema or the code gives a staff member a wage, a contract, or a hiring path,
      and no code path branches on Simulation Depth to decide whether staff exist.
- [x] `pnpm check:all` is green at this commit.

## Comments

**The ticket and its Agent Note disagree about what happens when a manager leaves, and the ticket
wins.** The note says staff rows are "retained rather than deleted — harmless, and the derivation
then never runs twice for one club". The ticket says twice that leaving deletes them, and the spec
agrees ("a manager leaving a club deletes that club's staff, assignments, and progress"), because
the scouting-persistence decision that came later needs assignments and progress to go with them.
Deletion is safe for the identical-rows criterion precisely because the rows are derived: re-taking a
club re-derives the same people *and the same ids*, which `staff.test.ts` asserts by deleting and
re-materialising. The note is not promoted here, so its text still says "retained"; whoever promotes
it after ticket 16 should reconcile that sentence.

**A coach on the baseline can push the focused fraction above 1, and that was a live bug.** The
development step read `current + (ceiling - current) * fraction` with no clamp, which is safe only
while `fraction < 1` — true for the whole life of that function (0.65, or 0.975 focused). A good
coach makes the focused fraction ~1.35, so the step overshoots the ceiling and can leave the 1-20
attribute range entirely, which surfaced as an intermittent `CHECK` violation in
`development.test.ts` on the world seeds that produced a strong enough coach. `developPlayer` now
clamps at the ceiling in both directions, which makes its documented "self-clamps at the ceiling"
promise true for any fraction rather than only for the ones it happened to be called with.

**Scout headcount and the quality bands are new numbers.** The note refers to "the existing tier-count
table" for scout headcount, but no such table existed — scouting has never shipped. `SCOUT_HEADCOUNT`
(4/3/2) and the per-tier quality bands are invented here and uncalibrated. The tests assert the
*relationships* — a bigger club has more scouts, every quality is legal, the coach modifier never
drops below 1 — rather than the numbers, so retuning is free.

**The Agent Note stays `proposed/`.** Only one of its two bindings is built: the coach scales the
passive baseline, but a scout's quality does not yet drive anything, because `scouting_assignments`
and `scouting_progress` are ticket 16. Its criteria about accrual being strictly positive and
assignment naming a specific scout are unmet by construction.
