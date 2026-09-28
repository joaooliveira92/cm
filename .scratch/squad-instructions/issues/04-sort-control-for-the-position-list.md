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

**Status:** ready-for-agent

## Tests

- Choosing Name orders the list by name, and choosing it again reverses it.
- Choosing Wage orders by the numeric wage (after 02).
- The select is absent in a table layout, and the chosen sort survives a switch to a table and back.

## Acceptance criteria

- [ ] The position list's toolbar offers Sort with the options above, and the list reorders.
- [ ] Table layouts show no Sort select, and sorting by header still works.
- [ ] `pnpm check:all` is green, and the Squad e2e specs pass.
