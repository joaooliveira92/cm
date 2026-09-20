# Group L reconciliation ledger

The specs in this directory are an **import**, not a set of requirements. They read as generated from a
generic template rather than authored against this game, and they routinely describe subsystems this
project has never decided to build. This ledger records, per screen, every place the import is
knowingly not followed, and why.

It is an index, not a store. A row states the divergence in one line and points at the decision that
carries it. The import files are never edited. Their value is that you can always see what arrived.

The format is the one the
[Group A ledger](../group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md) pilots,
with the same four kinds — `out-of-scope`, `contradicted`, `deferred`, `renamed` — and the same status
vocabulary.

## Transcribed, not re-adjudicated

**Written 2026-09-18 by transcribing rulings that already existed**, as milestone
[M1](../../../.ai/MILESTONES.md) step 1. The `group-l-competitions-nations-and-world-information`
effort charted the group on 2026-09-17 and shipped two screens, recording everything inside
`.scratch/`, which is cleared when an effort is archived.

**Two corrections were made in transcription**, and the second changes what rows say:

1. **The group has 20 screens, not 18.** The effort's `map.md` says "All 18 screens (161–180)" twice.
   161–180 is twenty files and twenty exist in this directory. The miscount does not appear to have
   dropped any screen from the survey — ticket 02 rules on all twenty — but the map's arithmetic is
   wrong and was carried into its own summary.
2. **Nothing in this group is `out-of-scope`.** Ticket 02 heads its third section *"Out of scope for
   v1"*, and the map's § Out of scope repeats it for the national-team screens. In this ledger's
   vocabulary that is `deferred`, not `out-of-scope`: `out-of-scope` means ruled permanently outside
   this game and cannot return, while a v1 exclusion is exactly the "wanted, in scope, not built"
   that `deferred` names. For screens 176–178 this is not a judgement call — a standing note
   **requires** it. See below.

## The national-team screens are `deferred`, and this is binding

The effort's map lists *"National team management as a playable system"* under § Out of scope.
[SPEC-ROADMAP.md](../../../.ai/SPEC-ROADMAP.md) states the opposite and cites the decision:

> **National teams and the job market are deferred, not ruled out** (decided 2026-09-13). Reconcile
> Group O, Group L 176–178 and Group N as `deferred` / `unscheduled`, never `out-of-scope`.

The note is
[national teams deferred, not ruled out](../../../.agents/notes/implemented/architecture/2026-09-13-national-teams-deferred-not-ruled-out.md),
dated four days **before** this group was charted. The map's wording contradicts a decision that
already bound it. The rows below follow the note; the map's phrasing is treated as loose use of "out
of scope for v1" rather than as an attempt to overturn it.

The distinction is not pedantic. `out-of-scope` rows are not revisited; `deferred` rows are. Group O
is a whole group resting on the same decision.

## What each status asserts

| Status | What silence about a section asserts |
|---|---|
| `Reviewed` | Nothing. The rows are the material conflicts a pass found; unlisted sections were not individually checked. |
| `Deferred in full` | The screen is wanted and not built. No section was ruled against; the whole file waits on a model this game does not have yet. |

`Audited` is unused in this group. No screen has had a section-by-section pass.

## Coverage

| Screen | Import file | Status |
|---|---|---|
| 161 Competition Overview | [161_competition_overview.md](161_competition_overview.md) | Reviewed — v1 scope, not built |
| 162 Competition Table | [162_competition_table.md](162_competition_table.md) | Reviewed — implemented 2026-09-17 |
| 163 Competition Fixtures | [163_competition_fixtures.md](163_competition_fixtures.md) | Reviewed — implemented 2026-09-17 |
| 164 Competition Results | [164_competition_results.md](164_competition_results.md) | Reviewed — v1 scope, not built |
| 165 Competition Statistics | [165_competition_statistics.md](165_competition_statistics.md) | Deferred in full |
| 166 Competition Player Statistics | [166_competition_player_statistics.md](166_competition_player_statistics.md) | Deferred in full |
| 167 Competition Team Statistics | [167_competition_team_statistics.md](167_competition_team_statistics.md) | Deferred in full |
| 168 Competition Rules | [168_competition_rules.md](168_competition_rules.md) | Deferred in full |
| 169 Competition Stages and Qualification | [169_competition_stages_and_qualification.md](169_competition_stages_and_qualification.md) | Deferred in full |
| 170 Competition Draw | [170_competition_draw.md](170_competition_draw.md) | Deferred in full |
| 171 Competition Awards | [171_competition_awards.md](171_competition_awards.md) | Deferred in full |
| 172 Competition History | [172_competition_history.md](172_competition_history.md) | Deferred in full |
| 173 Competition Records | [173_competition_records.md](173_competition_records.md) | Deferred in full |
| 174 Nation Overview | [174_nation_overview.md](174_nation_overview.md) | Deferred in full |
| 175 Nation Competitions | [175_nation_competitions.md](175_nation_competitions.md) | Deferred in full |
| 176 National Team Overview | [176_national_team_overview.md](176_national_team_overview.md) | Deferred in full |
| 177 National Team Squad | [177_national_team_squad.md](177_national_team_squad.md) | Deferred in full |
| 178 International Fixtures and Results | [178_international_fixtures_and_results.md](178_international_fixtures_and_results.md) | Deferred in full |
| 179 World Rankings | [179_world_rankings.md](179_world_rankings.md) | Deferred in full |
| 180 World Football Overview | [180_world_football_overview.md](180_world_football_overview.md) | Deferred in full |

