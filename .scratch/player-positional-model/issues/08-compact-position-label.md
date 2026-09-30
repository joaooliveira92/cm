# 08: The compact position label

Type: grilling
Blocked by: 01, 03
Status: resolved

## Question

Labels such as `D/WB L`, `D/DM RC` and `AM/F RC` are a derived projection of a player's ratings,
never a persisted identifier. Specify the deterministic rendering rule, taking ticket 01's findings
as the reference behaviour:

- the rating threshold for a line or a side to appear;
- line order, side order (`RC` or `CR`, `RLC`), and slash placement;
- how GK and SW render, and any suppression of the side;
- what happens when the ratings do not form a clean grid, if the representation (03) allows it.

The rule lives in `packages/shared` beside the rating rules, so the renderer and any main-process
surface render one label. Include a table of worked examples; they become the rule's tests.

## Answer

**CM Scout's reconstruction exactly: threshold 15, GK short-circuit, SW/D/DM/M/AM/F-or-S with its
M and AM suppression, the F/S rule, no WB, sides in R-L-C order after a space.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-29-compact-position-label-follows-cm-scout.md).
