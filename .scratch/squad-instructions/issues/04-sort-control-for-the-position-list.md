# 04: a Sort control in the position list's toolbar

**What to build:** a Sort select in the Squad toolbar, shown for the position list layout. It sets
the same shared table sort the table headers set. This is the instruction's position-view `Sort ▼`
(§7.2, §10.3).

**Decisions:** from [01](01-reconcile-the-loose-squad-instruction.md).

- The list already sorts through the shared TanStack state (`SquadPositionList.tsx`'s doc comment),
  but only the command palette can change it; the list has no header to click. This adds the
  missing visible control. No second sort model.
- Options: Position, Name, Age, Overall, Condition, and from [02](02-contract-view.md), Wage,
  Contract ends and Transfer Value. Choosing the active option again flips its direction, the same
  cycle `onSortCycle` gives a header.
- The select is the vendored `Select`, placed with the View/Position/Status controls in
  `SquadTable.tsx`, and hidden for table layouts, whose headers sort.
- Sort state already persists (`useSquadSession`). Switching view keeps it.

**Blocked by:** 02

**Status:** resolved

## Tests

- Choosing Name orders the list by name, and choosing it again reverses it.
- Choosing Wage orders by the numeric wage (after 02).
- The select is absent in a table layout, and the chosen sort survives a switch to a table and back.

## Acceptance criteria

- [x] The position list's toolbar offers Sort with the options above, and the list reorders.
- [x] Table layouts show no Sort select, and sorting by header still works.
- [x] `pnpm check:all` is green, and the Squad e2e specs pass.

## Answer

Shipped `SquadSortSelect` (`renderer/squad/SquadSortSelect.tsx`), rendered in the Squad toolbar for the
position list layout only. It offers the eight columns and runs the shared `cycleSort` transition
through the screen's own `onSortCycle`, so it is that control relocated rather than a second sort:
ordering is TanStack's, over the same `squadColumns.tsx` accessors the headers use, and the state is
the same `useSquadSession` state. Ten unit tests and one Playwright spec.

**Two places the build departed from the ticket as written, both deliberate.**

- *Option labels.* The ticket named `Position` and `Overall`; the shared header map says `Positions`
  and `OVR`. It uses the header map, so an option can never disagree with the header it mirrors. The
  alternative was two label sources for one column.
- *`Positions` orders alphabetically by the rendered positions string*, so the list reads AMC, DC,
  DL, DM, DR, **GK**, MC — goalkeepers land in the middle. This is pre-existing: the `Positions`
  column header sorts through the same accessor. It is left alone deliberately, because the position
  representation is unsettled by
  [player-positional-model 03](../../player-positional-model/issues/03-canonical-positional-representation.md)
  and [08](../../player-positional-model/issues/08-compact-position-label.md), and 08 calls the label a
  derived projection — an ordering rule written now would be written against a rendering rule that is
  about to change. **Known limitation, not a decision.**

**One pre-existing limitation this control inherits rather than fixes:** clearing the sort is silent.
`onSortCycle` builds its announcement only when the next sort is non-null (`useSquadScreen.ts:296-299`),
so the third pick announces nothing. A table header's third click is equally silent; only the
command palette's `clearSortCommand` speaks. Left as found, since it belongs to the shared cycle.

**A note the change contradicted, corrected in the same commit.**
[the squad view selector and position list](../../../.agents/notes/proposed/feature/2026-09-07-squad-view-selector-and-position-list.md)
listed this control under `## Not done here`, with the reasoning that a sort dropdown "would be a new
control rather than a relocated one". That was a budget argument, and the budget was not the question:
a header row is a control, so the position list had lost the only affordance it had. The bullet is
gone and the correction is recorded in the note's `## Decision`, with the note linked from the
component.
