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

**Status:** resolved

**Files:** `apps/desktop/src/main/db/schema.ts` and the regenerated DDL,
`apps/desktop/src/main/worldGeneration.ts`, `packages/shared/src/leagueSetup.ts`,
`apps/desktop/test/db-schema.test.ts`, `apps/desktop/test/create-generation.test.ts`.

- [x] `competitions` exists with the catalogue's own canonical id in the `comp_eng_1` form, a nation
      reference, a kind, a tier, a depth, and a club count. `CHECK kind IN (...)` covers the
      catalogue's own competition-kind vocabulary and `CHECK depth IN ('full','standard','results-only')`.
      Tier is NULL for a kind that does not sit on the ladder, and club count is NULL for a
      competition whose field is a function of its sources.
- [x] `competition_links` exists with a higher competition, a lower competition, and a slot count
      constrained by `CHECK slots >= 1`. A test asserts every link in a generated world names two
      competitions that both have rows in that save.
- [x] `competition_entrants` exists as its own table with a cup competition and a source
      competition, and carries no slot count.
- [x] No table stores a dependency edge, and a test asserts it.
- [x] Generation writes exactly the Effective Selection's competitions and no others, and a test
      asserts a competition resolved to `not_loaded` has no row.
- [x] Nothing derives which competition sits above another by comparing tier numbers; the links
      table is the only answer, and a test covers a pyramid with parallel regional divisions feeding
      one division above them.
- [x] `pnpm check:all` is green at this commit.

## Comments

**The promotion structure did not exist to be persisted, so it had to be authored.** The catalogue
carried only `requires` — dependency edges pointing *upward*, which this ticket explicitly does not
persist — and nothing anywhere said which division sits above which or how many clubs exchange
between them. `EXCHANGE_LINKS` and `CUP_ENTRANTS` are new, in `leagueSetup.ts` beside the index they
describe. They are top-level exports rather than fields on `CompetitionNode`/`NationNode` on purpose:
the renderer rebuilds a domain `LeagueSetupIndex` from the wire read model, so a required field on
those types would force the promotion graph onto a wire contract no setup screen reads. The cost of
that choice is that a division could be added to the index with no link, so
`resolvedWorld.test.ts` asserts every endpoint names a competition the index carries and every
league below the top of its pyramid has a link upward.

**`competitions.nation_id` is nullable, which the Agent Note did not anticipate.** The note says the
nation reference "points at ticket 03's nations table", but the catalogue models confederation
tournaments as Nation-shaped branches — `nation_uefa`, `nation_conmebol` — and those are not members
of `NATION_CODES`, so they have no `nations` row to point at. The branches do carry a member nation's
`code`, and using it would have kept the column `NOT NULL`, at the price of making the European
Champions Tournament a competition of England and "every competition in England" quietly wrong.
`NULL` says "no single nation owns this", which is true. `tier` was already nullable for the same
class of reason, so the table's vocabulary already had a way to say "this does not apply".

**`resolveWorld` is where the Effective Selection becomes rows**, in a new
`packages/shared/src/resolvedWorld.ts`. It reads depth from `projectActiveLeagues` rather than from
the raw selection, so there is one answer to how deeply a competition is simulated — including the
rule that a dependency is capped at `standard`. Generation receives the resolved world as data and
writes exactly it; `worldGeneration.ts` makes no selection decisions of its own, which is what keeps
the "writes exactly the Effective Selection and no others" criterion observable rather than
inferred.

**Observation, not fixed here:** `projectActiveLeagues` reports `full` depth for a competition listed
in a scope option's `backgroundCompetitionIds` when its nation's mode is `playable` — England's
reserve league under `scope_eng_pyramid` resolves to `full` rather than `standard`, because the
projection derives depth from the nation's mode for anything that is not a dependency. That predates
this ticket, belongs to the active-leagues projection rather than to the competition graph, and
changing it would move what the setup screen renders. Worth a ticket of its own; persisting the
wrong depth would otherwise become invisible now that it lands on disk.

**The Agent Note stays in `proposed/`** — a partial implementation, which is the documented skip
case. Three of its acceptance criteria are not built: participant count equalling `club_count` and
no column storing a club's current competition (ticket 07), and final positions frozen at the
rollover (ticket 13). Both tickets carry the same note, and promotion belongs to 13 as the last of
them.
