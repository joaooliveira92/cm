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

- [01 - The Calendar's unit, and what Transfer Windows are defined against](issues/01-calendar-unit-and-transfer-windows.md):
  the Calendar becomes **date-bearing** — a fixture carries an ISO `scheduled_date` plus a
  competition-local `round`, one August-to-May shape serves every nation (per-nation cycles wait on
  cross-nation transfers, because that is what makes the offset observable), advancing to date D
  resolves every fixture in the world dated on or before D but stops only at **playable** competitions,
  `season` stays a singleton with `current_date` replacing `current_matchday`, and a Season concludes at
  its last dated fixture, cup final included. **Matchday** is redefined as *a date on which fixtures are
  played* and **Round** takes the competition-local number; Transfer Windows become date ranges but
  legality still reads `season.phase`, so the five `isWindowOpen` call sites are untouched. Dates come
  from a code-held slot template, weekends before midweeks, cups reserving first, failing loudly rather
  than double-booking; a club never plays twice on one date, enforced by the generator and a test rather
  than by a half-covering index.

- [02 - The competition graph: tiers, dependency edges, and promotion/relegation](issues/02-competition-graph-and-promotion.md):
  the catalogue stays code and only the resolved world is persisted — an activated-only `competitions`
  table, symmetric Exchange Links for promotion and relegation, a closed world at the edge of the chosen
  scope, and membership read from participant rows rather than a column on `clubs`.

- [03 - The world catalogue: nations, cities, stadiums, and canonical-id enforcement](issues/03-world-catalogue-and-canonical-ids.md):
  nations are unconditional thin referent rows with the Nation Profile left in code, cities are curated
  real geography resolved per activated nation *(widened to unconditional by ticket 13)*, no stadium table, and the canonical-id rule lands
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

- [06 - Season and fixture generalization, including cup rounds](issues/06-season-and-fixture-generalization.md):
  one `competition_participants` table keyed `(competition_id, season_number, club_id)` answers ticket
  02's membership and freezes final positions onto itself — **no `competition_seasons` header table**,
  because every column it would hold derives from its own children. One `fixtures` table serves leagues
  and cups, gaining nullable penalty scores and an integer id; cup rows materialise only once both
  participants are known, their dates still a pure function of round. A drawn tie goes **straight to a
  shootout** — no extra time, no replays, no second legs — because the engine's two halves are
  structural and its fatigue model is calibrated on 90 minutes. Draw and match seeds both hash canonical
  ids, so the bracket reproduces as a chain rather than being stored; non-power-of-two fields take byes
  rather than a preliminary round; `results-only` competitions get full fixture lists, since Depth
  decides how a fixture resolves and never whether it exists; and past-Season fixtures survive only for
  competitions the human's club played in, which destroys background history irreversibly.

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

- [09 - Scouting: assignments, progress, and information policy at world scale](issues/09-scouting-persistence.md):
  two tables — `scouting_assignments` keyed on the **scout**, so the N-slot cap is structural rather than
  checked, and a **sparse** `scouting_progress` where absence means Unscouted; the scoutable set is
  exactly the players who have rows, so a `results-only` nation hides a **transfer market** as well as a
  simulation; a player deleted by relegation takes their scouting with them; Progress stays stored but on
  a new justification, since a date-bearing Calendar voids the old one; and neither club-scouting nor a
  Tactical Acumen binding ships.

- [10 - Generation reads the League Selection Snapshot](issues/10-generation-reads-the-snapshot.md):
  `beginCareer` takes a `SnapshotId` and **re-resolves** its intents against the live catalogue rather
  than trusting the recorded selection; every seed and canonical id keys on canonical ids alone, buying
  a superset property — a broader selection reproduces the narrower world byte-identically plus extra;
  club ids are minted as competition-plus-ordinal; and club strength becomes a function of competition
  tier and nation prior, with Stature Tier demoted to a spread within its own competition.

- [11 - Event streams and read models at world scale](issues/11-event-streams-and-read-models.md):
  only the Match Decider ever folds a stream — `loadStreamEvents` is called from two places, both in
  `match.ts`, and the Club Decider's invariants are enforced against tables — so the governing rule
  becomes **an event is appended only where it is the sole record of a fact**. Club streams shrink to
  the human's club alone, which removes a measured ~204 MB per Season of `PlayerDeveloped` payloads
  (~510 bytes per player, more than the player row it describes); `MatchdayResolved` stops carrying
  every result, dropping a ~1.2 MB single row per Continue; background matches stay un-event-sourced,
  priced at the 2,035 MB per Season it avoids; and every event gains a `game_date`. **None of the five
  named read models becomes a table** — `league_table`'s measured 302 ms is a missing `competition_id`
  predicate rather than a missing projection, and materialising it would duplicate ticket 06's frozen
  participant standings — so a read model is redefined as a query shape over authoritative tables, with
  the materialisation condition stated. One new table ships: `player_transfers`, authoritative rather
  than projected, because the transfer events it replaces are being removed for exactly the clubs whose
  history is hardest to reconstruct. Pruning reuses ticket 06's participation rule verbatim; no
  partitioning and no snapshotting, since the only fold in the system is one 90-minute match.

- [12 - Assemble the MVP world schema spec](issues/12-assemble-the-schema-spec.md): the destination,
  written — [spec.md](spec.md) carries the complete table set for an MVP save at **28 tables**: today's
  eighteen, seven of them changed and none removed, plus ten new ones. Each table states what it is
  authoritative for, its columns, and the invariants and `CHECK` constraints that hold it, under four
  governing rules — one home per fact; the catalogue lives in code while the save records the resolved
  world, split on whether anything outside the loaded world points at a row (`nations` and `cities`
  unconditional, `competitions` and `clubs` activated-only); Simulation Depth conditions only the five
  tables beneath a club; and a canonical id is never a display name. The **index list is two** —
  `players(club_id)` and `fixtures(competition_id, season_number, played)` — with every other table
  unindexed as a stated choice: ticket 04's third measured index is dropped because `contracts.player_id`
  is already that table's primary key, and tickets 09's and 11's no-index-needed claims are verified
  rather than rediscovered. Row costs are stated in ticket 04's measured units, the delta from today's
  schema is enumerated for `cm-to-tickets`, and every `CONTEXT.md` entry this effort touched is confirmed
  reconciled when its own ticket landed. Four gaps no decision covered are recorded as **open questions**
  rather than answered: an index for the calendar's date sweep, an index for the club-keyed membership
  join, `player_transfers`' primary key and player-keyed index, and whether the paired-penalty invariant
  is a `CHECK`.

- [13 - How much geography a results-only nation is worth](issues/13-results-only-geography-cost.md):
  **Simulation Depth conditions what hangs beneath a club, never the world catalogue and never the club
  row itself** — so a `results-only` nation keeps its cities; the trim was never economic (~24 KB and
  ~480 rows for the entire catalogue, with curation paid once in code rather than per save) and would
  have bought the first Depth-dependent column on `clubs` plus a geography backfill on promotion; and
  `cities` widens past the ticket's own question to **unconditional**, matching `nations`, because an
  activated-only city set made `players.birth_city_id` depend on the selection scope, which ticket 10's
  determinism invariant forbids. Ticket 03's activated-only rule and ticket 08's "NULL birthplaces may
  be common" risk are reconciled in the same change.

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
  Player career history has left this list entirely: ticket 08 removed it from the fog and ticket 11
  settled it as a query over `players` and a new authoritative `player_transfers` table, not as a
  materialised projection.
- **Promotion playoffs.** Deferred rather than ruled out by ticket 02. A playoff is a knockout bracket
  seeded from league positions. Both prerequisites now exist — ticket 01's slot list has dates after the
  last league round, and ticket 06 supplied the bracket, byes, and shootout. What remains is a scoping
  call rather than a fog patch: a playoff is a cup competition whose entrants are decided by final
  positions rather than by `competition_entrants`, which is a new entrant rule, not a new shape.

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

- **Scouting a Club rather than a Player.** `CONTEXT.md` allowed it as an assignment target; ticket 09
  cut it and fixed the glossary. No hidden club-level value exists for fog to narrow, so it would
  accrue progress against nothing readable. Returns only if such a value ships.

- **Tactical Acumen's scouting binding.** Deferred to "the Scouting effort" by `CONTEXT.md`; scouting
  now ships and the binding still does not. Both of scouting's numeric terms are spoken for or
  off-limits, so a binding needs a report-interpretation term that does not exist. Ruled out by ticket
  09 with the condition recorded in the glossary.

- **Telling the manager a scouted player has vanished.** Ticket 09 deletes assignments when relegation
  deletes their target, silently reopening the scout's slot. Surfacing that is an inbox message, not a
  shape on disk.

- **Adding a nation to a career already in progress.** Ticket 10's superset determinism property makes
  this coherent — the existing world regenerates byte-identically and the new nation is additive — but
  buying the property is not shipping the feature. It needs a re-resolution path against a save rather
  than a snapshot, and it is beyond a schema spec for the MVP world.

- **Calibrating the club-strength curve, and naming 382 clubs.** Ticket 10 fixed the *shape* of club
  strength (competition tier and nation prior, with Stature Tier as a within-competition spread) and the
  *key space* for club ids (competition plus ordinal). Choosing the tuning constants, and writing the
  base pack's names for every id the catalogue's `clubCount` values imply, are generation-content work
  rather than shapes on disk.

- **The Drizzle migration itself**, the generator rewrite, and the query-layer changes. They are the
  work this spec is handed off to, not steps on the route to it.

- **The concrete calendar constants.** Ticket 01 fixed the *structure* — a season-start constant, window
  bounds as month-day pairs, a weekend-before-midweek slot list derived from them. Choosing whether
  August-to-May starts on the 8th or the 15th is generation content, like ticket 10's club-strength
  tuning constants.

- **Rewriting the chrome's season readout.** Ticket 01 contradicts an `implemented` note whose
  acceptance criteria fix the readout at `Season {n} · Matchday {m}/38` with "no copy expresses time in
  days or dates". The replacement copy is a renderer decision rather than a shape on disk, and belongs
  to whoever next opens the career-chrome note.

- **A cup's missing fidelity: extra time, replays, and two-legged ties.** Ticket 06 shipped single-leg
  ties settled by shootout, because extra time means adding halves 3 and 4 to an engine whose fatigue
  model is calibrated on 90 minutes, and replays need dates the slot allocator never reserved. All
  three are gameplay and engine work rather than shapes on disk.

- **Showing a shootout in the match timeline.** Ticket 06 resolves shootouts outside the minute loop,
  so they emit no match events and the timeline shows a drawn 90 minutes with a winner from elsewhere.
  Surfacing it is a read model, not a table.

- **Reworking the match RPC surface around fixture ids.** Ticket 11 fixed the *keyspace* — a Match
  stream's `stream_id` is a `fixtures.id`, restoring what ADR-0007 specified and the code drifted from.
  Collapsing the `MatchId` brand onto `FixtureId` and making `startMatch` fixture-addressed rather than
  opponent-addressed is a contracts and handler change, handed off with the rest of the query layer.

- **A news or inbox feed over the season stream.** Ticket 11 keeps the Season stream as the career's
  narrative record and adds an in-world `game_date` to every event, which is what such a feed would
  read. Building the feed is a screen, not a shape on disk.

- **The unseeded background match.** ~~`resolveFixtureScore` seeds the engine with `Math.random()`,
  contradicting ticket 06's determinism chain. Surfaced by ticket 11 while deciding those events are
  not worth storing, and left there: it is an engine-call defect, not a shape on disk, and it belongs
  to whoever implements ticket 06's chain.~~ **Shipped by implementation ticket 01**
  ([implementation/01-deterministic-background-match-seed.md](implementation/01-deterministic-background-match-seed.md)):
  the match seed derives from the world seed plus the fixture's own identity, so the whole world
  replays; the League stands in for the competition until date-bearing Competitions land.
