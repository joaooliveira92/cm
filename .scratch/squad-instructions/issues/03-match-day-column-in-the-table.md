# 03: the table layouts show the match-day indicator the position list leads with

**What to build:** a leading "match-day" column on the Squad table layouts showing the same indicator
the position list draws at the head of each row: the starter's slot code, the bench slot, or an
empty chip for "not selected". This is the instruction's Pkd column (§9.4) for the table views.

**Decisions:** from [01](01-reconcile-the-loose-squad-instruction.md).

- Reuse `SelectionIndicator` from `SquadPositionList.tsx`. Move it to its own module, so both
  layouts import one component and share its accessible names: "Playing (DC)", "On the bench",
  "Not selected".
- It reads the same lineup draft `MatchDayBar` edits, through the Squad provider. It is read-only
  here as it is in the list: selection still happens by dragging onto a slot.
- The column is protected (always visible, like the pinned pair in `visibility.ts`) and not
  sortable. The row's single focusable control stays the name button, so the indicator must not add
  a tab stop. Check its `Button` against the level-1 spec and the table's roving model.

**Blocked by:** None.

**Status:** ready-for-agent

## Tests

- A renderer test: with a starter, a bench player and an unselected player, the table's indicator
  names each state, and matches what the position list shows for the same draft.
- Moving a player in `MatchDayBar` updates the table indicator without a reload.
- `level1-a11y` and the table keyboard specs still pass: no new tab stop per row.

## Acceptance criteria

- [ ] Every table preset leads with the match-day indicator, and the position list is unchanged.
- [ ] One `SelectionIndicator` component serves both layouts.
- [ ] `pnpm check:all` is green, and the Squad e2e specs pass.
