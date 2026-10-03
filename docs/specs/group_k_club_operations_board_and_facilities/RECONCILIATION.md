# Group K reconciliation ledger

The specs in this directory are an **import**, not a set of requirements. They read as generated from a
generic template rather than authored against this game, and they routinely describe subsystems this
project has never decided to build. This ledger records, per screen, every place the import is
knowingly not followed, and why.

The format is the one the
[Group A ledger](../group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md) pilots,
with the same four kinds — `out-of-scope`, `contradicted`, `deferred`, `renamed` — and the same status
vocabulary. The import files are never edited.

## Nothing here is reconciled, and that is the whole content

Created 2026-09-18 as milestone [M1](../../../.ai/MILESTONES.md) step 1. **Group K has no rulings to
transcribe.** Its effort, `group-k-club-operations-board-and-facilities`, wrote a `map.md` and stopped:
its § Decisions so far is literally `<!-- none yet -->`, it has no tickets, no spec and no `issues/`
directory. No screen in 147–160 has been read.

This file exists so that state is visible from `docs/specs/` rather than only from the absence of a
directory under `.scratch/`. Group K and [Group F](../group_f_tactics_and_match_preparation/RECONCILIATION.md)
are the two groups in the M1 sweep where the ledger's job is to record a gap rather than a decision —
with the difference that Group F at least shipped one screen.

**Every row below is `Not yet audited`. Silence about any section means nobody has read it.**

## Coverage

| Screen | Import file | Status |
|---|---|---|
| 147 Board Overview | [147_board_overview.md](147_board_overview.md) | Not yet audited |
| 148 Board Objectives | [148_board_objectives.md](148_board_objectives.md) | Not yet audited |
| 149 Board Request | [149_board_request.md](149_board_request.md) | Not yet audited |
| 150 Board Response and Negotiation | [150_board_response_and_negotiation.md](150_board_response_and_negotiation.md) | Not yet audited |
| 151 Club Vision and Culture | [151_club_vision_and_culture.md](151_club_vision_and_culture.md) | Not yet audited |
| 152 Staff Responsibilities | [152_staff_responsibilities.md](152_staff_responsibilities.md) | Not yet audited |
| 153 Club Policy and Delegation | [153_club_policy_and_delegation.md](153_club_policy_and_delegation.md) | Not yet audited |
| 154 Facility Upgrade Request | [154_facility_upgrade_request.md](154_facility_upgrade_request.md) | Not yet audited |
| 155 Stadium Expansion and Relocation | [155_stadium_expansion_and_relocation.md](155_stadium_expansion_and_relocation.md) | Not yet audited |
| 156 Affiliate Club Management | [156_affiliate_club_management.md](156_affiliate_club_management.md) | Not yet audited |
| 157 Commercial and Sponsorship Overview | [157_commercial_and_sponsorship_overview.md](157_commercial_and_sponsorship_overview.md) | Not yet audited |
| 158 Supporter Engagement and Attendance | [158_supporter_engagement_and_attendance.md](158_supporter_engagement_and_attendance.md) | Not yet audited |
| 159 Club Operations Calendar | [159_club_operations_calendar.md](159_club_operations_calendar.md) | Not yet audited |
| 160 Board Meeting and Performance Review | [160_board_meeting_and_performance_review.md](160_board_meeting_and_performance_review.md) | Not yet audited |

## What is known without having read them

**Not rulings.** What follows is what other efforts and `CONTEXT.md` already establish, recorded so
whoever charts this group does not start cold. Every line is a question to settle.

- **The board-relations axis is a v1 exclusion.** `CONTEXT.md` excludes board relations from v1 in the
  same sentence that excludes media handling and dressing-room relationships. Screens 149, 150 and 160
  — Requests, Response and Negotiation, and Board Meetings — are the ones that rest on it most
  directly. **What kind those rows take is an open question that reaches past this group**; see the
  note below.
- **Some of the board already exists, and is narrower than the import assumes.** `CONTEXT.md` models
  **Board Objective**, **Verdict**, **Manager Warned**, **Manager Sacked** and **President**. The
  effort's own map puts the question well: what does "Board Overview" mean when the President is the
  Board's face and objectives are League-position bands? A single annual verdict derived from league
  position plus a consecutive-miss counter is what exists — not a board with opinions.
- **Screen 148 Board Objectives may need no screen.** The model exists; whether it needs a surface or
  is already satisfied is the map's second open question.
- **Screen 152 Staff Responsibilities may collapse into the Staff entity**, whose role set is closed —
  **Bound Staff** and **Presence Staff**, one of each per club, none hired or delegated to. Compare
  [Group D screens 64–68](../group_d_player_and_staff_records/RECONCILIATION.md), all disposed for the
  same reason.
- **Five axes have no model at all**: facilities (154), stadiums (155), affiliates (156), commercial
  and sponsorship (157), and supporter engagement (158). The map records these as "do not exist in
  v1"; none has been ruled on.
- **Screens 46–47 of Group C overlap this group** — Club Information and Facilities, and Supporter and
  Board Confidence. Whichever group is charted second inherits the other's ruling. `boardConfidence`
  exists in the renderer as a WIP placeholder.

## The kind question this group cannot answer alone

The five axes above have no model, and by the rule that milestone M1 step 1 has now established twice
— **absence of a model is `deferred` unless something states the model should never exist** — they
would reconcile as `deferred`. See
[per-player statistics are deferred, not ruled out](../../../.agents/notes/proposed/architecture/2026-09-19-per-player-statistics-deferred-not-ruled-out.md).

The board-relations screens rest on an explicit `CONTEXT.md` decision rather than on mere absence —
and **that question is now answered too**: a recorded v1 exclusion is `deferred`, per
[a v1 exclusion is `deferred`, not `out-of-scope`](../../../.agents/notes/proposed/process/2026-09-19-a-v1-exclusion-is-deferred-not-out-of-scope.md), settled 2026-09-19.

So every screen in this group has a kind waiting for it before anyone reads a line:

> Absence of a model is `deferred`. A version boundary is `deferred`. Only a design statement that the
> thing should not exist is `out-of-scope`.

Screens 149, 150 and 160 take `deferred` with the Anchor `v1 exclusion — CONTEXT.md:753`. The five
modelless axes take `deferred` with `unscheduled`. The candidate for `out-of-scope` is Screen 152 Staff
Responsibilities, if the closed role set turns out to rule it out the way it ruled out
[Group D 64–66](../group_d_player_and_staff_records/RECONCILIATION.md) — that is a reading of the
screen, not a kind question.

**Group K is unblocked.**

## What this ledger leaves owed

- **The entire group.** Fourteen screens, unread. An effort exists in name with a `map.md` and no
  decisions; charting it is a human's call under
  [SPEC-ROADMAP](../../../.ai/SPEC-ROADMAP.md) § Starting a group.
- ~~**The v1-exclusion kind question**, which Group K could not be charted without.~~ **Settled
  2026-09-19: `deferred`.** Charting is now only a matter of doing it.
- **One stale placeholder to rule on.** `renderer/boardConfidence/` is a routed WIP screen for a
  surface this group has not decided to build, and `renderer/finances/` sits in the same position
  between Groups C and K. Both are M1 step 5's to resolve once the rulings exist.