Ticket references below are deliberately unlinked: they live under `.scratch/`, which is cleared when
an effort is archived, and this ledger outlives the effort that produced it.

## The binding constraint is the contract layer

Ticket 01's survey is the fact the whole group rests on: of the twenty screens, **eleven had routes
carrying 15-line `<h1>` stubs and seven had no route at all**. Not one was blocked on presentation.
`packages/shared`, `packages/contracts` and `packages/game-engine` held no model, RPC schema or
simulation code for competition statistics, stages, draws, awards, history, records, world rankings
or nation football data.

Every `Deferred in full` row below reduces to that one sentence: the screen waits on a model, not on a
screen. Where a row adds a reason beyond it, the reason is the effort's own.

## Screens 162 and 163: what shipped, and what it diverges from

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| [163_competition_fixtures.md](163_competition_fixtures.md), unplayed fixtures | `contradicted` | An unplayed Fixture presents with a score placeholder. | It reads **Unplayed** and is never given a fabricated `0 - 0`. The word "scheduled" was rejected because [CONTEXT.md](../../../CONTEXT.md) lists *Schedule* as an _Avoid_ term. Both fixture lists were brought into line by ticket 05. | Ticket 04. The group index's own requirement — background-depth leagues must present "without fabricated information" — points the same way. |
| [163_competition_fixtures.md](163_competition_fixtures.md), coverage tiers | `renamed` | Per-competition coverage tiers governing how much detail a Fixture list shows. | This game has **Simulation Depth** instead, which is not the same axis and is chosen at career setup rather than per competition. The import's tiers are not implemented as tiers. | **Simulation Depth** in [CONTEXT.md](../../../CONTEXT.md). Ticket 06. |
| [163_competition_fixtures.md](163_competition_fixtures.md), §filters, round and stage navigation, calendar navigation, export | `deferred` | Filtering the fixture list, navigating by round or stage, navigating by calendar date, and exporting it. | None enters v1. Each needs data the game does not model — rounds and stages presuppose multi-stage competitions (Screen 169), and export overlaps Group S. | `unscheduled`. Ticket 06 ruled the whole deferred surface in one pass. |
| [162_competition_table.md](162_competition_table.md), whole file | `renamed` | A competition standings table. | Shipped as `getCompetitionTable`, folding the same `computeStandings` the human's own **League Table** uses. Scoped by `competitionId` rather than widening `getLeagueTable`. | Ticket 03. |

Ticket 04 scoped `getCompetitionFixtures` by `competitionId` rather than widening `getFixtures`,
which stays deliberately the human's own calendar; the shared SQL was extracted into
`fixturesForCompetition` so the two reads cannot drift.

**One defect class was opened by this group and outlived it.** Review of ticket 04 caught the new RPC
omitting `PendingFixtureIntegrityError` from its declared error union — invisible to `typecheck`
because the handler is typed `Effect<unknown, unknown>`, so an error the handler raises reaches the
renderer raw. Ticket 05 audited every method in `AppRpcs` against its declared error schema and found
**11 mismatches, 8 fixed**; `ManagerProfileNotFoundError` was schema'd and raisable while named by no
union at all. Three classes stay open — `SqlError` across nearly every save-scoped handler, engine
invariant errors, and payload `SchemaError` — carried by group-l decision request 01. An
`effect-lint` rule was rejected as the wrong tool, because the needed fact is a type rather than a
syntax pattern.

## Screens 161 and 164: both shipped

Both are `Reviewed` and carry no divergence row. Ticket 02 put them in v1 scope and ticket 06 set the
order — 164 next, reusing `getCompetitionFixtures` rather than adding a third fixture read, then 161.
Their `Reviewed` silence asserts nothing about what the import asks of them.

