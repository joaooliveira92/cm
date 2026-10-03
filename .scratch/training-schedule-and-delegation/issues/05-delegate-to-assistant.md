# 05: Hand the schedule to the Assistant Manager

**What to build:** on the Training Schedule screen the manager presses **Delegate to Assistant** in
the bottom bar. From then on, each time the Calendar crosses the club's Matchday, the Assistant
Manager sets the next microcycle's schedule by the Best Practice rule, before the next Pre-match
Boundary, and a News Message names the assistant, the template and the reason in one sentence. The
screen says "Planned by {assistant name}", its session controls are read-only, and the bottom bar's
reason line says why. **Take Over Schedule** in the same place turns delegation off and makes the
controls editable. The assistant never overwrites a schedule the manager edited. The Training
Overview's Schedule card names who is planning, and the Assistant Manager's Staff Profile says they
plan training while delegated.

The slice's edge: the delegation toggle is a revisioned write of the same shape as the schedule
write, failing only with the typed revision conflict. The Best Practice rule is a pure function and
cannot fail. The assistant's write runs inside the Calendar advance with the services that advance
already holds; it appends a Club-stream event naming the assistant as author, and the News Inbox
words it with no new table.

**Decisions:**

- The assistant stays Presence Staff and applies one uniform Best Practice rule. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-28-assistant-delegation-stays-a-presence-rule.md).
- Turning delegation on is the manager's consent under spec 106 §11, and every automatic write raises a News Message. See [Agent Note](../../../.agents/notes/proposed/feature/2026-09-28-turning-delegation-on-is-the-consent.md).

**Blocked by:** 03

**Status:** resolved

- [x] The Best Practice rule is a pure function in the shared rules package from days to the next Fixture, whether another Fixture follows within four days, and the squad's mean stored Condition, to one of Balanced, Match Preparation or Recovery; it never picks Heavy. A table test pins its outputs.
- [x] Delegate to Assistant and Take Over Schedule are registered `training`-scope Actions, shown one at a time in the bottom bar by delegation state, each carrying its `data-action-id`, and listed in the command palette.
- [x] The delegation flag survives reloading the career.
- [x] With delegation on, advancing past the club's Matchday writes the next microcycle's schedule before the next Pre-match Boundary, and exactly one News Message names the assistant, the template and the reason.
- [x] With delegation off, no advance writes a schedule.
- [x] While delegated, the session controls are disabled and the bottom bar's reason line says the assistant is planning.
- [x] No migration, table or CHECK change is made for the assistant; it stays a derived name.
- [x] `CONTEXT.md`'s Presence Staff entry lists the President, the Assistant Manager and the Physio, and says the Staff Profile and delegated training read the assistant.
- [x] Spec 106 §11 states that turning delegation on is the manager's standing acceptance of the assistant's schedules.
