# Group D reconciliation ledger

The specs in this directory are an **import**, not a set of requirements. They read as generated from a
generic template rather than authored against this game, and they routinely describe subsystems this
project has never decided to build. This ledger records, per screen, every place the import is
knowingly not followed, and why.

It is an index, not a store. A row states the divergence in one line and points at the decision that
carries it. The import files are never edited. Their value is that you can always see what arrived.

The format is the one the
[Group A ledger](../group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md) pilots;
that file is the fuller worked example, and its four kinds and status vocabulary are used unchanged
here.

## Transcribed, not re-adjudicated

**This ledger was written on 2026-09-18 by transcribing rulings that already existed**, as milestone
[M1](../../../.ai/MILESTONES.md) step 1. The `group-d-player-and-staff-records` effort charted and
disposed all 19 screens on 2026-09-14 and shipped three of them, but recorded every ruling inside
`.scratch/`, which is cleared when an effort is archived. Nothing outside that directory said that
eleven Group D screens had been disposed. This file is where those rulings now live.

Two consequences follow, and both matter when reading a row:

- **No row here is new.** Each carries the effort's own rationale and cites the decision ticket that
  made it. Where the effort's reasoning was thin, it is transcribed thin rather than improved — a
  reconstructed justification would be worse than a visible one.
- **These are whole-screen dispositions, not section-by-section audits.** The effort ruled on
  files, so the Sections column cites whole files. No screen in this group is `Audited`, and the
  status table below says exactly what each status does and does not assert.

**One correction was made in transcription.** The effort's `map.md` summarises ticket 04 as "3
satisfied-inline (51, 52, 53)" and "2 deferred (55, 62, 68)". Ticket 04's own disposition table says
53 Player Form is `out-of-scope`, and lists three deferred screens, not two. The ticket's table is
authoritative and the summary miscounts; the rows below follow the ticket. The arithmetic now closes:
4 out-of-scope + 2 renamed + 10 deferred + 3 implemented = 19.

**Six rows were re-kinded after transcription**, which is why the counts above are not ticket 04's:
Screens 53, 54, 58, 59, 60 and 63 moved from `out-of-scope` to `deferred` on 2026-09-19. Screen 58 under
[a v1 exclusion is `deferred`](../../../.agents/notes/proposed/process/2026-09-19-a-v1-exclusion-is-deferred-not-out-of-scope.md); the other five under the absence-of-a-model rule. Every one
of the six was ruled out for lacking a model rather than on principle — none of them for a stated
reason the thing should not exist. What survives as `out-of-scope` is Screens 64–67, where the closed
role set says what Staff *are*.

## How to read a row

Rows use the [Group A ledger](../group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md)'s
fields — Sections, Kind, What the spec asks, Disposition, Anchor — and its four kinds:
`out-of-scope`, `contradicted`, `deferred`, `renamed`.

**The effort's own word `satisfied-inline` is not a fifth kind.** It maps onto `renamed`: the concept
exists here, the behaviour agrees, and only the surface differs — the Squad table's toggleable
columns rather than a dedicated screen. Both screens it applies to are recorded that way.

### What each status asserts

| Status | What silence about a section asserts |
|---|---|
| `Disposed in full` | Nothing is owed. The screen was ruled out as a whole file and its one row disposes of every section. |
| `Reviewed` | Nothing. The rows are what a whole-file pass found; no section was individually checked. |

`Audited` is unused in this group. A screen here has either been disposed whole or shipped without a
section-by-section pass, and marking one `Audited` would assert a pass nobody made.

## Coverage

