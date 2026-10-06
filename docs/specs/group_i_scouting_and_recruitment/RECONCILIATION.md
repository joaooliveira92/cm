# Group I reconciliation ledger

The specs in this directory are an **import**, not a set of requirements. This ledger records, per
screen, every place the import is knowingly not followed, and why. The format is the one the
[Group A ledger](../group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md) pilots,
with the same four kinds and status vocabulary. The import files are never edited.

## Transcribed 2026-09-19, from a durable source

Milestone [M1](../../../.ai/MILESTONES.md) step 1. Like Groups H and J, this effort recorded its scope
ruling as an Agent Note —
[Group I v1 scope](../../../.agents/notes/implemented/architecture/2026-09-15-group-i-v1-scope.md),
already promoted to `implemented/` — so the decision behind every row below already outlived its
effort. This file adds the per-screen coverage table it did not have.

The effort used `deferred` for all eleven excluded screens, which
[the completed rule](../../../.agents/notes/proposed/process/2026-09-19-a-v1-exclusion-is-deferred-not-out-of-scope.md)
would give them anyway. **No screen in Group I is `out-of-scope`.**

## What each status asserts

| Status | What silence about a section asserts |
|---|---|
| `Reviewed` | Nothing. The rows are what a whole-file pass found; no section was individually checked. |
| `Deferred in full` | The screen is wanted and not built. Its one row covers every section. |

## Coverage

Three screens were in v1 and **all three shipped** on 2026-09-15. Screen 119 shipped later, under M1,
on 2026-09-23.

| Screen | Import file | Status |
|---|---|---|
| 118 Scouting Centre | [118_scouting_centre.md](118_scouting_centre.md) | Reviewed — implemented 2026-09-15 |
| 119 Player Search | [119_player_search.md](119_player_search.md) | Reviewed — implemented 2026-09-23 |
| 120 Staff Search | [120_staff_search.md](120_staff_search.md) | Deferred in full |
| 121 Scouting Assignment | [121_scouting_assignment.md](121_scouting_assignment.md) | Reviewed — implemented 2026-09-15 |
| 122 Scouting Priorities | [122_scouting_priorities.md](122_scouting_priorities.md) | Deferred in full |
| 123 Recruitment Focus | [123_recruitment_focus.md](123_recruitment_focus.md) | Deferred in full |
| 124 Player Shortlist | [124_player_shortlist.md](124_player_shortlist.md) | Deferred in full |
| 125 Staff Shortlist | [125_staff_shortlist.md](125_staff_shortlist.md) | Deferred in full |
| 126 Scouting Knowledge | [126_scouting_knowledge.md](126_scouting_knowledge.md) | Reviewed — implemented 2026-09-15 |
| 127 Recruitment Meetings | [127_recruitment_meetings.md](127_recruitment_meetings.md) | Deferred in full |
| 128 Squad Planner | [128_squad_planner.md](128_squad_planner.md) | Deferred in full |
| 129 Transfer Target Comparison | [129_transfer_target_comparison.md](129_transfer_target_comparison.md) | Deferred in full |
| 130 Agent and Intermediary Information | [130_agent_and_intermediary_information.md](130_agent_and_intermediary_information.md) | Deferred in full |
| 131 Trial and Assessment | [131_trial_and_assessment.md](131_trial_and_assessment.md) | Deferred in full |

Ticket references below are deliberately unlinked: they live under `.scratch/`, which is cleared when
an effort is archived, and this ledger outlives the effort that produced it.

## The finding that outgrew this group

Ticket 01's survey recorded, almost in passing:

> **The transfer market shows exact figures for unscouted Players.**

This is a contradiction of the game's own knowledge model, not a missing feature. **Attribute Range**
and **Scouting Progress** exist precisely so that what a manager may see about a Player depends on how
well that Player has been scouted — and the Scouting Knowledge screen (126) honours that, showing
coverage and **Knowledge Confidence** with no figure. The transfer market does not.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| Knowledge-limited reads, across the group | `contradicted` | Recruitment surfaces present a Player's ability as known fact. | A Player outside the manager's club shows **Attribute Range** values by **Scouting Progress** — Transfer Value and Overall Rating included — never an exact figure until **Fully Scouted**. The fix goes in the shared read, not the screens, so the market, `BidComposer`, 119 and 129 cannot disagree. | **Answered 2026-09-19** — [knowledge limits every Player read](../../../.agents/notes/implemented/architecture/2026-09-19-knowledge-limits-every-player-read.md). `CONTEXT.md`'s **Listed** loses its pre-Scouting "full-information Transfer Value" clause in the same commit. |

It is the one open question in this group and the only one in the M1 sweep that blocks screens in two
other groups. Ticket 03 held new Player targets back pending the answer.

## Divergences in what shipped

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| [121_scouting_assignment.md](121_scouting_assignment.md), assignment targets | `renamed` | Scouts assigned to individual players. | A Club assignment takes `expectedReportId` from that Club's `getTeamScoutReport`, and a Club target reads **"Tracked per Player"**. Club-level scouting is the primary mode; the per-Player report surface is Group D Screen 68, deferred. | Ticket 04. **Team Scout Report** shipped as [Group C Screen 49](../group_c_club_information/49_team_scout_report.md). |
| [126_scouting_knowledge.md](126_scouting_knowledge.md), per-player figures | `contradicted` | Scouting knowledge is presented with the player's values. | One read, `getScoutingKnowledge`, gives per-Club coverage and **Knowledge Confidence** across the squad plus per-Player **Scouting Progress**, **with no figure**. This is the correct behaviour and the transfer market is the surface that is wrong — see above. | Ticket 05. Knowledge Confidence now also reads live per Club (`CONTEXT.md`). |

