# Spec: The MVP world data model

Status: ready-for-agent

> Assembled by the world-data-model wayfinder map's ticket 12 from its twelve resolved decision
> tickets and their Agent Notes (all `Status: proposed`). Every implementation decision below ends
> with its source ticket's own gist and note link, copied verbatim; ticket 04 produced facts rather
> than a decision and carries a link to its measurements instead. Nothing here is implemented. The
> Drizzle migration, the generator rewrite, and the query-layer changes are the work this spec hands
> off, not part of it.

## Problem Statement

A save today describes one fixed league of twenty clubs in one unnamed nation. The schema at HEAD
([schema.ts](../../apps/desktop/src/main/db/schema.ts)) has eighteen tables and encodes that world
structurally: `season` is a per-save singleton whose `current_matchday` is CHECKed to `0..38`,
`fixtures.matchday` is CHECKed to `1..38`, no table names a competition or a nation, `clubs` has no
competition reference because there is only one, and `clubs.name` stores a display name as data in
direct contradiction of the rule `contentPack.ts` states in as many words — a canonical id is never
a display name.

The MVP world is the one the League Selection Snapshot already promises: several nations, their
pyramids, domestic cups, and dependency-closed competitions at three Simulation Depths, with
promotion and relegation. Nothing in the schema can express any of it. Competitions of different
lengths run concurrently, so a single global matchday number no longer identifies a point in time.
Cups need ties whose participants are unknown when the round is scheduled. A club moves between
divisions every season, and no column records which division it is in. Nations and cities have no
rows at all, so a player has no nationality and a club has no hometown.

The save also has **zero indexes**. Opening one club's squad scans every player row in the world:
127 ms at 400,000 players, against 0.9 ms with one index on `players(club_id)`.

Two more things are missing rather than wrong. Staff and scouting are fully designed and entirely
unbuilt, with no table behind either. And the event log was shaped for one league of twenty clubs:
applied unchanged to a 16,000-club world it writes ~204 MB of `PlayerDeveloped` payloads per Season
and a ~1.2 MB `MatchdayResolved` row on every Continue.

## Solution

One schema for the MVP world: **28 tables**, the eighteen that exist today (seven of them changed,
none removed) plus ten new ones, with an index list of two.

The world catalogue splits on one rule. `nations` and `cities` are copied into every save
**unconditionally**, because something outside the loaded world points at them — a player's
nationality and birthplace are drawn from the whole catalogue, not from the nations the player
selected. `competitions` and `clubs` are **activated-only**: they exist for the Effective Selection
and nothing else, and nothing outside the loaded world points in. Dependency edges are never
persisted, because nothing reads them after generation.

Time becomes a date. A fixture carries an ISO `scheduled_date` plus a competition-local `round`;
`season` keeps its singleton row with `current_date` in place of `current_matchday`; Transfer
Windows become date ranges whose legality is still read through `season.phase`. One `fixtures` table
serves leagues and cups alike, with nullable penalty scores for a shootout and no `winner_club_id`.
One `competition_participants` table answers membership for every season and freezes each
competition's final standings onto its own rows at `SeasonConcluded`; there is no header table above
it, because every column such a header would hold derives from its children.

Simulation Depth conditions exactly one thing: whether a club has a squad. `full` and `standard` are
byte-identical on disk. A `results-only` club is an ordinary `clubs` row — same columns, same
`city_id` — with no rows in `players`, `player_positions`, `contracts`, `player_fitness`, or
`tactics`, and its Results Strength is derived on read rather than stored.

Staff ship as two bound roles on the human's club alone, and scouting ships as two tables: an
assignment keyed on the scout, so the N-slot cap is structural rather than checked, and a sparse
progress table where absence means Unscouted. The event log is restricted to facts no table holds —
the human's club only, background matches unsourced, `MatchdayResolved` carrying a count rather than
every result — and one new authoritative table, `player_transfers`, carries the transfer history the
log stops recording. None of the five named read models becomes a table.

## User Stories

### Career setup and world generation

1. As a player, I want the nations and leagues I chose on the setup screen to be the world my career
   is generated from, so that the Review step describes the save I actually get.
2. As a player, I want a career refused before any file is written when my saved selection no longer
   matches the catalogue, so that a fingerprint mismatch costs me a message rather than a corrupt save.
3. As a player, I want a world generated at 400,000 players to take about twenty seconds behind a
   progress bar, so that career creation is a wait rather than a doubt.
4. As a player, I want a crashed generation to leave nothing behind, so that a failed attempt does
   not appear in my save list.
5. As a bug reporter, I want the same world seed and the same selection to produce the same world
   every time, so that a report is reproducible from two values.
6. As a bug reporter, I want a wider selection under the same seed to reproduce my narrower world
   exactly and add to it, so that a defect found at one scope can be investigated at another.
7. As a player, I want a save to record which content pack and which catalogue produced it, so that
   opening it under a pack that no longer covers its ids is a reported condition rather than a screen
   full of raw identifiers.

### The world catalogue

8. As a player, I want every club to have a real hometown, so that the world reads as a place rather
   than a list.
9. As a player, I want a club's display name to come from a replaceable content pack, so that the
   same generated world can run under fictional, licensed, or localized names.
10. As a player, I want a player's birthplace to be the same city no matter which nations I selected,
    so that the same person is the same person across two careers.
11. As a player, I want clubs to be able to share a city, so that two clubs in one large city read as
    real rather than as a defect.
12. As a player, I want a club's stadium name and capacity shown, so that a club has a ground, while
    accepting that the stadium is display only in MVP.

### Competitions, the pyramid, and promotion

13. As a player, I want my club to be promoted or relegated at the end of a season, so that a career
    has a direction beyond one table.
14. As a player, I want a division to keep the same number of clubs every season, so that the league
    I am playing in is stable.
15. As a player, I want parallel regional divisions to feed the division above them correctly, so
    that a pyramid that is not a single vertical chain still works.
16. As a player, I want the lowest division I loaded never to relegate anyone out of the world, so
    that my world stays closed and reproducible — and I want to understand that choosing a wider
    scope is how I buy the drop.
17. As a player, I want to see which competition my club is in without the game ever disagreeing with
    itself about it, so that a promotion cannot leave two answers on disk.
18. As a player, I want last season's final table to survive into this season, so that a completed
    season is history rather than something recomputed from fixtures that no longer exist.

### The calendar

19. As a player, I want the game to tell me the date, so that a multi-competition world has one clock.
20. As a player, I want Continue to resolve everything in the world dated on or before where it lands,
    so that no league is silently behind another.
21. As a player, I want Continue to stop only where a playable competition has a fixture, so that a
    background third division playing on a Tuesday does not interrupt me.
22. As a player, I want my club never to be scheduled twice on one date, so that the fixture list is
    playable.
23. As a player, I want a transfer window to be a pair of dates, so that window legality reads the
    same way in every nation.
24. As a player, I want my career to begin some weeks before the first league round, so that there is
    a pre-season to stand in.
25. As a player, I want the season to end at the last dated fixture including the cup final, so that
    the calendar does not lie about the sport to keep one tidy end date.

