# 02: Nations and cities become unconditional rows

**What to build:** every save carries the whole world catalogue's geography, whatever the player
selected. A `nations` row exists for every nation the code knows about, and a `cities` row exists for
every curated city of every one of those nations, in every save, whatever the selection scope and
whatever Simulation Depth its competitions run at. Nothing reads these rows yet; this ticket makes
them exist and proves they are selection-independent, which is what later tickets attach a club's
hometown and a player's birthplace to.

The rows are copied unconditionally rather than filtered to the activated nations because something
outside the loaded world points at them: a player's nationality and birthplace are drawn from the
whole catalogue. The measured price of that choice is ~480 rows and ~24 KB for the shipped eight
nations — less than sixty players.

The city catalogue itself is code, a new factual, nation-keyed data module beside the existing
nation profiles, in the same spirit: the names are real geography, so they are carried directly and
never resolved through a content pack. This ticket ships the module and a curated set for every
nation in the code's nation list; growing that set toward the ~60-per-nation target the spec budgets
for is content work that needs no further schema change.

The slice's edge promise: writing the catalogue is part of world generation's single transaction and
adds no service to `R`. A nation with no curated cities is a defect in the shipped data rather than a
runtime failure, so it is caught by a test over the module, not by an error channel.

**Decisions:**

- Nations are unconditional referent rows and thin, cities are curated real geography resolved per
  activated nation, no stadium table, and the canonical-id rule lands everywhere at once —
  `clubs.name` deleted, competition names moved to the pack, one underscore id convention. See
  [Agent Note](../../../.agents/notes/implemented/architecture/2026-09-01-world-catalogue-and-canonical-ids.md).
  The city-scoping half of that gist is superseded by the geography decision below; the
  `clubs.name` and competition-name halves land in tickets 04 and 06 respectively.
- Simulation Depth never conditions the world catalogue or the club row — a `results-only` nation
  keeps its cities, and `cities` widens further to unconditional across the catalogue, matching
  `nations`. See
  [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-02-results-only-geography-cost.md).

**Blocked by:** None (can start immediately).

**Status:** done

**Files:** `apps/desktop/src/main/db/schema.ts`, the regenerated
`apps/desktop/src/main/db/migrations.generated.ts` and `apps/desktop/drizzle/`, a new city catalogue
module in `packages/shared/src` beside `nations.ts`, `packages/shared/src/index.ts`,
`apps/desktop/src/main/worldGeneration.ts`, `apps/desktop/test/db-schema.test.ts`,
`apps/desktop/test/world-determinism.test.ts`.

- [x] `nations` exists with a canonical id column in the `nation_eng` form and nothing else. No
      column stores whether a nation is activated, mirrors a factual nation attribute, or holds a
      Nation Profile prior, and there is no `generation_seed` column.
- [x] `cities` exists with a canonical id in the `city_eng_london` form, a nation reference, a name,
      and a population band constrained by `CHECK population_band IN ('major','large','mid','small')`.
      There are no coordinates, no population figure, and no `generation_seed`.
- [x] The city catalogue module carries at least one curated city for every nation in the code's
      nation list, and a test asserts that; its names are plain data and no code path resolves a
      city name through the content pack.
- [x] World generation writes every nation and every city before it writes any club, inside the
      existing generation transaction, and a test asserts the row counts are identical across two
      saves generated under two different selections from the same world seed.
- [x] The generated DDL is regenerated rather than hand-edited, and `pnpm verify-db-schema` passes.
- [x] `pnpm check:all` is green at this commit.

## Comments

**Selection-framing on AC4 (shipped as-is, reviewer APPROVE):** the criterion says "two different
selections", but selection does not reach generation yet — `beginCareer` takes only
`{ worldSeed, referenceYear }`, and ticket 03 threads the selection snapshot into generation. The
test instead pins the property with the save-varying inputs that exist: catalogue rows are identical
across two reference years from one world seed and a third save from a different world seed
(`deepStrictEqual` over the rows). That is precisely the selection-independence the criterion exists
to prove. Ticket 03 must extend `world-determinism.test.ts` to real selection variance when it reworks
`beginCareer`, because at that point a regression where the catalogue became selection-dependent
would otherwise go uncaught.
