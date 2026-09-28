# 04 — Attribute threshold filter for the Squad table (Screen 71, attribute half)

**What to build:** A third filter on the owned Squad table, beside Position and Status: one
attribute at a minimum value, for example "Pace 15+". The rows shown are those whose exact figure for
that attribute is at least the chosen value.

**Decisions:** ruled in [ticket 03](03-attribute-filters.md).

- Owned Squad only. The any-club roster, the transfer tables and Player Search do not offer it.
- One attribute clause at a time, keyed on `_tag` like position and status. Choosing another
  attribute replaces it, and the three kinds coexist.
- The attribute is any key in `ALL_ATTRIBUTES`, whether or not its column is visible. The minimum is
  picked from 1–20. There is no range and no typed number.
- A figure that is not `exact` never matches.
- The control reuses the Position/Status Popover pattern in `SquadTable.tsx`. No new control grammar.

**Blocked by:** None.

**Status:** ready-for-agent

## Model

`apps/desktop/src/renderer/table/types.ts`: extend `FilterClause` with
`{ readonly _tag: "attribute"; readonly attribute: Attribute; readonly min: number }`, where
`Attribute` is the key type of `ALL_ATTRIBUTES` from `@cm-clone/shared`.

## Pure matching and helpers

`apps/desktop/src/renderer/table/features/filtering.ts`, beside `matchesStatus`:

- `attributeClause(attribute, min)`.
- `matchesAttribute(row, attribute, min)`. It narrows to a row carrying `attributes` (a
  `SquadRow`), then matches only when `row.attributes[attribute]` is `{ _tag: "exact" }` with
  `value >= min`. A row without attributes, a missing figure or a `range` figure does not match.
- `applyFilters`, `clauseId` and `clauseLabel` gain an `attribute` branch. The label reads the
  attribute's display name and the threshold, for example "Pace 15+", using the name the Squad
  column header uses.

## URL

The clause round-trips through the Squad screen's filter param beside `position` and `status`. An
unknown attribute key, or a minimum outside 1–20, decodes to no clause rather than to a broken one.

## Screen

- `apps/desktop/src/renderer/squad/SquadTable.tsx`: an Attribute Popover beside Status. Picking an
  attribute and then a minimum sets the clause. The trigger reads `Attribute` with no clause, or the
  clause label with one. It has a way to clear.
- `apps/desktop/src/renderer/squad/useSquadScreen.ts`: `setAttributeFilter(attribute, min)` and a
  clear that removes only the attribute clause, the way `setStatusFilter("")` removes only status.
  Expose them in `squadScreenTypes.ts`.

## Tests

- `matchesAttribute`: at the threshold matches, one below does not, a `range` figure does not, and
  a row with no attributes does not.
- `applyFilters` with position, status and attribute clauses together keeps only rows matching all
  three.
- URL round-trip of an attribute clause, and an unknown key or out-of-range minimum decoding to
  nothing.
- A renderer test: setting an attribute filter narrows the owned Squad, and clearing Position or
  Status leaves it in place, and the reverse.
- The any-club roster and the transfer tables render no Attribute control.

## Acceptance criteria

- [ ] The owned Squad's toolbar offers an Attribute filter. Choosing Pace and 15 shows only players
      whose exact Pace is 15 or more.
- [ ] Choosing another attribute replaces the clause, and clearing it leaves Position and Status alone.
- [ ] The filter survives a reload through the URL. A malformed attribute param is ignored.
- [ ] No other table offers it, and a non-exact figure never matches.
- [ ] The [Group E ledger](../../../docs/specs/group_e_squad_management/RECONCILIATION.md) gets an
      "attribute half" row beside the status-half row.
- [ ] `pnpm check:all` is green, and the Squad e2e specs pass.
