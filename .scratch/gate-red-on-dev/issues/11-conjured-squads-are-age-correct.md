# 11: A squad conjured for a promoted club is born for the Season it joins

Found while building [10](10-promoted-squads-sign-contracts.md), 2026-09-22, orchestrator.

**What to fix:** `reconcileSquadsWithDepth` (`apps/desktop/src/main/season/rollover.ts`) generates a promoted
club's squad with `generateSquadAtStrength(..., referenceYear)`, the Season 1 year, instead of the year the
club joins (`seasonStartYear(referenceYear, nextSeason)`). A club promoted in Season N gets birth dates drawn
as if it were Season 1, so its squad is about N − 1 years older than intended, against the claim in
[the simulation-depth note](../../../.agents/notes/proposed/architecture/2026-09-01-simulation-depth-persistence.md)
that a conjured squad is always age-correct. Wages (10) are already priced at the true age. Pass the joining
Season's year. This moves promoted squads' birth dates and possibly attributes in seeded worlds; say which.

**Blocked by:** None

**Status:** resolved

- [x] A squad conjured in Season N has the same age spread, on its opening date, as a Season 1 squad on its own
- [x] Seeded tests that move are re-pinned with the cause stated; `pnpm check:all` green

## Answer

Resolved 2026-09-22. `reconcileSquadsWithDepth` passes the joining Season's start year to the conjured squad's
generation. That year feeds only `birthDateForAge`: ages and attributes come from each player's random draw,
so only birth dates move, forward by N − 1 years; world generation is untouched. The seed-5150 promotion test
now checks that a squad conjured in Season 2 spans the same ages on its opening date as Season 1's did on its
own ([16, 34] both; [17, 35] before the fix). No seeded test moved. The Youth Intake was already right, and
the simulation-depth note's "always age-correct" is now true. Reviewed inline by the orchestrator.
Report: [gate-red-on-dev-ticket-11](../../../.ai/reports/gate-red-on-dev-ticket-11.md).
