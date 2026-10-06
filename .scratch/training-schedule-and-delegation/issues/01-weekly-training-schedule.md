# 01: A training schedule for the gap between Matchdays

**Status:** resolved

**Type:** grilling

**Blocked by:** None.

## Feature goal

The manager decides how the squad spends the time between two Matchdays: harder physical work
before a free week, recovery before a congested run, tactical work before a big match. The choice has
a visible, bounded effect the manager can read on the Workload screen and in the development report,
so training becomes a decision rather than a setting made once per Season.

## Decisions this would overturn

Rule on each before this can become `ready-for-agent`. Each overturned rule is updated in the same
change as the code that overturns it.

1. **The Calendar's "no training content" clause** (`CONTEXT.md`, Calendar). Proposed: the Calendar
   keeps jumping between events; a schedule attaches to the **microcycle**, the interval from one of
   the club's Matchdays to the next. No day-by-day clock.
2. **Training Focus's read-once rule** (`CONTEXT.md`, Training Focus). This only applies if the
   schedule affects development. Option A: the schedule affects only Condition, and the rule stands.
   Option B: each resolved microcycle adds a per-Category weight, and Player Development reads the
   Season's total at conclusion. B overturns "no duration, history or partial credit accrues".
   **Recommend A for the first slice.**
3. **Regimen's sole ownership of between-match recovery** (`CONTEXT.md`, Regimen). A recovery session
   becomes a second modifier. It has to compose with Regimen, never replace it.

## Game mechanics and data requirements

- **Microcycle:** the period from the club's last played Matchday to its next Fixture. It is derived
  from the Fixture list, never stored as dates.
- **Session types:** a small closed set, for example `tactical`, `technical`, `physical`, `recovery`,
  `rest`. Each has an intensity (`low`, `medium` or `high`) and a fixed effect table in
  `packages/shared`.
- **Schedule:** one per human-managed club. It holds an ordered list of session slots for the
  microcycle. The slot count is fixed, for example five, so a short gap and a long gap are planned
  the same way.
- **Templates:** named, deterministic schedules ("Balanced", "Match preparation", "Recovery"). The
  generated default is **Balanced**, and it reproduces today's behaviour exactly: a career that never
  opens the screen plays the same as it does now.
- **Effect:** under option A, the schedule's physical load and recovery shift between-match Condition
  recovery, clamped so that the Regimen Pillar still moves recovery more than any schedule can.
  Under option B, the same plus a per-Category development weight accrued per resolved microcycle.
- **Persistence:** a `training_schedule` table keyed by save and club, carrying a `revision` for
  expected-revision writes and request IDs for idempotency, the same way as `changeTactics`. There's
  no migration of old saves.
- **Contract:** a `getTrainingSchedule` read and a `changeTrainingSchedule` write with
  `expectedRevision`, plus a `TrainingScheduleRevisionConflictError`.
- AI clubs have no schedule, following the Training Focus precedent.

## UI/UX changes

- A **Training Schedule** screen at `/training/schedule`, reached from the Training Overview. It
  shows the current microcycle's slots in order, with the next Fixture named at the end.
- Each slot is a native select of session type and intensity, operable by keyboard alone. There is no
  drag-only interaction.
- A template picker replaces all slots in the draft. It never saves on its own.
- A read-only projection beside the slots shows the Condition each player would reach by kickoff
  under the draft compared with the saved schedule. It uses the same stored Condition the Workload
  screen shows.
- Edits make a draft, as the Tactics editor does. The screen registers **Save Schedule** and
  **Reset Schedule** with `useScreenBottomBarActions`, as registered Actions in a `training` scope.
  Continue keeps the bar's primary zone.
- **Reset Schedule** discards the draft and reloads the saved revision. It's disabled when the draft
  matches the saved revision.
- The Training Overview gains a Schedule card naming the current template or "Custom".

## Acceptance criteria

- [ ] The three decisions above are ruled on, and `CONTEXT.md` states the rulings.
- [ ] A new career's club has the Balanced schedule, and a season simulated without opening the
      screen produces the same Condition values as before this change.
- [ ] The manager can set every slot's session type and intensity, apply a template, and save. The
      saved schedule survives quitting and reloading the career.
- [ ] Saving against a stale revision shows a conflict with Refresh and keeps the draft, as Tactics
      does.
- [ ] Reset Schedule restores the saved revision and is disabled when there is nothing to reset.
- [ ] Save Schedule and Reset Schedule appear in the bottom bar on the schedule screen only, are
      listed in the command palette, and each carries the `data-action-id` of a registered Action.
- [ ] A heavier schedule leaves players at a lower Condition at the next kickoff than a recovery
      schedule, from the same starting state. This is tested in `packages/shared` as a pure function.
- [ ] Every control works by keyboard alone and carries the focus ring.

## Answer

Ruled by the human on 2026-09-28. The build is specified in [spec.md](../spec.md) and sliced into
[03](03-schedule-screen-and-persistence.md) and [04](04-schedule-moves-condition.md); the design
sections above are superseded by the spec where they differ.

- **Microcycle, no clock:** the schedule attaches to the interval between the club's Matchdays, and
  the Calendar keeps jumping between events. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-28-training-schedule-attaches-to-the-microcycle.md).
- **Condition only:** the schedule moves between-match Condition recovery, bounded inside Regimen's
  range, and never Player Development; Training Focus's read-once rule stands. See [Agent Note](../../../.agents/notes/proposed/feature/2026-09-28-training-schedule-moves-condition-only.md).
- **Regimen:** the schedule's modifier composes with Regimen and never replaces it. Covered by the
  Condition-only note above.
