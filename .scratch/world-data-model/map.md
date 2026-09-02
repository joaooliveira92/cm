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
   no player rows. There is no third, reduced player representation.
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

## Not yet specified

- **AI club behaviour in background competitions.** Who signs, sells, and sets tactics for a club
  nobody manages, and whether that differs by Simulation Depth. Blocked on knowing what a `standard`
  club actually stores.
- **The cross-nation transfer market.** Whether a `standard`-depth club in another nation can bid for
  the human's players, and what `MIGRATION_LINKS` means once nations are rows rather than constants.
- **Club finances beyond the budget pair.** Gate revenue, facilities, ownership — the reference
  material models all of these; nothing in this project reads them yet.
- **Save format migration.** Whether existing saves survive this reshaping or are declared
  incompatible. Cheap to answer once the final table set is known, meaningless before.
- **Continental competitions and national teams.** `CONTEXT.md` mentions cross-border tournaments in
  the Competition definition; whether any ship in MVP is a scope call that depends on how much the
  cup work costs.
- **Youth, reserve squads, and player career history.** Named in the reference material, absent from
  every shipped system.
- **How much of a `results-only` nation's geography is worth writing.** Ticket 03 writes city rows for
  every activated nation regardless of Simulation Depth. Whether a nation nobody can see the inside of
  needs sixty cities is a cost question ticket 07 is better placed to answer than 03 was.
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

- **The Drizzle migration itself**, the generator rewrite, and the query-layer changes. They are the
  work this spec is handed off to, not steps on the route to it.
