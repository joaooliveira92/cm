# Group E reconciliation ledger

The specs in this directory are an **import**, not a set of requirements. They read as generated from a
generic template rather than authored against this game, and they routinely describe subsystems this
project has never decided to build. This ledger records, per screen, every place the import is
knowingly not followed, and why.

It is an index, not a store. A row states the divergence in one line and points at the decision that
carries it. The import files are never edited. Their value is that you can always see what arrived.

The format is the one the
[Group A ledger](../group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md) pilots,
with the same four kinds — `out-of-scope`, `contradicted`, `deferred`, `renamed` — and the same status
vocabulary. The [Group D ledger](../group_d_player_and_staff_records/RECONCILIATION.md) is the nearer
model: like this one, it transcribes whole-screen rulings rather than section-by-section audits.

## Transcribed, not re-adjudicated

**Written 2026-09-18 by transcribing a ruling that already existed**, as milestone
[M1](../../../.ai/MILESTONES.md) step 1. The `group-e-squad-management` effort surveyed all 11 screens
on 2026-09-14 in a single ticket and then closed, recording the result only inside `.scratch/`, which
is cleared when an effort is archived.

The whole group rests on **one ticket's survey table**. That is thinner evidence than Group D's four
decision tickets, and the rows below are no stronger than that survey. Where a ruling turns on "no
system exists", the survey checked the schema and the renderer and said so; where it turns on
judgement, there is no recorded argument to cite, and the Anchor says as much rather than inventing
one.

**One correction was made in transcription.** [SPRINT-PLAN.md](../../../.ai/SPRINT-PLAN.md) records
this effort as "11 screens charted, all disposed". That is not what the survey says. Three screens are
**satisfied by shipped code**, two are **partial**, and six were `out-of-scope`. Nothing was disposed
about 69, 70 and 72 — they are built and working, which is the opposite of disposed.

**A second correction followed on 2026-09-19**: every one of those six is now `deferred`. Screens 78
and 79 under [a v1 exclusion is `deferred`](../../../.agents/notes/proposed/process/2026-09-19-a-v1-exclusion-is-deferred-not-out-of-scope.md), and 73, 74, 76 and Screen 77's eligibility half
under the absence-of-a-model rule. **No screen in Group E is `out-of-scope`** — each was ruled out for
a model this game lacks, not for a reason the thing should not exist.

## What each status asserts

| Status | What silence about a section asserts |
|---|---|
| `Deferred in full` | The screen is wanted and not built. Its one row covers every section. |
| `Reviewed` | Nothing. The rows are what a whole-file survey found; no section was individually checked. |

`Audited` is unused in this group, and the distinction matters more here than in Group D: three
screens are marked satisfied on the strength of a feature survey, not a read of what the import asks
of them. A `Reviewed` screen can hide a followed-or-not question that an `Audited` screen cannot.

## Coverage

| Screen | Import file | Status |
|---|---|---|
| 69 Squad Selection | [69_squad_selection.md](69_squad_selection.md) | Reviewed — satisfied by the shipped Squad screen |
| 70 Squad View Selector | [70_squad_view_selector.md](70_squad_view_selector.md) | Reviewed — satisfied by the shipped Squad screen |
| 71 Selection Filters | [71_selection_filters.md](71_selection_filters.md) | Reviewed — partial |
| 72 Player Sorting | [72_player_sorting.md](72_player_sorting.md) | Reviewed — satisfied by the shipped Squad screen |
| 73 Shirt Number Assignment | [73_shirt_number_assignment.md](73_shirt_number_assignment.md) | Deferred in full |
| 74 Captain Selection | [74_captain_selection.md](74_captain_selection.md) | Deferred in full |
| 75 Set Piece Takers | [75_set_piece_takers.md](75_set_piece_takers.md) | Deferred in full — to Group F Screen 86 |
| 76 Squad Registration | [76_squad_registration.md](76_squad_registration.md) | Deferred in full |
| 77 Availability and Eligibility | [77_availability_and_eligibility.md](77_availability_and_eligibility.md) | Reviewed — partial |
| 78 Player Interaction and Grievance | [78_player_interaction_and_grievance.md](78_player_interaction_and_grievance.md) | Deferred in full — v1 exclusion |
| 79 Team Meeting and Discipline Decision | [79_team_meeting_and_discipline_decision.md](79_team_meeting_and_discipline_decision.md) | Deferred in full — v1 exclusion |

Ticket references below are deliberately unlinked: they live under `.scratch/`, which is cleared when
an effort is archived, and this ledger outlives the effort that produced it.

## The Squad screen carries four screens

Screens 69–72 all describe the same surface, and the shipped Squad screen
(`apps/desktop/src/renderer/squad/`) is that surface. The import splits selection, view choice,
filtering and sorting into four files; here they are four behaviours of one table.