**Both shipped 2026-09-20.** 164 ([ticket 07](../../../.scratch/group-l-competitions-nations-and-world-information/issues/07-competition-results.md)),
reusing the read as instructed. Attendance, player-of-the-match and tactical summary are not built
and have no model — the same three the [Group C ledger](../group_c_club_information/RECONCILIATION.md)
`deferred`s for Screen 41.

**Two properties of the branch, found building it and true of 162 and 163 as well:**

- **~~Nothing in the app reaches any of them.~~ Half-fixed.** Screen 161 shipped as the branch's
  landing page and links to 162, 163 and 164, so those three are now reachable. What reaches **161**
  is the World section's Competitions entry, which is still a WIP placeholder — owed to
  [ticket 09](../../../.scratch/group-l-competitions-nations-and-world-information/issues/09-cull-the-group-l-placeholders.md).

  161 carries a read of its own, `getCompetitionOverview`, because no other view names a
  competition and a hub composed from its siblings could not title itself. It returns identity,
  season and card counts and **no rows**, so the three screens that own those keep owning them.
- **They show the current Season only**, inheriting `getCompetitionFixtures`' season scope. A
  rollover empties Competition Results, and Screen 172 Competition History is `deferred`, so a past
  season's results are currently visible nowhere.

## Deferred in full

Eleven screens wait on a model. Grouped because the disposition is identical and only the missing
model differs; all are ticket 02, and each Anchor is `unscheduled` unless stated.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| [165_competition_statistics.md](165_competition_statistics.md), whole file | `deferred` | Aggregate statistics across a competition. | Nothing aggregates. Not needed for league simulation to be playable. | `unscheduled`. Group P owns the statistics axis. |
| [166_competition_player_statistics.md](166_competition_player_statistics.md), whole file | `deferred` | Per-player statistics aggregated across a competition. | Needs per-player aggregation that does not exist — the same absent model as [Group D Screen 54](../group_d_player_and_staff_records/54_player_statistics.md). | `unscheduled`, Group P owns the store — [per-player statistics are deferred, not ruled out](../../../.agents/notes/proposed/architecture/2026-09-19-per-player-statistics-deferred-not-ruled-out.md). This row's kind was confirmed and Group D's was corrected to match. |
| [167_competition_team_statistics.md](167_competition_team_statistics.md), whole file | `deferred` | Team-level statistics across a competition. | Same absent aggregation. | `unscheduled`. |
| [168_competition_rules.md](168_competition_rules.md), whole file | `deferred` | A competition's rules, presented as reference. | Needs a rules data model. Competitions carry their format implicitly in the fixture generator, not as stated rules. | `unscheduled`. Overlaps Group S Screen 274. |
| [169_competition_stages_and_qualification.md](169_competition_stages_and_qualification.md), whole file | `deferred` | Multi-stage competitions, group phases, and qualification paths. | Only relevant once competitions exist beyond single round-robin plus cup. | `unscheduled`. |
| [170_competition_draw.md](170_competition_draw.md), whole file | `deferred` | A cup draw, presented as an event. | **Cup Tie** exists; the draw that produces one is not a surfaced event. | `unscheduled`. |
| [171_competition_awards.md](171_competition_awards.md), whole file | `deferred` | Competition awards and their winners. | No awards system exists. | `unscheduled`. Group Q owns awards. |
| [172_competition_history.md](172_competition_history.md), whole file | `deferred` | Past seasons of a competition, winners and tables. | No history persistence. | `unscheduled`. The same persisted-history gap that defers [Group C 43–45](../group_c_club_information/43_club_history.md) and [Group D Screen 55](../group_d_player_and_staff_records/55_player_history.md). |
| [173_competition_records.md](173_competition_records.md), whole file | `deferred` | Competition records — highest scores, longest runs. | No records tracking. | `unscheduled`. Same persisted-history gap. |
| [174_nation_overview.md](174_nation_overview.md), whole file | `deferred` | A Nation's football profile: pyramid, competitions, clubs, standing. | **Nation**, **Pyramid** and **Tier** are modelled and the data partly exists from `active-leagues-setup` and `world-data-model`. No screen reads it. | `unscheduled`. This is the cheapest of the eleven — the model is largely there. |
| [175_nation_competitions.md](175_nation_competitions.md), whole file | `deferred` | The competitions within a Nation. | Data exists partially. No screen reads it. | `unscheduled`. Cheap for the same reason as 174. |

