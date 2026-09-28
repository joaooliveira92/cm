# Spec: training schedule and delegation

**Status:** ready-for-agent

From the human's rulings of 2026-09-28 on [01](issues/01-weekly-training-schedule.md) and
[02](issues/02-delegate-schedule-to-assistant.md). Sliced into [03](issues/03-schedule-screen-and-persistence.md),
[04](issues/04-schedule-moves-condition.md) and [05](issues/05-delegate-to-assistant.md).

## Problem Statement

Training in a career is a per-player Training Focus set once and read at Season conclusion. Nothing
the manager does between two Matchdays changes how the squad arrives at the next one. A congested
run and a free week play out the same, and there is no way to hand routine planning to the backroom.
The bottom bar's Training verbs (Reset Schedule, Delegate to Assistant) were proposed and could not
be built, because there was no schedule for them to act on.

## Solution

The manager plans the **microcycle**, the gap between the club's last Matchday and its next Fixture,
as a short list of training sessions. Heavier sessions leave players less recovered at the next
kickoff; recovery sessions leave them fresher. The manager picks a template or sets each session, saves
it from the bottom bar, and can reset an unsaved draft. A manager who doesn't want the chore hands
the schedule to the Assistant Manager, who picks a template before every Fixture by a fixed Best
Practice rule and reports each choice in the News Inbox. The manager can take the schedule back at
any time.

## User Stories

1. As a manager, I want to see the sessions planned before my next Fixture, so that I know how the squad is preparing.
2. As a manager, I want the next Fixture named beside the plan, so that I plan against the right match.
3. As a manager, I want to set each session's type (tactical, technical, physical, recovery or rest), so that I shape the week.
4. As a manager, I want to set each session's intensity (low, medium or high), so that I can push or protect the squad.
5. As a manager, I want to apply a named template in one step, so that I don't set every session by hand.
6. As a manager, I want applying a template to change only my draft, so that I can review it before saving.
7. As a manager, I want Save Schedule in the bottom bar, so that saving sits where every screen's verbs sit.
8. As a manager, I want Reset Schedule in the bottom bar to throw away my unsaved changes, so that I can start again from what's saved.
9. As a manager, I want Reset Schedule disabled when there's nothing to reset, so that the button never lies.
10. As a manager, I want my saved schedule to survive quitting and reloading the career, so that I don't redo it.
11. As a manager, I want to be told when someone else saved the schedule since I opened it, with a Refresh that keeps my draft until I choose, so that I never lose work silently.
12. As a manager, I want a new career to start on a Balanced schedule that plays exactly like the game did before, so that ignoring the feature costs me nothing.
13. As a manager, I want a heavy schedule to leave my players less recovered at the next kickoff than a recovery schedule, so that the choice matters.
14. As a manager, I want to see each player's projected Condition at the next kickoff under my draft compared with the saved schedule, so that I can judge the trade-off before saving.
15. As a manager, I want the schedule's effect to stay smaller than my Regimen Pillar's, so that my manager's character still matters more than one week's plan.
16. As a manager, I want the schedule never to change my players' long-term development, so that my Training Focus choices keep the meaning they have.
17. As a manager, I want the Training Overview to show which template I'm on or "Custom", so that I see the plan at a glance.
18. As a manager, I want Delegate to Assistant in the bottom bar, so that I can hand the schedule over in one step.
19. As a manager, I want the assistant to set a schedule before every Fixture while delegation is on, so that I don't have to.
20. As a manager, I want a News Message naming the assistant, the template and the reason each time they set a schedule, so that I'm never guessing what happened.
21. As a manager, I want the schedule screen to say "Planned by you" or "Planned by {assistant}", so that I know who is in charge.
22. As a manager, I want the session controls read-only while delegated, with the reason in the bottom bar, so that I don't edit something that will be overwritten.
23. As a manager, I want Take Over Schedule in the bottom bar while delegated, so that I can take control back.
24. As a manager, I want the assistant never to overwrite a schedule I edited, so that my own plan is safe.
25. As a manager, I want the assistant's choice to be predictable from the fixtures and the squad's Condition, so that delegation is trustworthy.
26. As a manager, I want the Assistant Manager's Staff Profile to say they plan training when I've delegated, so that the assistant is a person, not a switch.
27. As a keyboard user, I want every schedule control and bottom-bar verb reachable and operable without a mouse, so that the screen meets the app's Level 1 guarantees.
28. As a command-palette user, I want Save Schedule, Reset Schedule, Delegate to Assistant and Take Over Schedule listed as Actions, so that I can reach them from anywhere in the Training area.

## Implementation Decisions

