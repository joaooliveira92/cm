# New-game flow: sequence and screens

Type: prototype
Status: open
Blocked by: 01, 03, 05

## Question

Assemble the pieces into an ordered flow and make it concrete enough to react to. Today the entire
flow is one text field and a button in `apps/desktop/src/renderer/App.tsx`.

Build a rough, throwaway prototype of the path from launch to arrival at the club, and use it to
settle:

- **Order.** The seed doc's 03/04 order is world → manager → club. With world config out of scope,
  the candidates are manager-then-club or club-then-manager. Club-first frames the career and lets
  the manager be created "for" that club; manager-first matches the archetype being the more abstract
  choice. Which reads better in practice?
- **Screen count.** One combined creation screen, or a step sequence? Can the player go back and
  change an earlier step before committing?
- **Where world generation happens**, and what the player sees while it runs. Generating 20 squads is
  not instant, and 03/04's league-loading wait is a real part of its opening.
- **Arrival.** The doc's section 5 argues the drop into the full interface should be deliberately
  abrupt — full access, no ceremony. What is on screen at the moment the career starts, and is there
  anything between "club selected" and "Squad screen"?
- What the flow looks like for a **returning player** starting their second career, who should not
  have to read anything.

Link the prototype from this ticket as an asset; it is throwaway, not the spec.

## Constraints from ticket 01

- The manager creation step must capture a **manager name** as well as the Pillar Distribution.
  Nothing in the codebase holds one today (`save_meta.name` is the *save's* name); ticket 01 puts
  `manager_name` on `manager_profile`, so this flow is where it is collected. Whether it shares a
  screen with the Archetype choice is this ticket's call.
- The manager creation step submits **once**, atomically: the plus/minus allocation clicks are
  provisional UI state that is never persisted, so any "go back and change an earlier step" answer
  must keep the whole profile uncommitted until submit.
- Creation cannot complete with points unspent — the screen shows points remaining and enables
  submit only at exactly 12 allocated, with a contextual warning on any Pillar set to 1.
- `manager_profile` is written inside `createSave`'s transaction alongside world generation, so
  "where world generation happens" and "where the manager is committed" are the same moment.

See [Agent Note: Manager Pillars & archetype set](../../../.agents/notes/proposed/feature/2026-08-29-manager-pillars-and-archetypes.md).
