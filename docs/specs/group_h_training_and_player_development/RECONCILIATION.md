# Group H reconciliation ledger

The specs in this directory are an **import**, not a set of requirements. This ledger records, per
screen, every place the import is knowingly not followed, and why. The format is the one the
[Group A ledger](../group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md) pilots,
with the same four kinds and status vocabulary. The import files are never edited.

## Transcribed 2026-09-19, and the source was already durable

Milestone [M1](../../../.ai/MILESTONES.md) step 1. Group H is one of three groups — with I and J —
whose effort **wrote an Agent Note for its scope decision** rather than leaving it in `.scratch/`:
[Group H v1 scope](../../../.agents/notes/proposed/architecture/2026-09-15-group-h-v1-scope.md). The
ruling behind every row below already outlives its effort. What was missing was only the per-screen
coverage table, which is what this file adds.

Nothing here corrects the effort. It used `deferred` for its seven excluded screens, which is the kind
[the completed rule](../../../.agents/notes/proposed/process/2026-09-19-a-v1-exclusion-is-deferred-not-out-of-scope.md)
would give them anyway: each was excluded for a model the game lacks, not for a reason the thing should
not exist. **No screen in Group H is `out-of-scope`.**

## What each status asserts

| Status | What silence about a section asserts |
|---|---|
| `Reviewed` | Nothing. The rows are what a whole-file pass found; no section was individually checked. |
| `Deferred in full` | The screen is wanted and not built. Its one row covers every section. |

## Coverage

Six screens were in v1 and **all six shipped**, between 2026-09-15 and 2026-09-16.

| Screen | Import file | Status |
|---|---|---|
| 105 Training Overview | [105_training_overview.md](105_training_overview.md) | Reviewed — implemented 2026-09-15 |
| 106 Training Calendar and Schedule | [106_training_calendar_and_schedule.md](106_training_calendar_and_schedule.md) | Deferred in full |
| 107 Training Unit Assignment | [107_training_unit_assignment.md](107_training_unit_assignment.md) | Deferred in full |
| 108 Individual Training Plan | [108_individual_training_plan.md](108_individual_training_plan.md) | Reviewed — implemented 2026-09-15 |
| 109 Position and Role Training | [109_position_and_role_training.md](109_position_and_role_training.md) | Deferred in full |
| 110 Additional Focus and Trait Development | [110_additional_focus_and_trait_development.md](110_additional_focus_and_trait_development.md) | Deferred in full |
| 111 Coaching Assignments | [111_coaching_assignments.md](111_coaching_assignments.md) | Reviewed — implemented 2026-09-15 |
| 112 Training Workload and Recovery | [112_training_workload_and_recovery.md](112_training_workload_and_recovery.md) | Reviewed — implemented 2026-09-15 |
| 113 Training Performance Report | [113_training_performance_report.md](113_training_performance_report.md) | Reviewed — **partly** implemented 2026-09-15 |
| 114 Player Development Centre | [114_player_development_centre.md](114_player_development_centre.md) | Reviewed — implemented 2026-09-15 |
| 115 Mentoring Groups | [115_mentoring_groups.md](115_mentoring_groups.md) | Deferred in full |
| 116 Youth Intake and Academy Development | [116_youth_intake_and_academy_development.md](116_youth_intake_and_academy_development.md) | Deferred in full |
| 117 Training Camp and Pre-Season Plan | [117_training_camp_and_pre_season_plan.md](117_training_camp_and_pre_season_plan.md) | Deferred in full |

Ticket references below are deliberately unlinked: they live under `.scratch/`, which is cleared when
an effort is archived, and this ledger outlives the effort that produced it.

## What the survey found

Ticket 01: **0 screens built, 7 partial, 6 absent.** The asymmetry that shaped the whole group is that
the *backend was already there* — **Training Focus** and **Player Development** are fully modelled,
with the per-season step deterministic
([note](../../../.agents/notes/implemented/feature/2026-08-28-deterministic-fractional-player-development.md)).
Nothing rendered it. That is the reverse of [Group L](../group_l_competitions_nations_and_world_information/RECONCILIATION.md),
where every screen was blocked at the contract layer, and it is why six screens could ship in two days.

The seven deferred screens are exactly the ones with no model behind them: calendar, units, position
training, traits, mentoring, youth intake and training camps have no code at all.