### Cups

26. As a player, I want a domestic cup with real bracket progression, so that a season has more than
    one competition in it.
27. As a player, I want a drawn cup tie settled by a penalty shootout, so that a knockout always
    produces a winner.
28. As a player, I want the cup draw to be reproducible from the world seed, so that the same career
    replays the same bracket.
29. As a player, I want a cup with an entrant count that is not a power of two to work, with byes
    going to clubs from the strongest source divisions, so that the catalogue is free to describe
    real fields.
30. As a player, I want a cup tie between a squad-bearing club and a results-only club to resolve, so
    that giant-killing rounds exist across the depth boundary.

### Simulation Depth

31. As a player, I want a large world to Continue without seconds of freeze, so that the only
    time-advancing control in the game stays responsive.
32. As a player, I want a `results-only` competition to have a full fixture list and a real final
    table, so that a nation I cannot see into still behaves like a football nation.
33. As a player, I want a `standard` club to hold exactly what a `full` club holds, so that a club
    becoming manageable needs no conversion.
34. As a player, I want a results-only league not to be won by the same club every season, so that a
    background nation has a story.
35. As a player, I want a club promoted out of a results-only division to arrive with a squad whose
    strength matches how it was performing, so that its first fixture does not contradict its last.

### Squads, provenance, and identity

36. As a player, I want a squad's names to read like the nation it plays in, so that a Portuguese
    league does not read like an English one.
37. As a player, I want foreign players in a squad in proportion to the recruitment links the nation
    profile describes, so that a league has migration in it.
38. As a player, I want a player profile to show nationality and birthplace, so that a player has an
    origin.
39. As a player, I want a full name to recur about as often as it does in a real league, so that
    400,000 players do not read as 400 people.
40. As a player, I want a player's career history — the clubs they have played for and when — to be
    answerable years later, including for a player who spent that career in a nation I never watched.

### Staff and scouting

41. As a manager, I want a named coach at my club who lifts the whole squad's development, so that
    the backroom is a reason to take a bigger job.
42. As a manager, I want a named scout for each of my assignment slots, so that assigning a scout is
    directing a person rather than spending an abstract slot.
43. As a manager, I want a better scout to reach Fully Scouted faster, and a poor scout to get there
    eventually, so that quality is felt without any assignment being futile.
44. As a manager, I want scouting a player I have never looked at to cost nothing on disk, so that
    world size does not pay for attention I never spent.
45. As a manager, I want my scouting to belong to the club rather than to me, so that taking a new
    job starts a new club's observation rather than importing the last one's.
46. As a manager, I want no scouting state at all for AI clubs, so that scouting's cost scales with
    my attention rather than with the size of the world.
47. As a player, I want to understand that a `results-only` nation is one I cannot sign from, because
    nobody there exists as a row to scout.

### History, events, and reading the world

48. As a player, I want the timeline of a match I watched to be re-derivable, so that a match I sat
    through can be re-read.
49. As a player, I want my own squad's development recorded, so that how my players improved is
    answerable later.
50. As a player, I want the career's narrative moments — season start, window open and close, board
    judgment, warnings, sacking, retirement — to carry the in-world date, so that a career reads as a
    chronology.
51. As a player, I want my own past seasons' fixtures kept and everyone else's discarded at rollover,
    so that my history survives without the save doubling every twenty seasons.
52. As a player, I want opening my squad to be instant in a 400,000-player world, so that the size of
    the world I chose is not felt on every screen.
53. As a player, I want a league table to read one competition's fixtures rather than every fixture
    in the world, so that rendering a table is not an O(world) operation.

## Implementation Decisions

- **The Calendar becomes date-bearing, and time is expressed as a date everywhere it is stored.**
  `fixtures` carries an ISO `scheduled_date` and a competition-local `round` with no upper bound;
  `season` keeps its singleton row with `current_date` replacing `current_matchday`; dates come from
  a code-held slot template, weekends before midweeks, cups reserving first, failing loudly rather
  than double-booking; and the rule that a club never plays twice on one date is upheld by the
  generator and a test rather than by a half-covering index. **The Calendar becomes date-bearing:
  fixtures carry an ISO date plus a competition-local round, one August-to-May shape serves every
  nation, Continue resolves everything dated on or before the target date and stops only at playable
  fixtures, `season` stays a singleton keyed on `current_date`, Matchday is redefined as a date and
  Round is the competition-local number, and Transfer Windows become date ranges still read through
  `season.phase`.** See [Agent Note](../../.agents/notes/proposed/architecture/2026-09-02-date-bearing-calendar.md).

- **The competition graph is persisted as the resolved world, and membership has exactly one home.**
  `competitions` holds one row per activated competition keyed by the catalogue's own canonical id;
  `competition_links` carries promotion and relegation as one symmetric fact with a slot count, which
  is what guarantees a league never changes size; `competition_entrants` carries cup entry as its own
  relation because an entry edge has no slot count; no table stores a dependency (`requires`) edge;
  and no column on `clubs` stores a current or generated-home competition. **The catalogue stays code
  and the save records the resolved world: an activated-only `competitions` table, symmetric Exchange
  Links carrying promotion and relegation as one fact, a closed world at the edge of the chosen
  scope, and membership answered from participant rows rather than a column.** See
  [Agent Note](../../.agents/notes/proposed/architecture/2026-09-01-competition-graph-and-promotion.md).

- **Nations and cities become rows, and the canonical-id rule lands everywhere at once.** `nations`
  is one thin row per `NATION_CODES` member with the Nation Profile left in code; `cities` carries
  `(canonical id, nation, name, population band)` with no coordinates and no population figure;
  there is no stadium table, `clubs` carrying `stadium_name` and `stadium_capacity` instead;
  `clubs.name` is deleted and display names resolve through the content pack once, in the
  main-process query layer; competition display names move out of the catalogue into the pack; and
  one underscore id convention (`nation_eng`, `comp_eng_1`, `club_eng_01`) governs the whole
  catalogue. **Nations are unconditional referent rows and thin, cities are curated real geography
  resolved per activated nation, no stadium table, and the canonical-id rule lands everywhere at
  once — `clubs.name` deleted, competition names moved to the pack, one underscore id convention.**
  See [Agent Note](../../.agents/notes/proposed/architecture/2026-09-01-world-catalogue-and-canonical-ids.md).
  The city-scoping half of that gist is superseded by the geography decision below, which widened
  `cities` to unconditional; everything else in it stands.

- **The save's size and its cliffs are measured rather than estimated, and every row-count claim in
  this spec is stated in those units.** A 400,000-player world is ~335 MB and ~22 seconds to
  generate, both linear — ~450 bytes and ~55 microseconds per player, ~2.4 KB per club. The save has
  zero indexes, and one on `players(club_id)` takes the squad view from 127 ms to 0.9 ms. The
  remaining cliffs are query-layer defects rather than shapes on disk. Full numbers, per-table byte
  breakdown, and query plans:
  [RESULTS.md](../../apps/desktop/src/main/db/prototype-scale-probe/RESULTS.md). (Fact-finding, no
  Agent Note.)

