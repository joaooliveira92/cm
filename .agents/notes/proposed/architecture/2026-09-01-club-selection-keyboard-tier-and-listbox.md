# Agent Note: Club Selection is a level-2 listbox, not a DataTable

Status: proposed

## Problem

The Club Selection screen is assigned **level 1** ("zero interactive controls — read-only card
list") in the [screen keyboard tiers](../feature/2026-08-29-screen-keyboard-tiers.md) table. That note's own
rule makes level 1 conditional on the screen having no interaction beyond nav/back, and its risk
section says the assignment "must be revisited" when the screen gains controls. This effort turns
the static list into a selection surface — a selectable list, a `Pick a team for me` assist
button, and a Continue gate on having picked (ticket 02) — so level 1 no longer holds, and "a list
you can only click" would be a regression against a keyboard-first renderer.

The renderer already owns roving machinery: `renderer/table/DataTable.tsx` implements row-oriented
roving on a native `<table>` (no ARIA grid), selection separate from focus, Enter as the row
primary action; `renderer/focus.ts` owns `rovingTabIndex`, `focusIdOf`, semantic targets, and
focus bookmarks; `mainMenu.tsx` is the bespoke roving-list precedent. The question is which tier
the screen commits to and which of these it builds on.

## Proposal

**The screen lands at level 2**, and the club list is a **bespoke `role="listbox"`** built on the
renderer's roving primitives — not a `DataTable`.

- **Level 2.** The tiering rule fires mechanically: an interactive control beyond nav/back
  (the list's rows, the assist button) forces level 2 minimum. Level 3 is not warranted: a flat
  twenty-row selection list is roving, not the grid or dense multi-row table interaction level 3
  exists for. This updates the Club Selection row of the screen-keyboard-tiers note from 1 to 2
  (the note's table is the home of the tier fact), mirroring the Save List level-2 assignment.
- **Bespoke listbox, not `DataTable`.** Semantics: `role="listbox"` with `aria-selected` options
  and a roving tabindex (real focus moves, per the renderer's convention), reusing `rovingTabIndex`
  and `focusIdOf` from `renderer/focus.ts` and the `mainMenu.tsx` roving pattern. Not
  `aria-activedescendant`: nothing in this renderer uses it. Not `DataTable`: that component is
  TanStack column machinery — sortable headers, pinned columns, dense table visuals — for 30-column
  Squad/Market tables; the club rail is a flat three-fact list (name, stature tier, squad-quality
  meter) with no headers, no sorting, and no columns, so a `DataTable` wrap would drag all of that
  along for nothing. Rowing behaviour is the DataTable model nonetheless: ↑/↓ rove, Home/End to
  the ends, Enter activates (selects the focused row), Space toggles selection (focus and selection
  are separate), Tab moves in and out.
- **Focus order: club list → `Pick a team for me` → Cancel (shell header) → `Next: Review` (shell
  footer).** The degenerate league selector is a *disabled* native `<select>` (ticket 04 decision),
  so it is not in the tab sequence. Cancel and Continue live in the creation shell's chrome
  (`createFlow.tsx`), not in the club screen component, so focus order is a screen-level fact.
- **The detail panel carries one polite live region.** When the shown club changes — via the pick
  button, whose fires are announced there — the panel announces the club now shown (e.g. "Picked X.
  The panel shows X."), deduplicated like `DataTable`'s single `role="status"` announcer. Arrow
  navigation across the listbox does not narrate per row; the listbox's `aria-selected` carries the
  current selection, and the panel's live region announces only a *change in what the panel shows*.
- **No key binding for `Pick a team for me`; no Clear Selection this effort.** The creation steps
  deliberately own no `g`/global keys — `navigation/destinations.ts` records them as a
  "focused-control flow by design" — and `allActions.ts` registers no creation-scope actions. A
  global key that fires a *random* suggestion is a surprise to a keyboard user, and roving + Enter
  already gives full keyboard equivalence for picking. Clear Selection (imported Screen 11 §31)
  belongs to the multi-select/search organisation browser this effort keeps out of scope: here there
  is one club, Continue is gated on a pick (ticket 02), and roving to another row and pressing Enter
  *is* clearing-and-replacing. Both are reconciliation-register deviations (ticket 07 records them),
  not shipped affordances.

## Alternatives considered

- **DataTable reuse.** Rejected: the row-roving and select-vs-focus split it owns are wanted, but
  they come welded to TanStack table state, sortable headers, pinned cells, and dense-table
  styling that a three-fact flat list with no sorting or columns would carry unused. `mainMenu.tsx`
  shows the renderer's lighter-weight bespoke roving path.
- **`aria-activedescendant` composite.** Rejected: the renderer's established model is real roving
  focus with a moved tab stop (`focus.ts`, DataTable row buttons, `mainMenu.tsx`); no screen in the
  repo uses `aria-activedescendant`, and introducing its separate focus-management regime here
  would fork keyboard behaviour from every other list.
- **Level 1, unchanged.** Rejected: the tier note's own threshold fires — the screen left the
  zero-control class. Keeping level 1 would leave the selection affordance mouse-only.
- **Level 3.** Rejected: no grid, no dense multi-row interaction; roving over a flat list is level
  2's domain, matching the Save List precedent.
- **A binding for the assist.** Rejected: creation screens own no global keys by design, and a key
  that silently re-rolls a random suggestion is worse than no key. Roving + Enter covers picking.
- **A Clear Selection affordance.** Rejected: single-select with gated Continue makes a dedicated
  clear redundant (re-pick replaces), and the spec section it would serve is out of scope.
- **No live region on the panel.** Rejected: the pick changes the panel under a user whose hands
  never moved, so the panel change must be spoken; the single-polite-announcer shape keeps the
  narration to one line.

## Acceptance criteria

- The screen-keyboard-tiers note's table lists Club Selection at level 2 with a rationale.
- The club list is a `role="listbox"` with one roving tab stop; rows are options with
  `aria-selected`; ↑/↓ rove, Home/End jump, Enter selects the focused row, Space toggles selection,
  Tab moves in and out.
- Tab order reaches exactly list → `Pick a team for me` → Cancel → `Next: Review`; the disabled
  selector is skipped.
- The detail panel has exactly one polite announcer that updates when the shown club changes;
  arrow navigation does not narrate per row.
- No `g`/global binding and no Clear Selection control ship with this screen; both are recorded as
  deliberate deviations in the Screen 11 reconciliation register.
- RECONCILIATION.md's keyboard row for Screen 11 no longer reads `deferred` against level 1 (ticket
  07 restates it at level 2).

## Risks

- **The tier fact has two homes.** The tiers-note table and this note both state level 2; the table
  stays canonical and this note cross-links it. A future screen change that re-tiers Club Selection
  must update the table or the stale-row problem recurs.
- **`aria-selected` plus a meter.** The row's accessible name must keep name and stature tier and
  not let the squad-quality meter dominate the screen-reader output.
- **The panel announcer fires only on *change*.** A screen-reader user hears nothing at rest; that
  is correct (no narration per arrow), but the pick's announcement is the only live signal, so it
  must be phrased to name the club and the panel.

## Related

- Ticket: `.scratch/club-selection/issues/06-keyboard-and-accessibility-tier.md`
- The tier table this updates:
  [Screen keyboard tiers](../feature/2026-08-29-screen-keyboard-tiers.md)
- The roving machinery this reuses:
  [Intra-screen focus model](2026-08-29-intra-screen-focus-model.md)
- The DataTable model this deliberately does not adopt:
  [Table and grid navigation](../../implemented/feature/2026-08-29-table-and-grid-navigation.md)
- The assist the panel announces:
  [`Pick a team for me` is an unseeded, exclusion-rolled assist](2026-09-01-pick-a-team-for-me-semantics.md)
- Selection state and Continue gating that make Clear Selection redundant:
  [The club selection is bound to the world it was picked from](2026-09-01-club-selection-bound-to-its-world.md)
- Layout this focus order runs through:
  [The Club Selection two-column workspace](2026-09-01-club-selection-workspace-shape.md)