**One defect this group found was not its own.** Ticket 04 discovered that *every* typed RPC error
reached the renderer as `{ name: "Error" }` — the IPC boundary was discarding the error channel
wholesale. Fixed as ticket 07: `handleRpc` now encodes failures with the method's error schema. That is
a repo-wide correctness fix that happened to surface here, and it is the near neighbour of the
narrow-error-union defect [Group L](../group_l_competitions_nations_and_world_information/RECONCILIATION.md)
found a fortnight later.

## Deferred in full

Ten screens, one ruling, anchored to
[Group I v1 scope](../../../.agents/notes/implemented/architecture/2026-09-15-group-i-v1-scope.md)
(ticket 02). Each is `deferred` with `unscheduled` unless noted. The survey's finding behind all of
them: the Scouting model that backs the Team Scout Report exists, and *shortlists, focuses, priorities,
meetings, planner, agents, trials and staff hiring do not*. One of the eleven, Screen 119, shipped
under M1 (ticket 06's knowledge reading governs it; ticket 11 built the search) and dropped out of
this table; `129_transfer_target_comparison.md` lost its knowledge-gate but no comparison mechanism
exists, so it stays.


| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| [120_staff_search.md](120_staff_search.md), whole file | `deferred` | Searching for staff to hire. | No staff hiring exists. The role set is closed — **Bound Staff** and **Presence Staff**, one of each per club. | `unscheduled`. Note this is the one row in the group with a case for `out-of-scope`: [Group D 64–66](../group_d_player_and_staff_records/RECONCILIATION.md) are `out-of-scope` on exactly this closed role set. Left as the effort ruled it; worth settling if staff hiring is ever reconsidered. |
| [122_scouting_priorities.md](122_scouting_priorities.md), whole file | `deferred` | Ranking what the scouting department works on. | No priority model. A **Scouting Assignment** is a direct instruction, not a ranked queue. | `unscheduled`. |
| [123_recruitment_focus.md](123_recruitment_focus.md), whole file | `deferred` | A standing recruitment brief — positions, age, budget — that scouting works to. | No model. | `unscheduled`. |
| [124_player_shortlist.md](124_player_shortlist.md), whole file | `deferred` | A shortlist of tracked Players. | A routed WIP placeholder; no shortlist model. | `unscheduled`. `renderer/shortlist/` is a placeholder owed a ruling under M1 step 5. |
| [125_staff_shortlist.md](125_staff_shortlist.md), whole file | `deferred` | A shortlist of tracked staff. | Same absent model, plus the closed role set. | `unscheduled`. |
| [127_recruitment_meetings.md](127_recruitment_meetings.md), whole file | `deferred` | Meetings where the recruitment team discusses targets. | No meeting model, and the discussion half would need generated text the game does not produce. | `unscheduled`. Compare [Group M](../group_m_media_press_and_communications/RECONCILIATION.md) — the same absence of a generative content path. |
| [128_squad_planner.md](128_squad_planner.md), whole file | `deferred` | Planning the squad forward: depth, ages, contract expiries, gaps. | No planner. Overlaps Group E (squad) and Group P (analytics), so ownership is unsettled as well as the model. | `unscheduled`. |
| [129_transfer_target_comparison.md](129_transfer_target_comparison.md), whole file | `deferred` | Comparing transfer targets side by side. | No comparison mechanism — the same absent model as [Group D Screen 63](../group_d_player_and_staff_records/63_player_comparison.md). Previously additionally gated by the knowledge question, now answered (decision request 01 → [knowledge limits every Player read](../../../.agents/notes/implemented/architecture/2026-09-19-knowledge-limits-every-player-read.md)). | `unscheduled`. |
| [130_agent_and_intermediary_information.md](130_agent_and_intermediary_information.md), whole file | `deferred` | Agents and intermediaries, and their part in a deal. | No agent model. | `unscheduled`. |
| [131_trial_and_assessment.md](131_trial_and_assessment.md), whole file | `deferred` | Trialling a player before signing. | No trial model. | `unscheduled`. |

## What this ledger leaves owed

- ~~**group-i decision request 01 is the most far-reaching open question in the sweep.**~~ **Answered
  2026-09-19**, and it was: it unblocks Screens 119 and 129 here, Group J 132, 134 and 137, and removes
  one of the two reasons Group D Screen 68 was deferred. A real design consequence comes with it — a bid
  can be placed on a Player whose value is a range, so the manager bids against an estimate that narrows
  by scouting. That makes Scouting Assignment a precondition for good recruitment rather than a
  curiosity.
- **Screen 120's kind is arguably wrong**, and it is the mirror of the corrections M1 step 1 has been
  making all week — here a screen may be *too generously* `deferred` rather than too harshly
  `out-of-scope`. The closed role set that made [Group D 64–66](../group_d_player_and_staff_records/RECONCILIATION.md)
  `out-of-scope` applies to it equally.
- **One placeholder is owed a ruling**: `renderer/shortlist/` (124) — a routed WIP screen for a
  deferred surface. (`renderer/playerSearch/` (119) was the other; ticket 11 built it out, so its
  ruling is no longer owed.) M1 step 5.
