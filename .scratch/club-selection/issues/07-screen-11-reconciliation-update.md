# 07 — Screen 11 reconciliation update

Type: task
Status: open

Blocked by: 03, 04, 05, 06

## Question

Which rows of the Screen 11 reconciliation register does this effort change, and what do they
say afterwards?

`docs/specs/group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md` records
Screen 11 as `Reviewed`, with row 298 marking the mode selector, availability states,
eligibility explanations, accessible row semantics, and autosave grouping as `contradicted`
against an implementation described as "a static `<ul>` of club cards … with no selection
affordance", and row 302 marking keyboard interaction `deferred`.

This effort invalidates the description those rows are built on. The register must be
reconciled in the same effort that changes the code, not in a later pass — a register that
describes a screen that no longer exists is worse than no register.

The work: restate the rows this effort's decisions touch, keep the rows for genuinely
out-of-scope spec sections (search and filter, the eligibility model, the Clubs / National
Teams / Unemployed mode selector, unemployed starts) as deliberate deviations with the reason,
and link the Agent Notes this map produced.
