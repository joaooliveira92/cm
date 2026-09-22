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

**Status:** ready-for-agent

- [ ] A squad conjured in Season N has the same age spread, on its opening date, as a Season 1 squad on its own
- [ ] Seeded tests that move are re-pinned with the cause stated; `pnpm check:all` green