| Screen | Import file | Status |
|---|---|---|
| 50 Player Profile | [50_player_profile.md](50_player_profile.md) | Reviewed — implemented 2026-09-14 |
| 51 Player Attributes | [51_player_attributes.md](51_player_attributes.md) | Disposed in full |
| 52 Player Positions | [52_player_positions.md](52_player_positions.md) | Disposed in full |
| 53 Player Form | [53_player_form.md](53_player_form.md) | Deferred in full |
| 54 Player Statistics | [54_player_statistics.md](54_player_statistics.md) | Deferred in full — to Group P |
| 55 Player History | [55_player_history.md](55_player_history.md) | Disposed in full |
| 56 Player Contract | [56_player_contract.md](56_player_contract.md) | Reviewed — implemented 2026-09-14 |
| 57 Player Transfer Status | [57_player_transfer_status.md](57_player_transfer_status.md) | Disposed in full |
| 58 Player Happiness | [58_player_happiness.md](58_player_happiness.md) | Deferred in full — v1 exclusion |
| 59 Player Injuries | [59_player_injuries.md](59_player_injuries.md) | Deferred in full |
| 60 Player Discipline | [60_player_discipline.md](60_player_discipline.md) | Deferred in full |
| 61 Player Development and Training Effects | [61_player_development_and_training_effects.md](61_player_development_and_training_effects.md) | Reviewed — implemented 2026-09-14 |
| 62 Player Action Menu | [62_player_action_menu.md](62_player_action_menu.md) | Disposed in full |
| 63 Player Comparison | [63_player_comparison.md](63_player_comparison.md) | Deferred in full |
| 64 Staff Profile | [64_staff_profile.md](64_staff_profile.md) | Disposed in full |
| 65 Staff Contract | [65_staff_contract.md](65_staff_contract.md) | Disposed in full |
| 66 Staff History | [66_staff_history.md](66_staff_history.md) | Disposed in full |
| 67 Coach Report | [67_coach_report.md](67_coach_report.md) | Disposed in full |
| 68 Scout Report | [68_scout_report.md](68_scout_report.md) | Disposed in full |

Ticket references below are deliberately unlinked: they live under `.scratch/`, which is cleared when
an effort is archived, and this ledger outlives the effort that produced it.

## The five staff screens

Screens 64–68 are disposed as one ruling applied five times, by group-d ticket 02.

The import assumes an open staff roster a manager hires, reviews and contracts with. This project
fixed a **closed role set** instead: [`CONTEXT.md`](../../../CONTEXT.md) defines **Bound Staff**
(Coach, Scout) and **Presence Staff** (President, Physio), every club holds exactly one of each, and
no surface hires, fires or renegotiates any of them. There is no staff record to profile, no staff
contract to show, and no staff career to list.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| [64_staff_profile.md](64_staff_profile.md), whole file | `out-of-scope` | A profile screen per staff member: identity, role, attributes, history and current job. | No screen. A club's Staff appear only as the four named people on [Screen 38 Club Staff](../group_c_club_information/38_club_staff.md), which shows name and role and nothing else. | Closed role set — **Bound Staff** and **Presence Staff** in [CONTEXT.md](../../../CONTEXT.md). Every club holds one of each and none is hired, so there is no record to profile. Ticket 02. |
| [65_staff_contract.md](65_staff_contract.md), whole file | `out-of-scope` | Staff contract terms, wages, expiry, and renewal. | Staff hold no **Contract**. Only Players do. | Same closed role set. Ticket 02. |
| [66_staff_history.md](66_staff_history.md), whole file | `out-of-scope` | A staff member's career history across clubs. | Not modelled. Bound Staff rows exist only for clubs that are or have been the human's, and carry no prior employment. | Same closed role set. Ticket 02. |
| [67_coach_report.md](67_coach_report.md), whole file | `out-of-scope` | A Coach's written assessment of a player's ability and potential. | No counterpart exists, and none is planned. The **Coach** affects **Technical Coaching** and Regimen; it produces no report. | Ticket 02 — "no counterpart". Note that `PlayerCoachReportScreen.tsx` exists in the renderer and belongs to Group H's training work, not to this screen. |
| [68_scout_report.md](68_scout_report.md), whole file | `deferred` | A per-player scout report: scouted knowledge, ability and potential estimates, recommendation. | No dedicated screen. A Player's scouted knowledge already surfaces as **Attribute Range** values inline wherever that Player is shown, so the information is reachable and only the report surface is missing. | `unscheduled`, and blocked on Group I decision request 01 (knowledge-limited player reads). The club-level equivalent shipped as **Team Scout Report** (Screen 49). Ticket 02. |