- The schedule attaches to the microcycle between the club's Matchdays, with no daily or weekly clock. See [Agent Note](../../.agents/notes/proposed/architecture/2026-09-28-training-schedule-attaches-to-the-microcycle.md).
- The schedule moves between-match Condition recovery only, bounded inside Regimen's range, never Player Development. See [Agent Note](../../.agents/notes/proposed/feature/2026-09-28-training-schedule-moves-condition-only.md).
- The assistant stays Presence Staff and applies one uniform Best Practice rule. See [Agent Note](../../.agents/notes/proposed/architecture/2026-09-28-assistant-delegation-stays-a-presence-rule.md).
- Turning delegation on is the manager's consent under spec 106 §11, and every automatic write raises a News Message. See [Agent Note](../../.agents/notes/proposed/feature/2026-09-28-turning-delegation-on-is-the-consent.md).
- **The schedule model is pure and lives in the shared rules package.** It defines the closed set of session types and intensities, the fixed slot count (five), the named templates (Balanced, Match Preparation, Recovery, Heavy), each session's recovery weight, and one function from a schedule to its recovery modifier. Balanced's modifier is exactly 1. Every modifier lies within 0.9 to 1.1, inside Regimen's 0.8 to 1.2.
- **The modifier multiplies today's recovery step.** Between-match recovery stays the fixed seven-day step per Matchday, keyed to Natural Fitness and injury Severity; the schedule multiplies the gain of that step for the human club's players. AI clubs, which have no schedule, recover at a modifier of 1. Recovery following the real gap length is not part of this spec.
- **Storage.** One schedule per human-managed club in a new table: its slots, its template name (or none for custom), a revision, and the delegation flag (added by 05). A missing row reads as Balanced, so no seeding step is needed at career creation and old saves are not migrated.
- **Contract.** A read returns the schedule, its revision, the next Fixture it plans for, and a projected Condition per player at that Fixture. A write takes the schedule, an expected revision and a request id, returns the new revision, and fails with a typed revision-conflict error carrying the current revision, the same shape as the Tactic write. The delegation toggle (05) is a write of the same kind.
- **Events.** Every saved schedule, whether the manager's or the assistant's, appends a Club-stream event naming its author. The News Inbox words the assistant's events as messages; it adds no messages table, per the existing inbox-as-projection decision.
- **The assistant's rule** is a pure function from the microcycle's context (days to the next Fixture, whether another Fixture follows within four days, and the squad's mean stored Condition) to one template: Recovery when Condition is low or Fixtures are congested, Match Preparation before a short gap, Balanced otherwise, and never Heavy. It runs inside the Calendar advance that crosses the club's Matchday, before the next Pre-match Boundary.
- **Screen.** A Training Schedule screen under the Training area, reached from the Training Overview, in the `training` screen scope. Session type and intensity are native selects. Edits make a draft against the revision it was read at, as the Tactics editor does.
- **Bottom bar.** The screen registers its verbs through the career shell's screen bottom-bar registry as registered `training`-scope Actions: Save Schedule and Reset Schedule (03), and Delegate to Assistant or Take Over Schedule (05). Continue keeps the bar's primary zone.
- **Glossary.** `CONTEXT.md` gains Microcycle, Training Schedule and Training Session in 03. Its Calendar entry's "no training content" clause is amended in 03. Its Regimen and Condition entries name the schedule modifier in 04. Its Presence Staff entry gains the Assistant Manager in 05.

## Testing Decisions

- Test behaviour at the highest seam: the pure schedule model and the assistant's rule in the shared rules package, the main-process handlers through the same SQL-backed test harness the Tactic write uses, and the screen through the renderer harness that mounts the career shell.
- The pure model's tests assert: Balanced gives exactly 1; every schedule's modifier stays inside the band; a heavier schedule gives a lower modifier than a lighter one. Prior art: the Manager Pillar modifier tests.
- The recovery tests assert that a season advanced with no schedule produces exactly the Condition values it did before the change, and that a Recovery schedule leaves a player fresher than a Heavy one from the same state.
- The assistant's rule is tested as a table of inputs to templates; the same inputs always give the same template.
- The screen tests assert that each bottom-bar verb carries the `data-action-id` of a registered Action, following the Tactics inventory test, and that a stale save shows the conflict with Refresh and keeps the draft, following the Tactics save-conflict test.
- Player Development's output for a Season does not change with the schedule; one test pins that.

## Out of Scope

- Any effect of the schedule on Player Development, Training Focus, the Coach or Technical Coaching.
- A daily or weekly Calendar clock.
- An Assistant Manager quality, a stored assistant row, or any `staff_role` change.
- Schedules for AI clubs.
- Training units (Screen 107), training camps (117), position and role training (109), traits (110), mentoring (115), youth intake (116).
- Recovery that follows the real length of the gap between Fixtures.

## Further Notes

- `CONTEXT.md` says Regimen modifies between-match Condition recovery, but no recovery code reads it at HEAD: the Pillar is snapshotted at kickoff and never applied between matches. That is a separate defect. The schedule's band is fixed inside Regimen's range by construction, so this spec does not depend on the fix.
- Session effect weights are balance numbers, a design decision to be tuned in play, not a research finding.