- **Staff ship as two bound roles that exist only for the human's club.** One `staff` table with a
  `role` discriminator of exactly `coach` or `scout`, a single generic 1-20 `quality` column, a
  directly stored name, and a stable surrogate id; exactly one coach and N scouts, N from the Stature
  Tier table; quality is static, with no wages, no candidate pool, and no hiring or firing, so
  `Contract` and `Wage Budget` are untouched; rows are materialised lazily when a club becomes
  human-managed and are a deterministic function of the world seed and the club's canonical id, so
  staff cost world generation nothing and there is no Simulation Depth branch anywhere in the model.
  **Two roles, Coach and Scout, on the human's club only: scout quality drives accrual rate, the
  coach scales the passive development baseline, one static 1-20 quality column each, no wages and no
  hiring market.** See [Agent Note](../../.agents/notes/proposed/feature/2026-09-01-staff-entity-and-bindings.md).

- **Seasons, fixtures, and cup brackets generalize onto two tables and no header.**
  `competition_participants` keyed `(competition_id, season_number, club_id)` answers membership and
  freezes final position, points, goal difference, and goals for at `SeasonConcluded`; `fixtures`
  gains `competition_id` and an integer primary key and serves both kinds; and `board_objective`
  gains a `competition_id` so the competition it judges is named rather than inferred. **One
  `competition_participants` table carrying frozen final positions replaces both the `season`
  generalization and ticket 02's unnamed per-Season row; one `fixtures` table serves leagues and cups
  with nullable penalty scores; cup fixtures materialise as their participants become known, with
  dates still a pure function of round; drawn ties go straight to a shootout, leaving the two-half
  engine untouched; both draw and match seeds hash canonical ids, so the bracket reproduces without
  being stored; `results-only` competitions get full fixture lists; and past-Season fixtures survive
  only for competitions the human played in.** See
  [Agent Note](../../.agents/notes/proposed/architecture/2026-09-02-season-fixture-and-cup-schedule.md).

- **Simulation Depth collapses on disk to has-a-squad or not, and club strength is never a column.**
  No table is written for a `full` club that is not written for a `standard` club; a `results-only`
  club has zero rows in `players`, `player_positions`, `contracts`, `player_fitness`, and `tactics`;
  Results Strength is one 1-100 number derived from the world seed, the club id, its Stature Tier,
  the competition's tier and nation prior, and the season number, calibrated against measured squads,
  with a collapse function serving mixed cup ties; and Effective Depth is derived from participant
  rows joined to `competitions.depth`, never stored on `clubs`. **`results-only` ships, justified
  solely on recurring per-matchday simulation cost (~1.0 ms per fixture, measured); `full` and
  `standard` are byte-identical on disk; and Results Strength is one 1-100 number derived on read,
  never a stored column.** See
  [Agent Note](../../.agents/notes/proposed/architecture/2026-09-01-simulation-depth-persistence.md).

