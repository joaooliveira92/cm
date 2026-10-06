# Map: training-schedule-and-delegation — a team training schedule the manager can hand over

Label: `wayfinder:map`

## Destination

A Training area where the manager plans the squad's sessions between Matchdays and can hand that
plan to the Assistant Manager. The plan's verbs (Save Schedule, Reset Schedule, Delegate to
Assistant) sit in the career shell's bottom bar through `useScreenBottomBarActions`, beside Continue.

This is the "Training Schedule and Workload Management" sub-effort that
[Group H v1 scope](../../.agents/notes/proposed/architecture/2026-09-15-group-h-v1-scope.md) deferred
(Screens 106 and 117; 107 stays out). It starts here because the bottom-bar work of 2026-09-28
proposed two Training verbs that have nothing to act on today.

## Notes

What the game models today, and why neither verb could be built as a button:

- **No schedule exists.** Training is a per-player **Training Focus** (one Category or None), a
  **Coach** who scales the passive development baseline, and a Workload screen showing stored
  Condition. There are no sessions, days, weeks or templates.
- **The Calendar has no weeks.** It jumps to the next scheduled event (a Matchday or a Transfer
  Window boundary). `CONTEXT.md` states that "there is no training or press content to occupy a date
  with no Fixture". A schedule is exactly that content.
- **Training Focus accrues nothing.** Player Development reads the standing Focus once, at Season
  conclusion: "no duration, history or partial credit accrues". A schedule that shapes development
  week by week needs accrual.
- **The Assistant Manager is display-only staff.** `packages/shared/src/rules/staff.ts` derives the
  assistant from the world seed. It has a name and a role, no quality, and no row. The `staff_role`
  CHECK permits only `coach` and `scout`. `CONTEXT.md`'s Presence Staff entry still lists only the
  President and the Physio; the code added the assistant without the glossary.
- **Condition recovery belongs to Regimen.** The Regimen Manager Pillar modifies between-match
  Condition recovery and injury severity. A recovery session would be a second input to the same
  quantity.
- **Spec 106 §11 forbids automatic submission.** "Recommended schedules … never submit
  automatically. One accepted preview creates one draft revision." Standing delegation writes a
  schedule the manager did not accept, so it needs a ruling against that clause.
- Saves are disposable during development
  ([note](../../.agents/notes/implemented/architecture/2026-09-21-saves-are-disposable-during-development.md)),
  so a new schedule table needs no migration of old careers.

## Decisions so far

Ruled by the human on 2026-09-28. The spec is [spec.md](spec.md); the build tickets are 03 to 05.

- [01 — Training schedule](issues/01-weekly-training-schedule.md): the schedule attaches to the
  microcycle between the club's Matchdays, with no daily or weekly clock. See [Agent Note](../../.agents/notes/proposed/architecture/2026-09-28-training-schedule-attaches-to-the-microcycle.md).
- [01 — Training schedule](issues/01-weekly-training-schedule.md): the schedule moves between-match
  Condition recovery only, bounded inside Regimen's range, never Player Development. See [Agent Note](../../.agents/notes/proposed/feature/2026-09-28-training-schedule-moves-condition-only.md).
- [02 — Delegation](issues/02-delegate-schedule-to-assistant.md): the assistant stays Presence Staff
  and applies one uniform Best Practice rule. See [Agent Note](../../.agents/notes/proposed/architecture/2026-09-28-assistant-delegation-stays-a-presence-rule.md).
- [02 — Delegation](issues/02-delegate-schedule-to-assistant.md): turning delegation on is the
  manager's consent under spec 106 §11, and every automatic write raises a News Message. See [Agent Note](../../.agents/notes/proposed/feature/2026-09-28-turning-delegation-on-is-the-consent.md).

## Fog

- Whether a Training Camp (Screen 117) is one pre-season template of the same model or its own thing.

## Out of scope

- The Regimen Pillar reaching Condition and injury severity. It is unwired at HEAD although
  `CONTEXT.md` says otherwise; filed separately as
  [regimen-binding-unwired 01](../regimen-binding-unwired/issues/01-regimen-never-reaches-condition-or-severity.md).
  The schedule's band holds either way.

- Training units and cohorts (Screen 107), position and role training (109), traits (110), mentoring
  (115), youth intake (116).
- A day-by-day Calendar. The schedule fits the existing Matchday-to-Matchday stops.
