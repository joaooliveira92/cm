# 02: Consequences — entity count, processing cost, and recommendations

**What to build:** the consequence layer the sidebar and grid cells later read. A player's configuration computes, at the active-league and depth grain:

- **Estimated entity count** — derived from active leagues and their depth, never a hardcoded total, so the number moves with every edit.
- **Processing-cost classification** — a meter value plus a human-readable label and an expensive-setup warning, phrased as "this configuration is expected to produce longer processing intervals" and never claiming hardware benchmarking no code performs.
- **Recommendation reason per league** — resolved from data the simulation actually reads: Nation Profile recruitment links, dependency relationships, scope and tier structure, and preset membership; never a club-grounded reason (the club is chosen on a later step). Every reason carries icon and visible text — icon alone is banned — and copy stays under the specification's Mechanical Provenance rule.

The slice's edge promise: pure, no I/O — the entity count, the processing-cost reading, and the recommendation reasons come out of the same authoritative input the projection in ticket 01 reads, so they cannot disagree with the rows. Failures are checked values, not throws: an unknown league or an empty scope yields a neutral recommendation and a validation-shaped result, never a defect. Callers observe the derived figures and their human-readable labels below.

**Blocked by:** 01 — Simulation Depth and the active-leagues projection (the count, meter, and recommendation all classify per active league, so the projection row model and depth must exist first).

**Status:** ready-for-agent

- [ ] Entity count derives from active leagues and their depth, with no separately stored or hardcoded total.
- [ ] Processing cost computes a meter value, a human-readable category, and a warning only when the setup is unusually expensive; the copy says processing intervals get longer and makes no hardware-capability claim.
- [ ] A recommendation reason resolves per league from authoritative game data — Nation Profile recruitment links, dependencies, scope/tier structure, preset membership — and never a club-grounded reading; each reason has icon and visible text.
- [ ] Pure unit tests cover entity-count estimation, processing-cost classification, the expensive warning, and recommendation resolution from deterministic fixtures.
- [ ] `pnpm check:all` is green at this commit.