## Deferred because national teams and world football are not v1

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| [176_national_team_overview.md](176_national_team_overview.md), whole file | `deferred` | Managing a national team: overview and standing. | No national-team concept, no international calendar, no national squad management. Nations exist as data with generated squads; nothing manages them. | [National teams deferred, not ruled out](../../../.agents/notes/implemented/architecture/2026-09-13-national-teams-deferred-not-ruled-out.md). Group O owns the axis. **Never `out-of-scope`.** |
| [177_national_team_squad.md](177_national_team_squad.md), whole file | `deferred` | A national team squad and its selection. | Same dependency. | Same note. |
| [178_international_fixtures_and_results.md](178_international_fixtures_and_results.md), whole file | `deferred` | International fixtures and their results. | Same dependency. There is no international match calendar. | Same note. |
| [179_world_rankings.md](179_world_rankings.md), whole file | `deferred` | Global rankings of nations or clubs. | Needs a ranking formula and global aggregation, and has no referent in this game's domain — nothing ranks anything across the world. | `unscheduled`. Ticket 02, as "out of scope for v1"; recorded `deferred` per this ledger's vocabulary. |
| [180_world_football_overview.md](180_world_football_overview.md), whole file | `deferred` | A landing hub for the global game. | No purpose without the world-level features it would aggregate — 176–179, all deferred. | `unscheduled`. Ticket 02. Becomes meaningful only if those land. |

## What this ledger leaves owed

- ~~**Group D and Group L disagree about the same missing model.**~~ **Settled 2026-09-19**: this
  ledger's `deferred` was right and Group D Screen 54 was corrected to match. Recorded as
  [per-player statistics are deferred, not ruled out](../../../.agents/notes/proposed/architecture/2026-09-19-per-player-statistics-deferred-not-ruled-out.md).
  Group P owns the store, and these rows are its dependents rather than its contradictions.
- **group-l decision request 01 (RPC error channel) is open** and blocks nothing. It carries the three
  unresolved error classes from ticket 05's audit: `SqlError` across save-scoped handlers, engine
  invariant errors, and payload `SchemaError`. The permanent gate ticket 05 wanted — the audit probe
  as a type alias — is blocked only by `SqlError`.
- ~~**Screens 161 and 164 are in v1 with no ticket.**~~ **Filed 2026-09-19** as
  [ticket 07](../../../.scratch/group-l-competitions-nations-and-world-information/issues/07-competition-results.md)
  and [ticket 08](../../../.scratch/group-l-competitions-nations-and-world-information/issues/08-competition-overview.md),
  in ticket 06's order — 164 first, then 161, which composes it.
- ~~**Eleven screens are deferred and keep their WIP placeholders**, plus seven that never had a route.~~
  **Culled 2026-09-20** ([ticket 09](../../../.scratch/group-l-competitions-nations-and-world-information/issues/09-cull-the-group-l-placeholders.md)).
  **Eighteen** placeholders deleted with their routes, screen-scope entries and action rows — eight
  competition drill-downs and the whole ten-screen nation branch, whose parent route,
  `CareerNationChildView` and URL-segment map went with it, since nothing was left to route to.

  **The discriminator, stated once and applied to all of them:** a `deferred` screen keeps its stub
  when it is *waiting on a live piece of work*, and loses it when it is merely wanted some day. Not
  one of the eighteen was waiting on anything in progress — statistics wait on Group P, history on
  Group Q, national teams on Group O, and none of those is started. Group C set the precedent both
  ways: `clubSquadDetail` kept its stub because a decision request is live; `clubReservesDetail`
  lost its because a v1 exclusion is not work in progress.

  **Three survived, and for a different reason.** `competitions/`, `nations/` and `clubs/` are the
  World section's **live nav destinations**, not URL-only stubs, so deleting them would take three
  entries out of the navbar. They are
  [ticket 10](../../../.scratch/group-l-competitions-nations-and-world-information/issues/10-the-world-section-lands-on-three-placeholders.md) —
  the same shape as the Club → Staff defect, three times over, and the reason Screen 161 is still
  reachable only by address.

  The seven screens that never had a route still have none, and now that is the only thing true of
  them: nothing was culled for 165, 169–171, 176–178 because there was nothing there.

  Filed 2026-09-19 as
  [ticket 09](../../../.scratch/group-l-competitions-nations-and-world-information/issues/09-cull-the-group-l-placeholders.md),
  which carries the discriminator Group C arrived at by answering the same question twice in
  opposite directions: a `deferred` screen keeps its stub when it is **waiting on a live piece of
  work** (`clubSquadDetail`, blocked on a decision request) and loses it when it is merely wanted
  some day (`clubReservesDetail`, whose model is excluded from v1). Ticket 09 also inherits
  `clubs/`, which group-c ticket 09 ruled to be this group's.
