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