- **A player carries one nationality, a nullable birth city, and a directly stored name.** `players`
  gains a `nationality` column referencing a nation and a nullable `birth_city_id` referencing a
  city; name pools live in code beside `nations.ts` as factual, nation-keyed data that must grow from
  today's 400 global combinations to roughly 20,000 per nation; names stay text columns on `players`
  because a content pack ships before the players it would have to name; and no career-history table
  ships. **One nationality with a stated reintroduction condition, a nullable `birth_city_id` whose
  NULL means "born outside the loaded world", nation-keyed name pools in code as factual data
  (today's pool is 400 combinations and must grow), names stored directly because a pack cannot name
  players it predates, and no career-history table because the event log already holds it.** See
  [Agent Note](../../.agents/notes/proposed/architecture/2026-09-01-player-provenance-and-nationality.md).
  The career-history clause of that gist is superseded by the event-streams decision below, which
  ships `player_transfers` as authoritative state; everything else in it stands.

- **Scouting persists two tables and one primitive.** `scouting_assignments` is keyed on `scout_id`
  with a `UNIQUE` player, so the N-slot cap is a row count rather than a checked rule and the
  "already at cap" and "duplicate assignment" errors become unreachable states; `scouting_progress`
  is keyed `(club_id, player_id)` and sparse, so absence means Unscouted and no path writes a
  progress-0 row; Attribute Range and every narrowed bound stay derived; a player deleted by
  relegation takes their assignment and progress rows with them; a manager leaving a club deletes
  that club's staff, assignments, and progress; and neither club-scouting nor a Tactical Acumen
  binding ships. **Two tables — `scouting_assignments` keyed on the scout, and a sparse
  `scouting_progress` keyed on (club, player) — with the scoutable set defined by which players have
  rows at all, so `results-only` hides a transfer market as well as a simulation.** See
  [Agent Note](../../.agents/notes/proposed/architecture/2026-09-02-scouting-persistence.md).

- **Generation reads the snapshot, and every generated value keys on canonical ids alone.**
  `beginCareer` takes a `SnapshotId` and re-resolves its intents rather than trusting the recorded
  selection; `generation_manifest` gains `snapshot_id` as a diagnostic pointer and no table stores the
  snapshot's intents; a club's canonical id is minted from its competition id and its ordinal;
  `nations`, `cities`, and `competitions` get no `generation_seed` column, while `clubs` and `players`
  keep theirs; generation order is nations, cities, competitions, clubs, then squads, inside one
  transaction, with staff written by `commitCareer`; and no generated value may depend on a count,
  a collection length, or an iteration position. **`beginCareer` takes a `SnapshotId` and re-resolves
  its intents against the live catalogue rather than trusting the recorded selection; every seed and
  canonical id is keyed on canonical ids alone, which buys a superset determinism property; and club
  strength becomes a function of competition tier and nation prior, with Stature Tier demoted to a
  spread within its own competition.** See
  [Agent Note](../../.agents/notes/proposed/architecture/2026-09-02-generation-reads-the-snapshot.md).

- **The event log records only facts no table holds, and one new authoritative table replaces what it
  stops recording.** Club streams exist for the human's club alone; background fixtures open no
  stream; `MatchdayResolved` carries the date and a resolved-fixture count rather than every result;
  every event gains a `game_date`; a Match stream's `stream_id` is a `fixtures.id`; a Match stream is
  pruned exactly when its fixture is, under the participation rule; there is no partitioning and no
  snapshotting; none of the five named read models becomes a table, with the materialisation
  condition stated; and `player_transfers` ships as authoritative state carrying the player, the
  nullable from-club, the to-club, the in-world date, and the fee. **Two Deciders fold a stream and
  the third never did: the log records only facts no table holds, it grows at human scale rather than
  world scale, none of the five named read models becomes a table, and one new authoritative table
  `player_transfers` replaces the transfer events this removes.** See
  [Agent Note](../../.agents/notes/proposed/architecture/2026-09-02-event-streams-and-read-models.md).

- **Simulation Depth conditions what hangs beneath a club and nothing above it.** Every nation in
  `NATION_CODES` contributes its city rows to every save whatever the selection scope and whatever
  Depth its competitions run at; `clubs.city_id` is set for every club including a `results-only`
  one, so no column on `clubs` is Depth-conditional; and `birth_city_id` stays nullable while
  becoming unreachable in MVP, as the escape hatch for a catalogue nation whose geography is not yet
  curated. **Simulation Depth never conditions the world catalogue or the club row — a `results-only`
  nation keeps its cities, and `cities` widens further to unconditional across the catalogue,
  matching `nations`.** See
  [Agent Note](../../.agents/notes/proposed/architecture/2026-09-02-results-only-geography-cost.md).

- **The index list is two indexes, and every other table is unindexed as a stated choice.**
  `players(club_id)` and `fixtures(competition_id, season_number, played)` ship; ticket 04's third
  measured index, `contracts(player_id)`, does not, because `player_id` is already that table's
  primary key and SQLite's automatic index over it serves the same lookups; ticket 09's claim that
  scouting needs no index beyond its keys and ticket 11's claim that `events` needs none beyond its
  primary key are both verified below rather than rediscovered. (Assembly and verification, no Agent
  Note.)

## The table set

### The rules that decide where a fact lives

Four rules govern the whole schema. Every table below is placed by them, and a disagreement between
two tables is resolved by them rather than by preference.

1. **One home per fact.** No fact is authoritative in two places. This is why there is no
   `competition_seasons` header, no `winner_club_id`, no `clubs.competition_id`, no stored Results
   Strength, and no stored Attribute Range.
2. **The catalogue lives in code; the save records the resolved world.** The line inside the
   catalogue runs on whether anything outside the loaded world points at a row. `nations` and
   `cities` are copied **unconditionally** into every save, because `players.nationality` and
   `players.birth_city_id` may name a nation the selection never activated. `competitions` and
   `clubs` are **activated-only**, because nothing outside the loaded world points in and their
   volume scales with the chosen scope. Dependency (`requires`) edges are persisted nowhere, because
   nothing reads them after generation.
3. **Simulation Depth conditions what hangs beneath a club, never the world catalogue and never the
   club row itself.** Depth's entire footprint on disk is the presence or absence of rows in
   `players`, `player_positions`, `contracts`, `player_fitness`, and `tactics`. No column on `clubs`
   is Depth-conditional, and Effective Depth is derived from participant rows joined to
   `competitions.depth`.
4. **A canonical id is never a display name.** Club and competition display names resolve through the
   content pack at read time. City names are carried directly, because factual geography is not a
   licensed asset. Player and staff names are stored directly, because a pack ships before the
   entities it would have to name and the name is an attribute beside the identifier, not the
   identifier.

`CHECK` constraints are load-bearing here for the reason the current schema states: queries go
through raw SQL, so a `CHECK` is the last enforcement of a domain invariant before a row lands on
disk. Two invariants are deliberately **not** constraints — a club never playing twice on one date,
and a `scouting_progress` row never being written at progress 0 — and both are named as such below.

### The world catalogue (unconditional)

**`nations`** — new. Authoritative for the existence of a nation as a referent, and for nothing else.

- Columns: `id` (canonical, `nation_eng` form).
- Rows: one per `NATION_CODES` member, in every save, whatever the selection scope. Eight today.
- Invariants: no column stores whether a nation is activated — the answer is
  `SELECT DISTINCT nation_id FROM competitions`. No column mirrors a factual nation attribute or a
  Nation Profile prior; `generation_manifest.ruleset_version` pins which `nations.ts` the save was
  generated against. No `generation_seed`: nations are resolved, not generated.
- Reintroduction condition, recorded so the thin row is not "fixed" by a later reader: the first time
  a system reads a prior *during* a career rather than at generation, the profile must be snapshotted
  into the save.

**`cities`** — new. Authoritative for a club's hometown and a player's birthplace.

- Columns: `id` (canonical, `city_eng_london` form), `nation_id`, `name`, `population_band`.
- Rows: one per curated city of every nation in `NATION_CODES`, in every save, whatever the selection
  scope and whatever Depth its competitions run at. Roughly sixty per nation, ~480 rows for the
  shipped eight.
- Invariants: `CHECK population_band IN ('major','large','mid','small')`. `name` is carried directly
  and never resolved through a content pack. No coordinates and no population figure. No
  `generation_seed`.

### The competition graph (activated-only)

**`competitions`** — new. Authoritative for which competitions exist in this save, and for each one's
nation, kind, tier, Simulation Depth, and size.

- Columns: `id` (the catalogue's own canonical id, `comp_eng_1` form), `nation_id`, `kind`, `tier`,
  `depth`, `club_count`.
- Rows: one per competition in the Effective Selection; none for competitions resolved to
  `not_loaded`.
- Invariants: `CHECK kind IN (...)` over the catalogue's own `CompetitionKind` vocabulary, since the
  column copies the catalogue value. `CHECK depth IN ('full','standard','results-only')`. `tier` is
  NULL for kinds that do not sit on the ladder, and nothing may derive which competition sits above
  another by comparing tier numbers — that is what `competition_links` is for. `club_count` is NULL
  for a competition whose field is a function of its sources, and for every league and every season
  the participant count equals it.

**`competition_links`** — new. Authoritative for promotion and relegation structure.

- Columns: `higher_competition_id`, `lower_competition_id`, `slots`.
- Invariants: `CHECK slots >= 1`. Both endpoints must have rows in this save, so the lowest loaded
  division never relegates and the highest never promotes. One row expresses promotion and relegation
  as the same fact read in two directions; asymmetric exchange is not expressible, and that symmetry
  is what guarantees a league never changes size.

**`competition_entrants`** — new. Authoritative for which competitions' clubs enter a given cup.

- Columns: `cup_competition_id`, `source_competition_id`.
- Invariants: a separate table rather than a `kind` discriminator on `competition_links`, because an
  entry edge has no slot count and a nullable `slots` that half the rows ignore is a query hazard.

**`competition_participants`** — new. Authoritative for club membership in every season, and for each
competition's frozen final standings.

- Key: `(competition_id, season_number, club_id)`.
- Columns: the key, plus `final_position`, points, goal difference, goals for.
- Rows: one per club per competition per season, retained for the life of the save.
- Invariants: a club's **current** competition is its participant row for the current season; its
  **generated home** is its participant row for season 1; neither is a column anywhere. The
  standings columns are NULL until the rollover freezes them at `SeasonConcluded`, and after a
  rollover the previous season's final positions are readable without recomputing from fixtures. A
  cup winner is the participant whose `final_position` is 1. There is deliberately no
  `competition_seasons` header table: every column it would hold — champion, concluded flag,
  participant list — derives from these rows, and the existence of rows for `(competition, season)`
  already records that the competition ran that season.

### Clubs and squads

**`clubs`** — changed. Authoritative for a club's identity, its permanent standing among its peers,
its hometown, its stadium, and its generation seed.

- Columns: `id` (canonical, minted as competition-plus-ordinal, `club_eng_1_07`), `stature_tier`,
  `is_user_club`, `generation_seed`, `city_id`, `stadium_name`, `stadium_capacity`.
- Removed: `name`.
- Invariants: `CHECK stature_tier IN ('big','mid','small')`, `CHECK is_user_club IN (0,1)`,
  `CHECK generation_seed BETWEEN 0 AND 4294967295`, all unchanged. `city_id` is set for every club at
  every Depth, and two clubs may share one — no constraint forbids it. Promotion moves a club out of
  the competition its id names, which is correct: an id is an identity, not a description.
- Not here, and each has one home elsewhere: competition membership (`competition_participants`),
  nation (via `cities`), Results Strength (derived), Effective Depth (derived), display name
  (content pack).

**`players`** — changed. Authoritative for a player's identity, attributes, provenance, and current
club.

- Columns added: `nationality` (references `nations`), `birth_city_id` (nullable, references
  `cities`). Everything else is unchanged: `id`, `club_id`, `first_name`, `last_name`,
  `date_of_birth`, `potential_ability`, the 23 outfield attributes, the five nullable goalkeeping
  attributes, `squad_slot`, `generation_seed`.
- Invariants: existing `CHECK`s stand — `potential_ability BETWEEN 1 AND 100`, every outfield
  attribute `BETWEEN 1 AND 20`, each goalkeeping attribute `IS NULL OR BETWEEN 1 AND 20` (absent, not
  zero, for an outfield player), `squad_slot >= 0`, seed in range. Exactly one nationality column
  exists and no second nationality appears anywhere in the schema. `birth_city_id` remains nullable
  and means "born outside the loaded world"; with `cities` unconditional no player generated by MVP
  carries a NULL. No `UNIQUE` on names — a name is an attribute, and avoiding a duplicate inside one
  squad is generation's job, done by redrawing.
- Depth: a `results-only` club has zero rows here.

**`player_positions`** — unchanged. Authoritative for a player's positional familiarity.

- Key `(player_id, position)`; `CHECK position IN (...)` over the ten positions and
  `CHECK familiarity IN ('natural','competent','unfamiliar')`.
- Depth: a `results-only` club has zero rows here.

**`contracts`**, **`player_fitness`**, **`training_focus`** — unchanged in shape. Authoritative for,
respectively, a player's active contract; their per-season condition and last injury severity; and
their Training Focus. All three keep their existing `CHECK`s. `contracts` and `player_fitness` have
zero rows for a `results-only` club; `training_focus` is written only when a manager sets a focus, so
its absence already means no focus.

**`tactics`**, **`tactic_slots`** — unchanged. Authoritative for a club's tactic and its selected
eleven, with the existing `CHECK`s over formation, mentality, tempo, pressing, and position. Zero
rows for a `results-only` club.

**`club_budgets`** — unchanged. Authoritative for a club's Transfer Budget remaining and Wage Budget
cap in the current season. Written for every club: Depth's footprint is exactly the five tables named
in rule 3 above, and this is not one of them.

**`bids`** — unchanged. Authoritative for in-flight bid state, with the existing `CHECK`s on amount
and status.

### The season and its fixtures

**`season`** — changed. Authoritative for which season the save is in, the current date, and the
transfer-window phase.

- Columns: `season_number` (primary key), `current_date` (ISO text), `phase`.
- Removed: `current_matchday`, and with it the `0..38` `CHECK`.
- Invariants: `CHECK phase IN ('pre_season','in_season','mid_window_open','season_complete')`
  unchanged. Stays a per-save singleton: everything reading it is save-wide. Per-competition progress
  is derived from that competition's own fixture rows, never stored. A season concludes when no
  unplayed fixture remains for it in any loaded competition, cup final included.

**`fixtures`** — changed. Authoritative for the schedule and for every result in the world.

- Columns: `id` (now an **integer** primary key), `competition_id`, `season_number`, `round`,
  `scheduled_date` (ISO text), `home_club_id`, `away_club_id`, `home_goals`, `away_goals`,
  `home_penalties` (nullable), `away_penalties` (nullable), `played`.
- Removed: `matchday` and its `1..38` `CHECK`; the text primary key.
- Invariants: `CHECK round >= 1` with no upper bound, since the bound is a per-competition property.
  `CHECK played IN (0,1)` unchanged. No nullable club id: a cup fixture row is created only once both
  its participants are known, and its `scheduled_date` is what the template yields for its round
  whenever it was computed. Both penalty columns are NULL together or set together; NULL in both
  means the tie did not go to a shootout, which is every league fixture and most cup ties. There is
  no `winner_club_id` and no `cup_ties` table: goals plus penalties already determine the winner.
  A club never holds two fixtures on one date — upheld by the generator and a test, deliberately not
  by an index, because a unique index on either club column misses a club playing home in a league
  fixture and away in a cup tie the same day.
- Retention: at rollover, past-season fixtures survive only for competitions the human's club
  participated in; every other competition's are deleted, irreversibly.
- Depth: every loaded competition has a full fixture list, `results-only` included. Depth decides how
  a fixture resolves, never whether it exists.

**`board_objective`** — changed. Authoritative for the human club's per-season objective and verdict.

- Column added: `competition_id`, so the competition being judged is named rather than inferred.
- Invariants: `CHECK verdict IS NULL OR verdict IN ('exceeded','met','missed')` unchanged. One row
  per season for the human's club only. `final_position` reads the frozen participant row. A cup run
  is unjudged in MVP.

**`manager_status`**, **`manager_profile`**, **`save_meta`** — unchanged, including the single-row
`CHECK`s, the 1-5 pillar `CHECK`s, and the pillars-sum-to-12 `CHECK`.

**`generation_manifest`** — changed. Authoritative for what produced this save's world.

- Columns added: the catalogue `fingerprint`, `content_pack_id` and the pack version, and
  `snapshot_id`.
- Unchanged: `world_seed`, `generator_version`, `ruleset_version`, `reference_year`, `generated_at`,
  and the single-row and seed-range `CHECK`s.
- Invariants: `snapshot_id` is a diagnostic pointer and explicitly **not** a foreign key — the
  snapshot file is machine-local and will not exist beside a save copied elsewhere. `generated_at` is
  still readable by nothing in generation or simulation. No table stores the snapshot's intents.

### Staff and scouting

**`staff`** — new. Authoritative for the human club's backroom.

- Columns: `id` (surrogate `StaffId`), `club_id`, `role`, `quality`, `name`.
- Invariants: `CHECK role IN ('coach','scout')` and `CHECK quality BETWEEN 1 AND 20`. A row exists
  only for a club that is or has been human-managed, at any Simulation Depth. A human-managed club
  has exactly one `coach` row and exactly N `scout` rows, N from the Stature Tier table. Quality is
  static. The name is stored directly and is not the identifier. Rows are a deterministic function of
  the world seed and the club's canonical id, so taking the same club at two points in one career
  yields byte-identical rows. Written by `commitCareer`, never by world generation. Deleted when the
  manager leaves the club.

**`scouting_assignments`** — new. Authoritative for which scout is watching which player.

- Columns: `scout_id` (primary key, references `staff.id`), `player_id` (`UNIQUE`, references
  `players.id`).
- Invariants: the primary key on `scout_id` gives each scout at most one assignment, so the N-slot
  cap is the row count of a table keyed on the scout rather than a rule application code can violate;
  "already at cap" and "duplicate assignment" are unreachable states rather than errors.
  `UNIQUE(player_id)` carries "at most one scout on a player at a time", and is correct only while
  scout rows exist for a single current club. No `club_id` column: a scout's club is `staff.club_id`.
  Deleting a player deletes their assignment and reopens the scout's slot.

**`scouting_progress`** — new. Authoritative for how far a club has investigated a player.

- Key `(club_id, player_id)`; column `progress`.
- Invariants: `CHECK progress BETWEEN 0 AND 100`. The table is **sparse**: a row exists only for a
  player who has actually been scouted, absence means Unscouted, and no code path writes a
  progress-0 row — an invariant upheld by the writer rather than by the constraint. Progress never
  returns to zero, since Attribute Range narrows monotonically. Progress belongs to the club, not the
  manager: a career move starts the new club Unscouted on everyone, and the old club's rows are
  deleted rather than orphaned. Deleting a player deletes their progress. Nothing stores an Attribute
  Range, a narrowed bound, or a fogged Transfer Value.

### The log and transfer history

**`events`** — changed. Authoritative for the match seed and the human's in-match commands, for the
career's narrative sequence, and for the human squad's development steps. Nothing else.

- Column added: `game_date` (ISO text, the save's `current_date` at append). `created_at` stays, for
  debugging a save against a real timeline.
- Key unchanged: `(stream_type, stream_id, seq)`.
- Invariants: an event is appended only where it is the sole record of a fact. A **Match** stream
  exists only for a fixture the human watched, and its `stream_id` is that `fixtures.id` — the column
  stays text and carries the id in that form, with no foreign key, because `stream_type` varies. A
  **Season** stream is one per save. A **Club** stream exists only for the human's club. A background
  fixture resolves with zero rows written here. No event payload carries a field named `matchday`,
  and `MatchdayResolved` carries the date and a resolved-fixture count rather than every result, so
  its size is independent of how many fixtures resolved. A Match stream is deleted exactly when its
  fixture is, under the fixtures retention rule; nothing else is ever pruned; there is no
  partitioning and no snapshotting.

**`player_transfers`** — new. Authoritative for completed transfers world-wide, and therefore for
career history.

- Columns: `player_id`, `from_club_id` (nullable — a free agent or a generated squad has none),
  `to_club_id`, the in-world date, and the fee.
- Invariants: zero rows immediately after world generation; exactly one row per completed transfer,
  world-wide, including transfers between two clubs the human never sees. Deleting a player deletes
  their rows. A player's career history is `players.club_id` plus these rows ordered by date — a
  query over authoritative state, answerable without reading `events`. There is no
  `player_career_history` table.
- The table's primary key is an open question; see below.

### Derived on read, and deliberately absent

Each of these was proposed and rejected, each because it would give one fact a second home:

- **Results Strength** — one 1-100 number computed from the world seed, the club id, its Stature
  Tier, the competition's tier and nation prior, and the season number. No column named for club
  strength exists.
- **Effective Depth** — derived from participant rows joined to `competitions.depth`. Not a column
  on `clubs`.
- **Attribute Range**, the fogged Transfer Value, and every narrowed attribute bound — pure functions
  of Scouting Progress and the true stored value.
- **Position Rating, Overall Rating, Transfer Value** — unchanged from ADR-0001's ruling, computed at
  query time from stored primitives.
- **A club's current and generated-home competition** — participant rows, not a column on `clubs`.
- **A cup tie's winner** — goals plus penalties.
- **A competition's champion, concluded flag, and participant list** — its participant rows.
- **A stadium entity, a `competition_seasons` header, a `cup_ties` table, a `player_career_history`
  table, a second nationality, a dependency-edge table, and a persisted Nation Profile** — none
  exists.

### Read models

None of `squad_view`, `league_table`, `transfer_inbox`, `match_day_timeline`, or `season_summary` is
a table, and no such table has ever existed. A read model is a query shape over authoritative tables.
The materialisation condition, stated so a later effort has a test rather than an argument: **a read
model is materialised when its query remains O(world) after the index list below, and its inputs
change less often than it is read.** None of the five satisfies both.

## Index list

The save has zero indexes today. Two ship. Every other table is unindexed beyond the automatic index
SQLite creates over its primary key, and that is a choice, stated here per table.

| index | query it serves | measured value | cost |
|---|---|---|---|
| `players(club_id)` | the squad view (`loadSquadPlayers`), and every per-club squad read the AI transfer window makes | 127 ms → **0.9 ms** at 400k players, faster than the *unindexed* 20k save | part of a measured three-index bundle at 45 MB (1.9% of the file) and 1.6 s of generation |
| `fixtures(competition_id, season_number, played)` | `computeStandings` for one competition, once it gains the `competition_id` predicate it is missing | the unindexed scan is 302 ms at 400k because it reads every played fixture in the save; with the predicate and this index it reads one competition's ~380 rows | unmeasured separately; the same bundle's order of magnitude |

Ticket 04 measured a third index, `contracts(player_id)`. It does not ship: `player_id` is already
that table's primary key, so SQLite's automatic index over it serves the same lookups, and a second
index on the same column would be pure cost. For the same reason ticket 04's two-column
`fixtures(season_number, played)` is not carried: the world-wide query it was measured against gains
a competition predicate, and the calendar advance now sweeps on `scheduled_date` rather than on
`(season_number, played)`.

Unindexed by choice, with the reason:

- **`events`** — its three-column primary key is an automatic unique index that serves both access
  paths the code has: the `(stream_type, stream_id)` prefix scan in `loadStreamEvents` and the
  `MAX(seq)` in `nextStreamSeq`. Ticket 11's claim, verified.
- **`scouting_assignments`, `scouting_progress`** — every read is either all progress for one club
  (the `club_id` prefix of the progress key) or a point lookup on the full key. Ticket 09's claim,
  verified, with one nuance it did not state: `UNIQUE(player_id)` is itself an index, and it is what
  serves "is this player already assigned".
- **`nations`, `cities`, `competitions`, `competition_links`, `competition_entrants`** — tens to
  hundreds of rows, read by id or wholesale.
- **`competition_participants`** — the key's `(competition_id, season_number)` prefix serves every
  competition-keyed read, which is the standings freeze, the rollover, and the league table. The
  club-keyed read is an open question below.
- **`clubs`, `contracts`, `player_fitness`, `training_focus`, `tactics`, `tactic_slots`,
  `club_budgets`, `board_objective`** — keyed on a club or a player and read as point lookups, so the
  primary key's automatic index is the whole access path.
- **`player_positions`** — the `(player_id, position)` key's prefix serves per-player reads. The
  world-wide read that hurts is `loadAllPlayersEcon`'s O(players × positions) JavaScript, which is a
  query-layer defect the map ruled out of scope; an index cannot fix a quadratic loop.
- **`bids`** — small and already scoped to the human's club.
- **`save_meta`, `manager_profile`, `manager_status`, `generation_manifest`, `season`** — singletons
  or near-singletons.
- **`staff`** — single-digit row count.
- **`player_transfers`** — see the open questions.

## Row-count budget

Units are ticket 04's measured ones: **~450 bytes and ~55 microseconds of generation per player,
~2.4 KB per club**, both linear to 400,000 players. The representative world below is that ceiling —
16,000 clubs, 400,000 players, ~800 competitions at 20 clubs each — which is larger than the shipped
catalogue, whose nineteen leagues hold 382 clubs.

| table | rows at the representative world | cost |
|---|---|---|
| `nations` | 8 | negligible |
| `cities` | ~480 (~60 per nation × 8) | ~24 KB — the entire world's geography costs less than sixty players |
| `competitions` | ~800 | negligible |
| `competition_links`, `competition_entrants` | order of `competitions` | negligible |
| `competition_participants` | ~16,000 per season for leagues plus each cup's field, retained for the life of the save | not separately measured; small beside one season of fixtures |
| `clubs` | 16,000 | ~38 MB at ~2.4 KB per club |
| `players` | 400,000 | ~335 MB for the whole squad-bearing world all-in (players, positions, contracts, fitness, fixtures), ~22 s to generate |
| `player_positions`, `contracts`, `player_fitness` | ~2.3, 1, and 1 rows per player | included in the ~450 bytes per player above |
| `fixtures` | ~304k league fixtures per season, plus cup ties | ~15 MB per season; after rollover only the human's competitions survive, ~50 rows per season |
| `events` | a few hundred to a few thousand rows per career | ~167 bytes per row including its primary-key index; `game_date` adds ~11 bytes per row, which on this log is free and on the un-restricted log would have been ~130 MB over twenty seasons |
| `player_transfers` | ~32,000 per season at ~2 completed transfers per club | ~100 bytes per row → ~3 MB per season, ~64 MB over twenty seasons — the largest permanent growth this schema accepts |
| `staff` | 1 coach + N scouts, human's club only | nothing at world generation |
| `scouting_assignments` | ≤ N | negligible |
| `scouting_progress` | low hundreds across a career | negligible — a dense table would have been ~180 MB of progress-0 rows at 400k players |
| `tactics`, `tactic_slots`, `club_budgets` | per squad-bearing club | included in ~2.4 KB per club |
| `bids`, `board_objective`, `training_focus` | human-scale | negligible |

Two costs this schema deliberately avoids, both measured: **~2,035 MB per season** for
event-sourcing background matches (6× the rest of the save), and **~204 MB per season** for
`PlayerDeveloped` across every club. A `results-only` club saves ~11 KB of squad and, recurring every
matchday for the life of the save, ~1.0 ms of match simulation per fixture — which at ~8,000 fixtures
a matchday is the ~8 seconds of blocking JavaScript per Continue that the tier exists to prevent.

## Delta from today's schema

Ticket 12 asked for the delta from "today's sixteen tables". The schema at HEAD defines **eighteen**;
the count below is against that.

**Added (10):** `nations`, `cities`, `competitions`, `competition_links`, `competition_entrants`,
`competition_participants`, `staff`, `scouting_assignments`, `scouting_progress`,
`player_transfers`.

**Changed (7):**

| table | change |
|---|---|
| `clubs` | `name` removed; `city_id`, `stadium_name`, `stadium_capacity` added |
| `players` | `nationality` and nullable `birth_city_id` added |
| `season` | `current_matchday` → `current_date`; the `0..38` `CHECK` removed |
| `fixtures` | text `id` → integer; `matchday` → `round` with `>= 1` and no upper bound; `competition_id`, `scheduled_date`, `home_penalties`, `away_penalties` added |
| `board_objective` | `competition_id` added |
| `generation_manifest` | catalogue fingerprint, `content_pack_id` and pack version, `snapshot_id` added |
| `events` | `game_date` added; a Match stream's `stream_id` becomes a `fixtures.id` |

**Removed (0 tables, 1 column):** no table is dropped. `clubs.name` is the only column deleted, and
deleting it breaks every main-process test asserting a club display name at once.

**Indexes:** from zero to two.

**Not in the delta, because they never existed:** `stadiums`, `competition_seasons`, `cup_ties`,
`player_career_history`, and any of the five read-model tables.

## CONTEXT.md entries this effort changed

Every entry below was reconciled in the same change as the ticket that overturned it, per the map's
standing preference, and each is verified present in [CONTEXT.md](../../CONTEXT.md) at HEAD. Nothing
was deferred to this spec.

| ticket | entries | state at HEAD |
|---|---|---|
| 01 | **Matchday** redefined as a date; **Round** added; **Calendar**, **Season**, **Transfer Window** restated against dates | reconciled |
| 02 | **Exchange Link** and **Pyramid** added; **Tier** promoted to its own entry; **Season** loses its denial of promotion and relegation | reconciled |
| 03 | **City** added; **Nation** names nations *and* cities as the real-world foundation; **Content Pack** states that the pack is a code asset recorded on the save | reconciled |
| 05 | **Staff** and **Coach** added; **Scout** restated as a person rather than a fungible slot | reconciled |
| 06 | **Cup Tie**, **Bye**, **Penalty Shootout** added; **Board Objective** names the competition it judges; **Simulation Depth** records that it governs how a fixture resolves, never whether one exists | reconciled |
| 07 | **Results Strength** added; **Simulation Depth** records the on-disk collapse to two shapes | reconciled |
| 08 | **Nationality** and **Name Pool** added | reconciled |
| 09 | **Scouting Assignment** narrowed to a Player only; **Tactical Acumen** states the condition under which a scouting binding returns instead of naming an effort that has arrived | reconciled |
| 10 | the generation-boundary paragraph is replaced by the boundary that ticket drew; **Stature Tier** records the within-competition spread | reconciled |
| 11 | **Decider** restated (three Deciders, one fold, Club stream human-only, Match stream keyed on the Fixture); **Stream** added, distinguishing a folded stream from a ledger; **Read model** becomes a query shape with the materialisation condition | reconciled |
| 13 | none — the **City** entry is a definition and says nothing about which cities a save persists | no change needed |

## Testing Decisions

A good test here asserts an observable property of a generated or advanced world, never the shape of
the code that produced it. The schema's own `CHECK` constraints are the first line and need no test
of their own; what needs testing is every invariant that a constraint cannot express, and those are
exactly the ones this spec names as upheld by a writer.

Prior art in the repo: `db-migrations-drift.test.ts` already fails when the generated DDL drifts from
the Drizzle definitions, which is the seam that keeps this spec's table set honest once it lands.

The behaviours to observe:

- **Determinism and the superset property.** Two worlds from one seed under selection A and a
  superset selection B produce identical rows for every club and player present in A, covering both
  an added nation and a widened League Scope Option. Two saves under different nation selections give
  a player with the same id the same `birth_city_id`. This test generates two worlds and will be
  slow; the invariant erodes the moment it stops being run.
- **No generated value keys on a collection.** No generated value is computed from a count, a length,
  or an iteration position over the set of entities being generated.
- **Calendar structure.** Advancing to date D leaves no unplayed fixture in the world dated on or
  before D and lands on a date carrying a playable-competition fixture. No club holds two fixtures on
  one date in a generated world. Generation raises rather than double-books when a competition's
  rounds exceed the season's slots. `SeasonConcluded` fires exactly once per season, after the last
  dated fixture of any loaded competition. The five `isWindowOpen` call sites are untouched.
- **Competition structure.** Every `competition_links` row names two competitions with rows in this
  save. For every league and season, participant count equals `competitions.club_count`. No column
  anywhere answers a club's current or generated-home competition.
- **Cups.** A field of 44 produces a valid bracket with byes held by clubs from the highest-tier
  sources. Two saves from one seed produce identical draws through every round. A cup fixture exists
  only once both participants are known, at the date its round would always have had.
- **Depth.** No table is written for a `full` club that is not written for a `standard` club. A
  `results-only` club has zero rows in the five squad tables and an identical `clubs` row to a `full`
  club of the same id, `city_id` included. A `results-only` league does not return the same champion
  every season under a fixed seed. A mixed cup tie resolves without invoking the match engine.
  Results Strength reproduces the measured per-Stature-Tier bands.
- **Scouting and staff.** `coachModifier(q) >= 1.0` over the whole 1-20 domain. Accrual is strictly
  positive over the whole domain, so Fully Scouted is reachable. No `scouting_progress` row is ever
  written at 0. Deleting a player deletes their assignment, progress, and transfer rows. A manager
  leaving a club deletes that club's staff, assignments, and progress. No player in a `results-only`
  competition appears in any scoutable set, and no scouting code branches on Depth to achieve it.
- **The log.** A background fixture resolves with zero `events` rows. No `events` row has
  `stream_type = 'club'` for any club but the human's. A `MatchdayResolved` payload's size is
  independent of how many fixtures resolved. After a rollover, a Match stream exists only for a
  surviving fixture. A player's career history is answerable by one query over `players` and
  `player_transfers` without reading `events`.
- **The catalogue line.** `nations` and `cities` are complete in every save whatever the selection;
  `competitions` holds exactly the Effective Selection; no table stores a dependency edge, a Nation
  Profile value, an activation flag, or the snapshot's intents.
- **Indexes.** `EXPLAIN QUERY PLAN` on the squad view uses `players(club_id)` rather than scanning,
  and on the league table uses `fixtures(competition_id, season_number, played)`.

## Out of Scope

Everything the map placed out of scope stays there; it is not restated here. The items closest to
this spec's edge, because a reader will expect them in a schema document:

- **The Drizzle migration itself**, the generator rewrite, and the query-layer changes. This spec is
  what they are handed.
- **The read-path defects ticket 04 measured** — the N+1 club loop in `aiClubs.ts`, the
  O(players × positions) filter in `loadAllPlayersEcon`, and `computeStandings` reading the world to
  render one league. All three get far worse at world scale and none is a shape on disk. The index
  list is not out of scope, and is above.
- **Tuning constants**: the club-strength curve, the concrete calendar dates, and the base pack's
  names for the 382 club ids the catalogue implies. All are generation content.
- **The `MatchId`-to-`FixtureId` collapse in the RPC contract.** The keyspace is fixed here; changing
  `startMatch` to be fixture-addressed is a contracts and handler change.
- **Save format migration.** The map lists it as unspecified and "cheap to answer once the final
  table set is known". The table set is now known, so the question is answerable — but answering it
  is not this spec's job, and nothing here assumes either answer.
- **AI club behaviour, the cross-nation transfer market, club finances beyond the budget pair,
  continental competitions, national teams, youth and reserve squads, and promotion playoffs.** All
  remain on the map's unspecified list; none needs a table this spec does not define, and the playoff
  in particular is now an entrant rule rather than a new shape.

## Open questions

Four gaps that no resolved decision covers. None is invented an answer here; each is a place the map
did not reach, and each is small enough to settle in a ticket rather than by redrawing the map.

1. **The index for the calendar advance's date sweep.** Ticket 01 made
   `WHERE scheduled_date <= D AND played = 0` the hot per-Continue query, replacing the
   `(season_number, played)` scan ticket 04 measured. No decision prices an index for it, and the
   shipping `fixtures(competition_id, season_number, played)` index does not serve it — its leading
   column is the competition, and the sweep names none.
2. **The index for the membership join.** Ticket 02 recorded, as a risk, that "membership through
   participant rows costs a join on hot paths. No measurement backs the claim that this is
   affordable." The `competition_participants` primary key serves competition-keyed reads; the
   club-keyed read ("which competition is this club in this season") has no covering prefix, and no
   decision measured it.
3. **`player_transfers`' primary key and its player-keyed index.** Ticket 11 names five columns and
   no key. A player may transfer to the same club twice, so the named columns are not a key. The
   career-history read is player-keyed and ordered by date, against a table growing to ~640,000 rows
   over twenty seasons — the one table here with unbounded growth and no stated access path.
4. **Whether the paired-penalty invariant is a `CHECK`.** Ticket 06 states that NULL in both penalty
   columns means no shootout, but names no constraint. Every other pairing invariant in this spec is
   explicitly assigned to either a constraint or a writer; this one is assigned to neither.

## Further Notes

**Where the fidelity is knowingly thin.** Three gaps are visible to anyone who knows the sport, and
each was accepted for a stated reason rather than overlooked. Nations on a real spring-to-autumn
cycle ship on an August-to-May calendar, because per-nation cycles fragment `SeasonConcluded` and
become worth their cost only when cross-nation transfers exist. Cups have no extra time, no replays,
and no second legs, because the engine plays exactly two halves and its fatigue model is calibrated
on 90 minutes. A player managing the lowest loaded division can never be relegated, because the world
is closed at the edge of the chosen scope — and choosing a wider scope is how that player buys the
drop.

**What is destroyed and cannot be recovered.** Two decisions delete data irreversibly, and both are
worth carrying forward as constraints on later features rather than as footnotes. Background
competitions' past fixtures are deleted at rollover, so no screen can ever show a rival nation's
history and the frozen participant standings are all that remains. A club relegated into a
`results-only` tier has its player rows deleted, so player identity does not survive the round trip;
if a later effort ever makes results-only players visible, that deletion becomes user-visible data
loss and the depth decision must be reopened rather than patched.

**The one deliberate exception to the log's governing rule.** `ScoutingProgressed` restates a table,
which the rule "an event is appended only where it is the sole record of a fact" would otherwise
forbid. It is kept as the recovery path for a missed or double-fired matchday hook, and it costs
about forty rows a season because scouts exist only for the human's club.

**The curation this schema assumes and does not contain.** Roughly 480 hand-cut city rows across the
eight shipped nations, ~2,400 curated name-pool entries, and content-pack names for the 382 club ids
the catalogue implies. All three are on the critical path for a playable multi-nation world, all
three are human work, and none of them is a shape on disk.