Three are satisfied and carry no divergence row. Their `Reviewed` silence asserts nothing — the survey
matched features against the import's titles, not against its sections.

| Screen | What ships | Where |
|---|---|---|
| 69 Squad Selection | Single-selection model. `Space` toggles, `Enter` sets primary. | `selectedId` / `setSelection` |
| 70 Squad View Selector | `SQUAD_VIEWS` with a position list and column presets, picked from the toolbar and persisted. | `SQUAD_VIEWS`, `useSquadColumns.ts` |
| 72 Player Sorting | Sorting on every column, sort state persisted. | TanStack Table |

**Screen 69 carries one standing design decision** worth reading before touching it: under
[the team sheet is the Tactic](../../../.agents/notes/proposed/architecture/2026-09-13-the-team-sheet-is-the-tactic.md),
Squad's match-day bar and the tactics editor are two editors of the same thing. Screens 82, 89 and 92
follow from the same note. The effort's survey did not cite it, and no row here claims a divergence
from the import on that basis; it is flagged because a future audit of Screen 69 will need it.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| [71_selection_filters.md](71_selection_filters.md), whole file | `deferred` | Filtering the squad list by attribute values and player status, not only by position. | A position filter dropdown ships, with a Clear filters control. The `FilterClause` union already models the other filter kinds; no UI reaches them, so they are unreachable rather than unmodelled. | `unscheduled`. The effort's own `map.md` § Not yet specified calls for an extension ticket here and none was filed. Ticket 01. |

## Screens resting on systems this game does not have yet

**All five rows below were re-kinded from `out-of-scope` to `deferred` on 2026-09-19.**

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| [73_shirt_number_assignment.md](73_shirt_number_assignment.md), whole file | `deferred` | Assigning and displaying squad shirt numbers. | No `shirtNumber` exists in the schema, the model, or any surface. A Player is identified by name and **Position**. | `unscheduled` — no squad-number model. Re-kinded 2026-09-19 under [absence of a model is `deferred`](../../../.agents/notes/proposed/architecture/2026-09-19-per-player-statistics-deferred-not-ruled-out.md); ticket 01 ruled it `out-of-scope`. |
| [74_captain_selection.md](74_captain_selection.md), whole file | `deferred` | Naming a captain and vice-captain, with leadership affecting the team. | No data model, no route, no component. A navigation stub survives — `{ id: "captains", label: "Captains" }` at `renderer/navigation/spec-nav-config.ts:92` — and points at nothing. | `unscheduled` — no captaincy model. Re-kinded 2026-09-19 under [absence of a model is `deferred`](../../../.agents/notes/proposed/architecture/2026-09-19-per-player-statistics-deferred-not-ruled-out.md); ticket 01 ruled it `out-of-scope`. The dangling nav stub is owed removal either way — see § What this ledger leaves owed. |
| [76_squad_registration.md](76_squad_registration.md), whole file | `deferred` | Registering a squad per competition, with registration windows and squad-size limits. | No registration model. A reserved status abbreviation `Ine` exists in `renderer/table/squad/playerStatus.tsx:133` and nothing sets it. | `unscheduled` — no competition-registration concept. Re-kinded 2026-09-19 under [absence of a model is `deferred`](../../../.agents/notes/proposed/architecture/2026-09-19-per-player-statistics-deferred-not-ruled-out.md); ticket 01 ruled it `out-of-scope`. |
| [78_player_interaction_and_grievance.md](78_player_interaction_and_grievance.md), whole file | `deferred` | Conversations with a Player, grievances raised, and the manager's handling of them. | No morale or happiness state. A reserved status abbreviation `Unh` exists in `renderer/table/squad/playerStatus.tsx:169` and nothing sets it. | `v1 exclusion — CONTEXT.md:753`, the **Influence** pillar. [A v1 exclusion is `deferred`](../../../.agents/notes/proposed/process/2026-09-19-a-v1-exclusion-is-deferred-not-out-of-scope.md), 2026-09-19. Same kind as [Group D Screen 58](../group_d_player_and_staff_records/58_player_happiness.md). Ticket 01 ruled this `out-of-scope`. |
| [79_team_meeting_and_discipline_decision.md](79_team_meeting_and_discipline_decision.md), whole file | `deferred` | Team meetings, and disciplinary decisions taken against a Player. | Neither system exists in any form. | Both halves `deferred`, 2026-09-19: `v1 exclusion — CONTEXT.md:753` for the meeting half ([note](../../../.agents/notes/proposed/process/2026-09-19-a-v1-exclusion-is-deferred-not-out-of-scope.md)), and the absent card-accumulation model for the discipline half, as [Group D Screen 60](../group_d_player_and_staff_records/60_player_discipline.md). Ticket 01 ruled it `out-of-scope`. |