## Screens resting on systems this game does not have yet

Five screens are **deferred** because the system they display has never been built. Grouped because
the ruling is the same shape each time: there is no model, so there is nothing to render.

**All five were re-kinded from `out-of-scope` on 2026-09-19.** Group D's effort ruled them out for the
absence of a model, which is a statement about today rather than about the game. Each names the model
that would bring it back.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| [58_player_happiness.md](58_player_happiness.md), whole file | `deferred` | Player morale, mood, and dressing-room relationships, with the manager acting on them. | No morale model. Nothing computes, stores or displays how a Player feels. | `v1 exclusion — CONTEXT.md:753`, the **Influence** pillar. [A v1 exclusion is `deferred`](../../../.agents/notes/proposed/process/2026-09-19-a-v1-exclusion-is-deferred-not-out-of-scope.md), 2026-09-19. Ticket 03 ruled this `out-of-scope`. |
| [60_player_discipline.md](60_player_discipline.md), whole file | `deferred` | Card accumulation, suspensions, bans and disciplinary history. | Cards are **Match Event**s within a match. Nothing accumulates them across matches, and no Player is ever suspended. | `unscheduled` — no card-accumulation or ban model. Re-kinded 2026-09-19 under [absence of a model is `deferred`](../../../.agents/notes/proposed/architecture/2026-09-19-per-player-statistics-deferred-not-ruled-out.md); ticket 03 ruled it `out-of-scope`. Group G's Screen 104 rests on the same absent model. |
| [63_player_comparison.md](63_player_comparison.md), whole file | `deferred` | Side-by-side comparison of two or more players across attributes. | No comparison mechanism exists on any surface. | `unscheduled`. Re-kinded 2026-09-19 under [absence of a model is `deferred`](../../../.agents/notes/proposed/architecture/2026-09-19-per-player-statistics-deferred-not-ruled-out.md); ticket 03 ruled it `out-of-scope`. |
| [53_player_form.md](53_player_form.md), whole file | `deferred` | Recent form: a rolling window of the last N matches, with ratings and a trend. | Requires a per-Player match-rating history that is not modelled, and no shipped feature depends on it. | `unscheduled` — ticket 04, "a dedicated effort if needed". Re-kinded 2026-09-19 under [absence of a model is `deferred`](../../../.agents/notes/proposed/architecture/2026-09-19-per-player-statistics-deferred-not-ruled-out.md). Needs a per-Player match *rating* history, which Group P's store may or may not supply. |
| [59_player_injuries.md](59_player_injuries.md), whole file | `deferred` | A Player's injury history: past injuries, durations, recurrence and proneness over time. | **Injury** is a per-match event with no durable per-Player record. **Injury Proneness** exists as an Attribute, but nothing accumulates what happened to a Player. | `unscheduled` — ticket 04: building the record is a data-modelling effort not justified by current needs. Re-kinded 2026-09-19 under [absence of a model is `deferred`](../../../.agents/notes/proposed/architecture/2026-09-19-per-player-statistics-deferred-not-ruled-out.md). Group E Screen 77's availability half needs the same record. |

All five are revisitable, and two have a named dependency worth watching: Screen 53 needs a per-Player
match *rating* history and Screen 59 a durable injury record, which Group E Screen 77's availability
half also waits on. Screens 58 and 60 return if **Influence** or a discipline model enters scope.

## Screen 54: deferred, and re-kinded

**Changed 2026-09-19.** Group D ticket 01/03 ruled this `out-of-scope`; it is now `deferred`.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| [54_player_statistics.md](54_player_statistics.md), whole file | `deferred` | Per-player aggregated statistics: appearances, goals, assists, averages, by season and competition. | Nothing aggregates per-Player match output. Match statistics exist per match and are never rolled up. | `unscheduled`, Group P owns the store — [per-player statistics are deferred, not ruled out](../../../.agents/notes/proposed/architecture/2026-09-19-per-player-statistics-deferred-not-ruled-out.md). |