## Divergences in what shipped

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| [112_training_workload_and_recovery.md](112_training_workload_and_recovery.md), recovery projection | `deferred` | A projection of each player's condition forward to the next fixture. | v1 shows **stored Condition**, not a projection. The Rest/Active indicator is derived in main from stored Condition against the engine's non-contact threshold (75), so the renderer never imports the engine. | `unscheduled`. Ticket 05. |
| [112_training_workload_and_recovery.md](112_training_workload_and_recovery.md), injury history | `renamed` | An injury history informing the workload decision. | The detail line states the **last injury's Severity this Season**, because the ledger keeps it only until Season start. A durable per-Player injury record does not exist — the same gap that defers [Group D Screen 59](../group_d_player_and_staff_records/59_player_injuries.md) and Group E Screen 77's availability half. | Ticket 05. |
| [108_individual_training_plan.md](108_individual_training_plan.md), focus eligibility | `contradicted` | Any focus is offered for any player. | Goalkeeping is offered only to players with goalkeeping Attributes, and `setTrainingFocus` **refuses** the rest with `TrainingFocusNotOfferedError` — one shared predicate decides, so the renderer and main cannot disagree. Off-rule rows in older Saves are left alone: they develop the player exactly as `None`, and any offered choice replaces them. | Tickets 06 and 10. |
| [114_player_development_centre.md](114_player_development_centre.md), workload gauge | `deferred` | A workload gauge on the development centre. | Not in v1. Workload has its own screen (112) and was not duplicated here. | `unscheduled`. Ticket 08. |
| [113_training_performance_report.md](113_training_performance_report.md), coach rating | `contradicted` | A coach's rating of the player's progress. | The field shows the **Coach's quality** — the 1–20 value that drives this player's baseline development — and is **labelled "Coach quality"**, not "coach rating". A rating the Coach gives the player does not exist in any model and is post-v1. | **Answered 2026-09-19** — [the Performance Report shows what it can prove](../../../.agents/notes/proposed/feature/2026-09-19-the-performance-report-shows-what-it-can-prove.md). |
| [113_training_performance_report.md](113_training_performance_report.md), first-season changes | `deferred` | Attribute change shown from the first Season onward. | New `PlayerDeveloped` events will carry the pre-development Attributes. It **cannot be backfilled** — those values are genuinely absent from recorded Seasons — so existing saves keep a blind first Season and the report shows an explicit no-comparison state for it. | **Answered 2026-09-19** — same note. |

Screen 113 is the only screen in this group that is not wholly done. It ships Training Focus and
season-over-season Attribute changes through a new own-club-only read,
`getPlayerDevelopmentHistory`, and stops at the two rows above.

## Deferred in full

Seven screens, one ruling, anchored to
[Group H v1 scope](../../../.agents/notes/proposed/architecture/2026-09-15-group-h-v1-scope.md)
(ticket 02). Each is `deferred` with `unscheduled` unless noted.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| [106_training_calendar_and_schedule.md](106_training_calendar_and_schedule.md), whole file | `deferred` | A training calendar with sessions scheduled across the week. | No training calendar exists. The **Calendar** advances by jumping to the next scheduled event and has no day-by-day clock to hang sessions on. | `unscheduled`. See `CONTEXT.md` on the Calendar — a finer clock was deliberately not built. |
| [107_training_unit_assignment.md](107_training_unit_assignment.md), whole file | `deferred` | Players assigned to training units under specific coaches. | No unit model. **Coaching Assignments** (111) assigns the one **Coach** to pillars, not players to units. | `unscheduled`. |
| [109_position_and_role_training.md](109_position_and_role_training.md), whole file | `deferred` | Training a player toward a new position or role. | No model. **Position Rating** is derived, and **Training Focus** categories do not include positional retraining. | `unscheduled`. |
| [110_additional_focus_and_trait_development.md](110_additional_focus_and_trait_development.md), whole file | `deferred` | Player traits, and training that develops them. | No trait model exists at all. | `unscheduled`. |
| [115_mentoring_groups.md](115_mentoring_groups.md), whole file | `deferred` | Senior players mentoring younger ones, affecting development and personality. | No mentoring model, and the personality half would need **Influence**. | `unscheduled`. The personality half additionally rests on `v1 exclusion — CONTEXT.md:753`. |
| [116_youth_intake_and_academy_development.md](116_youth_intake_and_academy_development.md), whole file | `deferred` | An annual youth intake generating new players. | No intake. It needs a player-generation decision — where new Players come from mid-career, deterministically, is unsettled. | `unscheduled`. The generation question is the real blocker, not the screen. |
| [117_training_camp_and_pre_season_plan.md](117_training_camp_and_pre_season_plan.md), whole file | `deferred` | Pre-season planning and training camps. | No model. It interacts with Group Q's season rollover, which is where pre-season would have to live. | `unscheduled`. Group Q owns the rollover. |

## What this ledger leaves owed

- ~~**Two open decision requests, both on Screen 113.**~~ **Both answered 2026-09-19.** Screen 113's
  `needs-info` clears. What remains is build work: relabel the field to "Coach quality" on Screens 111
  and 113, add the baseline to `PlayerDeveloped`, and give the report a no-comparison state for Seasons
  recorded before that. The warning in the original ticket held — answering late means existing saves keep
  the gap, and they do.
- **Screen 116's real blocker is player generation**, not the screen. Whoever charters it inherits a
  determinism question, not a UI one.
- **No placeholder cull is owed.** Group H's deferred screens were never routed, and its six v1
  screens all shipped real.
