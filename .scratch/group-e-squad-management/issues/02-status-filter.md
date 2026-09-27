# 02 — Status filter for the Squad table (Screen 71, status half)

**What to build:** A second enumerated filter on the owned Squad table, beside Position: filter
visible rows by the engine-modelled **status** vocabulary. Today that vocabulary has one entry,
**Tired** (Condition below the engine's fatigue-injury threshold); the control grows automatically
as reserved slots become modelled, without a new filter kind.

**Decisions:**

- This is the in-v1 remainder of Group E Screen 71. The import asks for many filter axes; the
  [Group E ledger](../../../docs/specs/group_e_squad_management/RECONCILIATION.md) disposes all but
  this one, which it records as owed and unmodelled. The attribute half is split to
  [ticket 03](03-attribute-filters.md).
- Filter by the **status vocabulary**, not by raw Condition: a row matches status `X` when
  `statusesOf(row)` includes a status whose abbreviation is `X`. The catalogue and its `modeled`
  flag are the contract — `RESERVED_STATUSES` in
  [playerStatus.tsx](../../../apps/desktop/src/renderer/table/squad/playerStatus.tsx). Only
  `likelihood: "modeled"` entries are offered, so the filter cannot invent state (Mechanical
  Provenance; [dense-table-and-status-vocabulary](../../../.agents/notes/implemented/architecture/2026-08-31-dense-table-and-status-vocabulary.md)).
- The control reuses the shipped Position Popover in the career chrome's actions row — the button +
  `ACTIONS_ROW_ITEM_CLASS` pattern in `SquadTable.tsx`, under the adopted
  [visual design language](../../visual-design-language/spec.md). No new control grammar.
- One clause per kind, keyed by `_tag`, is the existing model (`upsertFilter`/`removeFilter`), so
  position and status coexist as two clauses. A status filter is owned-Squad only: rival club-squad
  rows disclose no Condition, so a status clause there would always match nothing.
- **One defect to fix in passing.** `setPositionFilter("")` currently calls `clearFilters()`, which
  clears *every* clause. That is only accidentally correct while position is the sole Squad clause;
  with a status clause it would wipe it. Clearing a dropdown must remove only its own clause.

**Blocked by:** None.

**Status:** ready-for-agent

## Model

`apps/desktop/src/renderer/table/types.ts` — extend `FilterClause`:

```ts
| { readonly _tag: "status"; readonly status: string }
```

Document that `status` carries a reserved-status **abbreviation** (`"Tir"` today), matched through
the status vocabulary, never compared as display text.

## Pure matching and helpers

`apps/desktop/src/renderer/table/features/filtering.ts`:

- `statusClause(status: string): FilterClause`.
- `matchesStatus(row: TableRowShape, status: string): boolean` — narrow to a Condition-bearing row
  without a cast (a small `"condition" in row` type guard) and defer to `statusesOf` from
  `../squad/playerStatus.js`, so the display rule and the filter rule cannot drift.
- `applyFilters` gains a `status` branch folding `matchesStatus`. Keep it generic over
  `R extends TableRowShape`; do **not** widen `TableRowShape` with a Condition field.
- `clauseId` gains a status arm (`filter.status.toLowerCase()`).
- `clauseLabel` gains a status arm returning the status's **full term** (look it up in
  `RESERVED_STATUSES`) — the palette row must read "Tired", never "Tir".
- `statusFilterActions(scope, tableId)` mapping every `modeled` status to an Action:
  id `filter-${tableId}-${abbreviation.toLowerCase()}`, label
  `Filter ${tableLabel(tableId)}: ${term}`, params `{ tableId, filter: statusClause(abbreviation) }`.

## Palette

`apps/desktop/src/renderer/table/paletteActions.ts` — append `statusFilterActions` **only when
`options.tableId === "squad"`**; the transfer tables and the any-club `club-squad` roster get none.
This mirrors the existing per-table option sets (`SQUAD_PALETTE_OPTIONS`, `MARKET_…`).

## Param classification

`apps/desktop/src/renderer/table/paramActions.ts` — add the `status` arm beside `nameSearch` and
`position`, returning a typed `{ _tag: "status", status }` clause.

## Persistence

`apps/desktop/src/renderer/navigation/list-state-storage.ts` — encode as `status:<abbr>` and decode
with `^status:(.+)$`, so the clause survives back/forward like the others.

## UI

`apps/desktop/src/renderer/squad/SquadTable.tsx` — add a Status Popover beside Position in the
`toolbarControls` memo, same classes and shape. Trigger reads `Status` (no clause) / `Status:
{term}`. Items: `Any status` plus each modelled status by term. Add the new action to the memo's
dependency list.

`apps/desktop/src/renderer/squad/useSquadScreen.ts` — add `setStatusFilter(status: string)` built on
`upsertFilter`/`removeFilter` + `applyFilter`; fix `setPositionFilter("")` to remove only the
position clause. Expose `setStatusFilter` in `squadScreenTypes.ts`. The existing palette
live-handler loop over `tableSortAndFilterActions(SQUAD_PALETTE_OPTIONS)` already registers every
enumerated row once classification knows the `status` tag.

## Tests

Mirror `apps/desktop/test/renderer/table/sort-filter.test.ts` and
`apps/desktop/test/renderer/navigation/list-state-storage.test.ts`:

- `matchesStatus` matches a below-threshold row and rejects an at/above-threshold one (boundary
  against `NON_CONTACT_CONDITION_THRESHOLD`).
- `applyFilters` folds position **and** status.
- `upsertFilter` keeps the status and position clauses side by side; `removeFilter` drops one.
- Encode/decode round-trips `status:Tir`; an unknown tag still drops silently.
- `classifyTableParamAction` classifies a status param to `set-filter`.
- The Squad palette contains `filter-squad-tir`; the Market palette does not.
- A component/renderer test: clearing Position leaves an active Status filter in place (regression
  for the `clearFilters()` conflation).

## Out of scope

- Attribute filters → [ticket 03](03-attribute-filters.md).
- Team, registration, selection, and age filters, and saved filter presets — deferred on absent
  models or the v1 exclusion, per the ledger.
- Filtering rival squads by fitness — no Condition is disclosed.

## Acceptance criteria

- [ ] Squad's toolbar offers a Status filter; choosing Tired shows only players whose Condition is
      below the fatigue threshold; "Any status" clears **only** the status clause.
- [ ] Clearing or changing Position does not discard a Status filter, and vice versa.
- [ ] The Status filter is offered on the owned Squad only; transfer tables and the any-club roster
      do not offer it.
- [ ] A status clause round-trips through the URL (`status:Tir`).
- [ ] Palette rows carry typed params and dispatch through `classifyTableParamAction`.
- [ ] The pure tests above pass, and `pnpm check:all` is green.

## Comments

- Filed 2026-09-27. The Group E ledger records this ticket as owed; the effort's own `map.md` called
  for it and none was filed. The "cheap screen" claim in the ledger holds only for this status half
  — the attribute half is [ticket 03](03-attribute-filters.md), which needs a ruling first.