The reason for the change: [Group L Screen 166](../group_l_competitions_nations_and_world_information/166_competition_player_statistics.md)
was `deferred` for lacking the *same* model this screen was `out-of-scope` for lacking, and both
ledgers cannot be right. `out-of-scope` is the ruling that is never revisited, and neither effort gave
a reason the model should never exist — only that it does not. Absence of a model is `deferred`.

## Screens whose surface exists elsewhere

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| [51_player_attributes.md](51_player_attributes.md), whole file | `renamed` | A dedicated screen listing a Player's full **Attribute** set. | Every Attribute is a toggleable column on the Squad table. The data is complete and reachable; only the dedicated screen is absent, and one carrying no new data would add nothing. | **Attribute** in [CONTEXT.md](../../../CONTEXT.md). Ticket 04, as `satisfied-inline`. The WIP placeholder route is owed removal — see below. |
| [52_player_positions.md](52_player_positions.md), whole file | `renamed` | A dedicated screen for positional ability and familiarity. | Shown in the Squad position list and as a Squad table column. Same reasoning as 51. | **Position Rating** in [CONTEXT.md](../../../CONTEXT.md). Ticket 04, as `satisfied-inline`. |

## Screens wanted but not built

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| [55_player_history.md](55_player_history.md), whole file | `deferred` | A Player's career timeline: clubs, seasons, transfer dates, appearances per club. | Not built. It needs the sequence of Contracts and transfers a Player passes through to be modelled and persisted, which nothing does today. | `unscheduled`. Related to Season Summary and to Group C 43–45, which need the same persisted history. Ticket 04. |
| [62_player_action_menu.md](62_player_action_menu.md), whole file | `deferred` | One unified menu of every action available on a Player, reachable from any surface showing that Player. | Not built. The actions exist and are reachable, each through its own specific surface; what is missing is the single composed menu. | `unscheduled` — ticket 03, restated by ticket 04: a unified menu is worth building once the action set is stable. Ticket 04. |

## The three screens that shipped

Screens 50, 56 and 61 were ruled `needs-design` by ticket 04 and built on 2026-09-14 (tickets 05–08,
which added the `getPlayerProfile` and `getPlayerContract` RPCs, their handlers and renderer atoms).

They carry **no divergence rows**, and that silence asserts nothing. Their status is `Reviewed`: the
screens were designed against the domain rather than against the import, and no section-by-section
pass was ever made over what the import asks of them. A later audit of any of the three is expected to
add rows.

| Screen | What shipped | Where |
|---|---|---|
| 50 Player Profile | Identity, positions, attributes, club, contract summary and injury status, reached by drilling into a Squad row. | `renderer/playerProfile/`, `getPlayerProfile` |
| 56 Player Contract | Wage, length, signing and expiry dates. | `renderer/playerContract/`, `getPlayerContract` |
| 61 Player Development and Training Effects | Training focus management, at `player/$playerId/development`. | `renderer/playerDevelopment/`, `setTrainingFocus` |

Screen 61's underlying model is recorded in
[deterministic Player Development](../../../.agents/notes/implemented/feature/2026-08-28-deterministic-fractional-player-development.md).

## What this ledger leaves owed

Transcription surfaced work that the effort identified and never ticketed. It is recorded here so it
is not lost a second time, and it is owed to milestone [M1](../../../.ai/MILESTONES.md) step 5:

**~~Screens this ledger disposes still have routed WIP placeholders.~~ The player half is done,
2026-09-19** ([ticket 09](../../../.scratch/group-d-player-and-staff-records/issues/09-cull-the-player-placeholders.md)).
Ticket 04 said the satisfied-inline and deferred screens "can be ticketed as instructions to remove
their WIP route stubs", and no such ticket was ever filed. The five player folders that map
one-to-one onto disposed screens are now deleted with their routes, their `PLAYER_SCOPED_SCREENS`
entries, their action-registry rows and their URL-segment mappings: `renderer/playerAttributes/` (51),
`playerForm/` (53), `playerHistory/` (55), `playerInjuries/` (59), `playerScoutReport/` (68).

