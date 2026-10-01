# 20: The tactics rules in the shared package

**What to build:** The pure rules every later slice reads, with no behaviour change in the app yet:
the Tactic Template and Tactic types (eleven slots of grid cells from the positional rules, an optional
run per slot, per-slot Player Instructions and set-piece roles, the nine Team Instructions and the team
set-piece instructions per side, and on the Tactic alone the assignments, bench, ordered taker lists
and captain); their validation (goalkeeper cell in slot 0 and nowhere else, eleven distinct cells,
Distribution only on the goalkeeper slot, no specific marking in a template or stored Tactic, every
value in its closed set); the 29 built-in templates with cells and runs exactly as the formations
research tabulates them; the row-count label and the "modified" test against the source template;
every instruction's value set with `team` or `default` first; CM's seven instruction templates with
the values transcribed in ticket 14; and the seeding rule (built-in slots take their cell's template
for the non-override instructions only).

Seam: pure functions; validation returns a typed list of problems rather than failing, so callers
decide what is an error. See [the spec](../spec.md), Testing Decisions, seam 1.

**Decisions:**

- **A slot is a CM grid cell with an optional run target; Player Instructions belong to the slot; built-in presets and saved tactics are one Tactic Template type with no players; the live Tactic is a template's contents plus assignments and bench, named by its source template, with "modified" and the row-count label derived; `ChangeTactics` carries the complete Tactic.** See [Agent Note](../../../.agents/notes/implemented/architecture/2026-09-29-tactic-templates-and-grid-cell-slots.md).
- **CM 03/04's nine team instructions, each defaulting to the game's unticked state, replace Mentality/Tempo/Pressing; Tactical Style presets are removed and the preferred formation is the manager's tactical identity.** See [Agent Note](../../../.agents/notes/implemented/feature/2026-09-29-cm-team-instructions-replace-sliders-and-styles.md).
- **CM 03/04's per-player screen exactly (five overrides with a `team` value, three standalone settings, seven normal/often switches), stored per slot; Distribution on the GK slot only; specific marking is match-time only; built-in templates seed each slot from CM's instruction template for its cell for the non-override instructions only, leaving the five overrides at `team`; no fit rating replaces Role Rating, and effects read the executing player's attributes.** See [Agent Note](../../../.agents/notes/implemented/feature/2026-09-29-cm-player-instructions-per-slot-without-a-fit-rating.md).

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Each of the 29 templates' cells and runs equals the research tables, by a table-driven test.
- [x] Validation rejects a goalkeeper outside slot 0, a duplicate cell, Distribution off the goalkeeper slot, and specific marking in a template, each with a named problem.
- [x] Row-count labels match (5-3-2 reads 3-2-3-2, its wing-backs standing in DM cells; 5-3-2 Sweeper folds SW into the back line).
- [x] Seeding gives a built-in striker slot the Striker template's switches and leaves all five overrides at `team`.
- [x] `pnpm check:all`'s fast gates (typecheck, lint, effect-lint) pass for the shared package, and its suite passes.

## Comments

2026-09-30: shipped in d8578d55. Verified: repo typecheck, oxlint and effect-lint (apart from a parallel
session's staged file) pass; the shared suite (638, 19 new) passes. The presets are checked against
the research table parsed at test time. The row-count example in the ticket and the tactic-templates
note was wrong and is corrected (5-3-2 reads 3-2-3-2; 4-4-2 Attacking reads 4-4-2).