The two reserved status values are worth noting together: `Ine` and `Unh` are vocabulary this codebase
carries for systems it has not built. Neither is ever set. They are not evidence that the screens are
coming — a `deferred` row is not a commitment — but they do record that someone once expected them.

## Screen 77: partly live, partly resting on an absent model

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| [77_availability_and_eligibility.md](77_availability_and_eligibility.md), availability | `deferred` | Whether a Player is available: fitness, standing injuries and their durations. | **Condition** and the Tired state are live and shown on the Squad table, and an injury drill-down route exists. There are no standing injury durations — **Injury** is a per-match event, so nothing says a Player is out for three weeks. | `unscheduled`. The durable injury record this needs is the same one [Group D Screen 59](../group_d_player_and_staff_records/59_player_injuries.md) was ruled `out-of-scope` for lacking. Ticket 01. |
| [77_availability_and_eligibility.md](77_availability_and_eligibility.md), eligibility | `deferred` | Whether a Player is eligible: suspensions, card accumulation, competition registration. | None of the three exists. Cards do not accumulate, no Player is suspended, and nothing registers a squad. | `unscheduled` — the same absent models as Screens 76 and 79 and [Group D Screen 60](../group_d_player_and_staff_records/60_player_discipline.md). Re-kinded 2026-09-19 under [absence of a model is `deferred`](../../../.agents/notes/proposed/architecture/2026-09-19-per-player-statistics-deferred-not-ruled-out.md); ticket 01 ruled it `out-of-scope`. |

This is the one screen in the group whose two halves were ruled differently, which is why it is
`Reviewed — partial` rather than disposed: availability is wanted and half-built, eligibility is not
coming.

## Screen 75 was contested, and the conflict is settled

**Resolved 2026-09-19: this screen is `deferred`, not `out-of-scope`.** The row below is not the one
group-e ticket 01 wrote.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| [75_set_piece_takers.md](75_set_piece_takers.md), whole file | `deferred` | Nominating takers for corners, free kicks and penalties. | Not built. `SetPieceStatusView` is hard-coded to `status: "none"` and the **Tactic** carries no set-piece fields yet. Takers become Tactic fields, so nomination is an edit to the object Squad's match-day bar and the tactics editor already edit. | [Group F Screen 86](../group_f_tactics_and_match_preparation/86_set_pieces.md), via [set pieces ship, as a Tactic field](../../../.agents/notes/proposed/feature/2026-09-19-set-pieces-ship-as-a-tactic-field.md). |

**What group-e ticket 01 originally ruled**, kept because a ledger records what was decided as well as
what holds: `out-of-scope`, on the correct finding that no set-piece model exists. The finding was right
and the kind was wrong — absence of a model is `deferred` unless something says the model should never
exist.

That ruling could not stand beside two things that shipped:

- `packages/contracts/src/schemas/tactics.ts:204` carries the comment **"No set pieces configured
  until Screen 86 lands."**
- The shipped Tactics Overview (Screen 80) renders a set-piece panel reading *"No set pieces
  configured"* — `renderer/tactics/TacticsOverviewScreen.tsx:365`.

Both say set pieces are coming with **Group F Screen 86**, which
[SPEC-ROADMAP.md](../../../.ai/SPEC-ROADMAP.md) also lists as in scope for Group F's remainder. If
Screen 75 is genuinely `out-of-scope`, then Screen 80 has a permanently empty panel promising a
screen that will never land, and the contract comment names a dead ticket.

Both said set pieces arrive with **Group F Screen 86**. Raised as group-f decision request 01 and
answered on 2026-09-19: set pieces ship, and Screen 75 is the Group E half of the same feature the
Tactic owns. Screen 80's panel is no longer promising a screen that will never land.

## What this ledger leaves owed

Surfaced by transcription, recorded so it is not lost again:

- ~~**Screen 75's contradiction.**~~ **Settled 2026-09-19** — `deferred` to Group F Screen 86. What
  remains is build work owed to that screen, not a question: a schema addition and migration, with
  existing Saves reading `"none"`.
- **A dangling nav stub for Screen 74.** `renderer/navigation/spec-nav-config.ts:92` carries a
  `Captains` entry pointing at no route and no component, for a screen this ledger disposes. It is owed removal under milestone
  [M1](../../../.ai/MILESTONES.md) step 5.
- **The Screen 71 extension ticket** the effort's own map called for and nobody filed. The filter
  kinds are modelled and unreachable, which is a cheap screen rather than a new system.
- **No placeholder cull is owed for this group.** Unlike Group D, Group E's disposed screens never got
  WIP placeholders — the Squad screen absorbed 69–72 and nothing was routed for 73–79. The one stale
  artefact is the Screen 74 nav stub.
