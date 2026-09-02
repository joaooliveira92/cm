# Map: MVP world data model

Label: wayfinder:map

## Destination

A **schema spec** for the MVP world: the complete set of persisted entities, what each one is
authoritative for, and the invariants that hold it together — written so `cm-to-tickets` can slice it
into implementation tickets. The map ends when nothing about the shape of a save's data is still
undecided. It does **not** end with the Drizzle migration; writing that is implementation.

## Notes

Domain: a Championship Manager clone, event-sourced, one SQLite file per Save. Read
[CONTEXT.md](../../CONTEXT.md) before any ticket — Competition, Simulation Depth, Simulation Mode,
Content Pack, Nation Profile, and League Selection Snapshot are already defined there and must not be
redefined. Current schema: [schema.ts](../../apps/desktop/src/main/db/schema.ts).

Every session consults `domain-modeling`; sessions touching Effect code consult `effect-code`.

Standing preferences for this effort:

- **Overturning a recorded decision means reconciling the doc in the same change.** Several tickets
  here contradict statements currently in `CONTEXT.md` (no promotion/relegation, Matchday as the
  Calendar's unit). The ticket that overturns one also fixes the glossary.
- **A canonical id is never a display name.** `contentPack.ts` already declares this rule; the code
  does not yet obey it. No ticket may add a table that stores a display name as an identifier.
- **Plan, don't do.** Tickets produce decisions and the spec. The migration, the generator rewrite,
  and the query-layer changes are handed off.
- **Row count is a first-class constraint, now with measured units.** Ticket 04 priced it: ~450 bytes
  and ~55 microseconds of generation per player, ~2.4 KB per club, scaling linearly to 400k players
  (~335 MB, ~22 s). Any ticket proposing a per-player table still states its row cost, but states it
  in these units — and argues from generation time and read-path cost, because **bytes are not the
  binding constraint**.

### Settled while charting

Ten scoping decisions taken by direct interview before the map existed. They fix the destination and
are not re-openable by a ticket without redrawing it:

1. The destination is a spec, not the migration.
2. MVP is the world the League Selection Snapshot already promises — multiple nations, pyramids,
   dependency-closed competitions at three Simulation Depths — not today's single fixed 20-club league.
3. Staff bind narrowly to two systems that already want them: the Scout resource and Player
   Development. Everything else about a staff member is presence.
4. Cities are real, factual, and persisted per Nation. Stadium names and capacities are generated.
5. Promotion and relegation ship. This overturns `CONTEXT.md`'s current statement that they don't exist.
6. The Calendar becomes date-bearing. Matchday demotes to "round number within one competition", and
   Transfer Windows become date ranges.
7. Domestic cups ship as real knockout competitions with bracket progression.
8. `standard` depth carries full generated squads; `results-only` carries a club strength scalar and
   no player rows. There is no third, reduced player representation. *(Refined by ticket 07: the scalar
   is Results Strength, and it is derived on read rather than stored, so "carries" means the club is
   described by one number, not that a column holds it.)*
9. Nations, Cities, Competitions, and Clubs all become rows carrying canonical ids, with display names
   resolved from a content pack at read time.
10. Scouting ships in MVP.

## Decisions so far

<!-- one line per resolved ticket -->

- [02 - The competition graph: tiers, dependency edges, and promotion/relegation](issues/02-competition-graph-and-promotion.md):
  the catalogue stays code and only the resolved world is persisted — an activated-only `competitions`
  table, symmetric Exchange Links for promotion and relegation, a closed world at the edge of the chosen
  scope, and membership read from participant rows rather than a column on `clubs`.

- [03 - The world catalogue: nations, cities, stadiums, and canonical-id enforcement](issues/03-world-catalogue-and-canonical-ids.md):
  nations are unconditional thin referent rows with the Nation Profile left in code, cities are curated
  real geography resolved per activated nation, no stadium table, and the canonical-id rule lands
  everywhere at once — `clubs.name` deleted, competition names moved into the content pack, and one
  underscore id convention across the catalogue.

- [04 - How large a multi-nation save actually gets](issues/04-sqlite-scale-probe.md): measured, not
  estimated — a 400k-player world is ~335 MB and ~22 s, linear, so full `standard` squads are a
  non-issue on disk; the save has **zero indexes** and one on `players(club_id)` takes the squad view
  from 127 ms to 0.9 ms; the real cliff is quadratic JS in `loadAllPlayersEcon`, not storage; and
  event-sourcing background matches would cost 6x the rest of the save combined.

- [05 - The staff entity and its two bindings](issues/05-staff-entity-and-bindings.md): two roles only,
  Coach and Scout, and rows exist **only for the human's club** — so staff cost world generation nothing;
  scout quality drives the accrual rate while Stature Tier keeps owning headcount, the coach scales the
  passive development baseline that Technical Coaching is forbidden to touch, one static 1-20 quality
  column each, and no wages or hiring market, so `Contract` and `Wage Budget` are untouched.

- [07 - What each Simulation Depth actually stores](issues/07-simulation-depth-persistence.md):
  `results-only` ships, justified **solely** on recurring per-matchday simulation cost — one match
  simulation is ~1.0 ms measured, so a 16,000-club world costs ~8 s of blocking JS per Continue;
  `full` and `standard` are byte-identical on disk, so Depth collapses to has-a-squad or not; and
  Results Strength is one 1-100 number **derived on read** from seed, Stature Tier, and season,
  calibrated against measured squads, with a collapse function serving mixed cup ties.

- [08 - Player provenance: nationality, birthplace, and identity across a multi-nation world](issues/08-player-provenance-and-nationality.md):
  one nationality column with a stated reintroduction condition (work permits or national teams), a
  nullable `birth_city_id` whose NULL means "born outside the loaded world", nation-keyed name pools in
  code as **factual** data beside `nations.ts` — today's pool is 20x20 = 400 combinations and must grow
  to ~20k per nation — player names stored directly because a content pack ships before the players it
  would have to name, and **no** career-history table, since the transfer events already hold it.

## Not yet specified

- **AI club behaviour in background competitions.** Who signs, sells, and sets tactics for a club
  nobody manages. Ticket 07 settled that a `standard` club stores exactly what a `full` club stores, so
  the shape is no longer the blocker: what remains is a behaviour question about who acts on those rows,
  and at what per-matchday cost on top of the ~1.0 ms match.
- **The cross-nation transfer market.** Whether a `standard`-depth club in another nation can bid for
  the human's players, and what `MIGRATION_LINKS` means once nations are rows rather than constants.
- **Club finances beyond the budget pair.** Gate revenue, facilities, ownership — the reference
  material models all of these; nothing in this project reads them yet.
- **Save format migration.** Whether existing saves survive this reshaping or are declared
  incompatible. Cheap to answer once the final table set is known, meaningless before.
- **Continental competitions and national teams.** `CONTEXT.md` mentions cross-border tournaments in
  the Competition definition; whether any ship in MVP is a scope call that depends on how much the
  cup work costs.
- **Youth and reserve squads.** Named in the reference material, absent from every shipped system.
  Player career history left this list via ticket 08: it is a projection over existing transfer events,
  and whether it is materialised is now a question on ticket 11.
- **Promotion playoffs.** Deferred rather than ruled out by ticket 02. A playoff is a knockout bracket
  seeded from league positions — ticket 06's cup machinery pointed at a league, plus a calendar window
  ticket 01 has not settled. Plausibly cheap once brackets exist; unspecifiable before.

## Out of scope

- **Stadium as a mechanic.** Capacity feeds display only in MVP; wiring it to Home Advantage or gate
  revenue is a separate effort. (Settled while charting, Q4.)
- **Licensed content packs.** The base fictional pack is the only one MVP ships; sourcing or loading
  licensed names is a commercial question, not a schema one.
- **Realistic staff name generation.** Explicitly waived by the user at charting time.
- **Board Objective's reaction to promotion and relegation.** Whether relegation is automatically a
  missed objective, and whether a promoted club's band is recomputed against its new division. Surfaced
  by ticket 02 and ruled out there: it needs no new table, so it is a board rule rather than a shape on
  disk, and belongs to whoever next opens the board-objectives note.
- **The read-path defects ticket 04 measured.** The N+1 club loop in `aiClubs.ts`, the
  O(players x positions) filter in `loadAllPlayersEcon`, and `computeStandings` tallying every fixture
  in the world to render one league. All three are real and all three get far worse at world scale,
  but they are query-layer bugs rather than shapes on disk, and the query layer is already handed off.
  The **index list is not** out of scope: indexes are part of a schema, and ticket 12 carries them.

- **A staff hiring market.** Ticket 05 fixed staff at generation: no wages, no candidate pool, no
  hiring or firing. Making staff a lever the manager pulls means reopening `Contract` and `Wage
  Budget`, which is a gameplay effort rather than a shape on disk.

- **The Drizzle migration itself**, the generator rewrite, and the query-layer changes. They are the
  work this spec is handed off to, not steps on the route to it.
