# 05: The competition graph is persisted as the resolved world

**What to build:** the competitions the player's selection resolved to become rows in the save, with
the promotion and relegation structure and the cup entry structure that connects them. A save now
answers which competitions exist in this world, which nation each belongs to, what kind it is, where
it sits on the ladder, at what Simulation Depth it runs, and how many clubs it holds — and it answers
which division sits above which, with how many places exchanged between them.

Only competitions in the Effective Selection get rows; a competition the selection resolved to
`not_loaded` gets none. Dependency (`requires`) edges are persisted nowhere, because nothing reads
them after generation. The catalogue stays in code; the save records the resolved world.

Promotion and relegation are one symmetric fact with a slot count rather than two rows or two
tables, and that symmetry is what guarantees a division never changes size. Both endpoints of a link
must have rows in this save, which is what closes the world at the edge of the chosen scope: the
lowest loaded division never relegates anyone out of the world and the highest never promotes anyone
out of it.

The slice's edge promise: writing the graph is part of generation's existing transaction and adds no
service to `R`. A resolved selection that would produce a link with a dangling endpoint is a
generation defect, not a typed failure — the resolver has already guaranteed dependency closure by
the time generation runs.

**Decisions:**

- The catalogue stays code and the save records the resolved world: an activated-only `competitions`
  table, symmetric Exchange Links carrying promotion and relegation as one fact, a closed world at
  the edge of the chosen scope, and membership answered from participant rows rather than a column.
  See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-01-competition-graph-and-promotion.md).

**Blocked by:** 02 (nations must exist for a competition to reference one), 03 (the Effective
Selection must be what generation reads).

**Status:** ready-for-agent

**Files:** `apps/desktop/src/main/db/schema.ts` and the regenerated DDL,
`apps/desktop/src/main/worldGeneration.ts`, `packages/shared/src/leagueSetup.ts`,
`apps/desktop/test/db-schema.test.ts`, `apps/desktop/test/create-generation.test.ts`.

- [ ] `competitions` exists with the catalogue's own canonical id in the `comp_eng_1` form, a nation
      reference, a kind, a tier, a depth, and a club count. `CHECK kind IN (...)` covers the
      catalogue's own competition-kind vocabulary and `CHECK depth IN ('full','standard','results-only')`.
      Tier is NULL for a kind that does not sit on the ladder, and club count is NULL for a
      competition whose field is a function of its sources.
- [ ] `competition_links` exists with a higher competition, a lower competition, and a slot count
      constrained by `CHECK slots >= 1`. A test asserts every link in a generated world names two
      competitions that both have rows in that save.
- [ ] `competition_entrants` exists as its own table with a cup competition and a source
      competition, and carries no slot count.
- [ ] No table stores a dependency edge, and a test asserts it.
- [ ] Generation writes exactly the Effective Selection's competitions and no others, and a test
      asserts a competition resolved to `not_loaded` has no row.
- [ ] Nothing derives which competition sits above another by comparing tier numbers; the links
      table is the only answer, and a test covers a pyramid with parallel regional divisions feeding
      one division above them.
- [ ] `pnpm check:all` is green at this commit.
