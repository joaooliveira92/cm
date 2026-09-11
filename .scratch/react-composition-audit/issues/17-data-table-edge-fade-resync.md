# 17 — Restore the DataTable edge-fade re-sync that ticket 10 dropped

Type: bug
Status: ready-for-agent

**Blocked by:** none.

## Symptom

The horizontal overflow fades on every shared table only measure on mount and on window resize.
Scrolling the table, loading its rows, and toggling Squad column visibility leave them stale:

- Market and Free Agents measure before any rows exist, so the right fade never appears once rows
  load, until the window is resized.
- Trackpad or wheel scrolling never turns the left fade on or the right fade off.
- Squad restores a saved `initialScrollLeft` *after* measuring, so a remount with a saved offset
  shows no left fade.

Found by the reviewer on [desktop-suite-red 01](../../desktop-suite-red/issues/01-select-primitive-breaks-filter-tests.md),
2026-09-10. Not reproduced in a running app; established by reading the code against its
pre-refactor version.

## Cause

`f464885` (ticket 10, the `useScrollEdges` / `useTableKeyboard` extraction) moved the measurement
into `useScrollEdges` but dropped all three of its re-sync triggers. Before, in `DataTable.tsx`:

| Trigger | Before `f464885` | Now |
|---|---|---|
| Re-measure on rows / visible columns | effect deps `[syncEdges, rows.length, table.getVisibleFlatColumns().length]` | `useScrollEdges(scrollRef)` with no `extraDeps` |
| Re-measure on scroll | `onScroll={syncEdges}` on the scroll container | no scroll handler; the hook does not return `syncEdges` |
| Re-measure after Shift+Arrow | `syncEdges()` after setting `scrollLeft` | not called in `useTableKeyboard` |

The restore-then-measure order also flipped: the `initialScrollLeft` restore now runs after the
measuring layout effect.

Tests stayed green because only the pure `scrollEdges` rule is covered; no component or e2e spec
reads `data-scroll-edge`.

## What to build

- `useScrollEdges` also returns `syncEdges`; the scroll container gets `onScroll={syncEdges}`. A
  programmatic `scrollLeft` write fires `scroll`, so this also covers Shift+Arrow and the restore.
- `DataTableRoot` passes `[orderedIds.length, table.getVisibleFlatColumns().length]` as `extraDeps`.
  `table` is still a `DataTableRootProps` prop that both callers pass; read it again rather than
  removing it.
- Update the stale pointer in
  [the dense-table decision record](../../../.agents/notes/implemented/architecture/2026-08-31-dense-table-and-status-vocabulary.md),
  which still says the `scrollEdges` rule lives in `DataTable.tsx`. It lives in `useScrollEdges.ts`.

## Acceptance criteria

- [ ] A jsdom component test stubs `scrollWidth` / `clientWidth`, fires `scroll`, and asserts the
      `data-scroll-edge` fades update. It fails at the current `HEAD`.
- [ ] A test covers rows arriving after mount (empty → populated) turning the right fade on.
- [ ] Mounting with a saved `initialScrollLeft` shows the left fade.
- [ ] `pnpm check:all` passes.
