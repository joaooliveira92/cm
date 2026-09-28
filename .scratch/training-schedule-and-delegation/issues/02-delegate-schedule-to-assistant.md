# 02: Delegate the training schedule to the Assistant Manager

**Status:** needs-triage

**Type:** grilling

**Blocked by:** 01

## Feature goal

A manager who doesn't want to plan every microcycle hands the schedule to the Assistant Manager, who
picks a sensible schedule before each Fixture. The manager can take it back at any time. The
assistant's choices are visible, so delegating is a trust decision with consequences, not a hidden
automation.

## Decisions this would overturn

1. **The assistant is display-only staff** (`packages/shared/src/rules/staff.ts`,
   `CONTEXT.md` Presence Staff). If the assistant's quality should change how good its schedules are,
   it has to become Bound Staff: a stored row, a quality, and `assistant` added to the `staff_role`
   CHECK, which is a DB schema change. If it's only a name on a deterministic rule, it can stay
   display-only. **Recommend staying display-only for the first slice:** the assistant applies the
   template rule below, and quality is a later ticket.
2. **Spec 106 §11: "recommended schedules … never submit automatically"**. Standing delegation writes
   a schedule the manager didn't accept. Proposed ruling: turning delegation on is the manager's one
   acceptance, it covers every microcycle until turned off, and every write the assistant makes is
   recorded where the manager can see it.
3. Separately from this ticket, `CONTEXT.md`'s Presence Staff entry omits the Assistant Manager,
   which the code already derives. Fix the glossary whichever way (1) is ruled.

## Game mechanics and data requirements

- **Delegation flag:** `delegated_to_assistant` on the club's training schedule (from 01), with its
  revision. Turning it on or off is a revisioned write, the same as a schedule edit.
- **The assistant's rule:** a pure, deterministic function in `packages/shared` from the next
  Fixture's context to a template. The inputs are the gap to the next Fixture, whether the one after
  it is close behind, and the squad's mean stored Condition. The output is one of 01's named
  templates. It uses no randomness and no hidden information.
- **When it runs:** in main, as part of the Calendar advance that crosses a Matchday, for clubs with
  delegation on. It writes the new microcycle's schedule before the next Pre-match Boundary, so the
  manager sees it before kickoff.
- **Visibility:** each assistant write raises a News Message ("Your assistant set a Recovery week
  before the match against …"), attributed to the assistant by name.
- **Taking over:** any manual edit of a delegated schedule asks whether to take the schedule back.
  Saving turns delegation off. The assistant never overwrites a manual edit.
- If the assistant is later promoted to Bound Staff, quality could decide how often the assistant
  picks the template the rule says is best. That is out of scope for this ticket.

## UI/UX changes

- The Training Schedule screen shows a delegation state line: "Planned by you", or "Planned by
  {assistant name}", with the template the assistant chose and why, as one short sentence from the
  rule's inputs.
- The screen registers **Delegate to Assistant** with `useScreenBottomBarActions`. When delegation is
  on, the same place carries **Take Over Schedule**. It's a registered Action in the `training` scope,
  listed in the palette.
- While delegated, the slot controls are read-only, with the reason stated in the bar's reason line.
  Editing requires Take Over first, so nothing is lost silently.
- The Training Overview's Schedule card names who is planning.
- The Staff Profile for the Assistant Manager mentions that they plan training when delegation is
  on. This gives the display-only assistant a surface that reads them.

## Acceptance criteria

- [ ] The decisions above are ruled on, and `CONTEXT.md` and spec 106 state the rulings.
- [ ] Delegate to Assistant turns delegation on in one revisioned write, and Take Over Schedule
      turns it off. Both survive quitting and reloading the career.
- [ ] With delegation on, advancing past a Matchday writes the next microcycle's schedule before the
      next Pre-match Boundary, and a News Message names the assistant and the template.
- [ ] The assistant's choice is a pure function, tested in `packages/shared`. The same inputs always
      give the same template.
- [ ] The assistant never overwrites a schedule the manager edited. Taking over is required to edit,
      and it turns delegation off.
- [ ] While delegated, the slot controls are disabled, and the bottom bar says why.
- [ ] Both verbs carry the `data-action-id` of a registered Action and appear in the palette.
- [ ] A career that never delegates behaves exactly as under 01.