Four of the five were `deferred` rather than `out-of-scope`, and deleting them is not a re-ruling.
A `deferred` screen returns as a *real* screen once its model exists; what a placeholder does
meanwhile is assert in the nav and the route list that the screen is merely unfinished, which is
indistinguishable from nearly-done. This ledger is the durable record of "wanted later" — that is
what makes the stub redundant rather than load-bearing.

**`renderer/playerCoachReport/` was examined and is not one of them.** The name invites the guess —
Group D Screen 67 is Coach Report — but that folder is Group H's Screen 113 Performance Report, a
built screen reading `getSquad` and `getPlayerDevelopmentHistory`. It carries no `WIP` marker, which
is why M1's own grep never listed it. Screen 67 was never built at all. Noted here because the next
reader will make the same guess.

Two `player*` WIP screens remain in the renderer and neither is this group's: `playerSearch/` is
Group I's Screen 120, and `competitionPlayerStats/` and `nationPlayers/` are Group L's.

**~~The staff placeholders need a decision rather than a deletion.~~ Ruled 2026-09-19**
([ticket 10](../../../.scratch/group-d-player-and-staff-records/issues/10-rule-on-the-staff-placeholders.md)).
They did not map one-to-one onto screens 64–68: the renderer carried `staffProfile/`,
`staffContract/`, `staffHistory/`, `staffJobInfo/`, `staffOverview/` and `staffAttributes/`, and only
the first three corresponded to a Group D screen. (`staffSearch/` is Group I's Screen 120 and was not
this group's to touch.)

Five are deleted and one is not. The whole `staff/$staffId` route branch went with them — no
per-staff surface survives, so its parent route, its URL-segment map and its entry in
`screenIdOfPath` are gone too.

| Folder | Screen | Ruling |
|---|---|---|
| `staffProfile/` | 64 | `out-of-scope` — the closed role set. Deleted. |
| `staffContract/` | 65 | `out-of-scope` — **Staff never touch Contract or Wage Budget** ([CONTEXT.md](../../../CONTEXT.md)). Deleted. |
| `staffHistory/` | 66 | `out-of-scope` — Staff are *fixed for the life of a career*: they neither develop, age, nor turn over, so there is no history to show. Deleted. |
| `staffAttributes/` | none | `out-of-scope`, first ruled here. A Coach carries a single quality number, not an Attribute sheet, and cannot develop — so the screen has no subject rather than a missing model. Deleted. |
| `staffJobInfo/` | none | `out-of-scope`, first ruled here. "Job information" means employment terms, and there are no Staff wages, no hiring and no firing. Deleted. |
| `staffOverview/` | none | `deferred` — **kept**. See below. |

The two unmapped deletions are not the cull overreaching. Both are *more* detailed per-staff surfaces
than 64–66, which are already `out-of-scope` under a ruling about what Staff **are**; a screen that
needs Staff to be a developing entity with a contract is disposed by the same sentence that disposed
the profile.

### `staffOverview` is `deferred`, and is the one real finding here

It answers to no import screen, but unlike the other five it is **a live navbar destination**: the
Club section's *Staff* entry points at it. So the nav offers the player a screen called Staff and
delivers a WIP placeholder — while the real club staff roster **already exists**, shipped as
`clubStaff` at `club/$clubId/staff`.

Deleting it would remove a nav entry the game wants; leaving it silent would leave the nav lying.
It is `deferred` with an owner: making it real means resolving the *own* club and rendering the
roster `clubStaff` already renders, and `destinations.ts` records that `clubStaff` is club-scoped and
so cannot itself be a nav destination. Its three Club-section siblings — `clubInfo`, `finances`,
`boardConfidence` — are placeholders for the same reason, and that whole section is Group C's
remainder, milestone [M1](../../../.ai/MILESTONES.md) step 3.

**Anchor:** Group C's club-information remainder (M1 step 3), which owns the Club section.

A disposed screen that keeps its placeholder is indistinguishable, in a route list, from one that is
merely unbuilt — which is the confusion M1 exists to end. `staffOverview` is the second kind, and is
now labelled as such.
