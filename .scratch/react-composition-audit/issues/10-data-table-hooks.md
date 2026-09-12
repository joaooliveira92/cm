# 10 — Refactor DataTable: extract scroll and keyboard hooks

Type: task
Status: resolved

> **Relabelled 2026-09-06 (tracker sweep).** This ticket was sitting at `Status: resolved` with its
> `## Answer` still holding the untouched `<!-- to be filled by implementation -->` placeholder, so
> no work had ever started on it. Ten of this effort's sixteen tickets were in that state.
> `claimed` is a lock -- [issue-tracker.md](../../../docs/agents/issue-tracker.md) has the frontier
> scan skip claimed tickets -- so the effort looked in progress while nothing could pick it up.
> **Still open and unstarted**, verified 2026-09-06 against the tree: none of the components,
> providers or hooks in its Done-When list exist yet. Moved to `ready-for-agent` so the frontier
> scan can see it.
## Problem

`DataTable.tsx` (400 lines) has several composition issues:

1. **Boolean prop proliferation** – `enableShiftScroll`, `busy`, `alertMessage`
2. **Prop drilling** – Receives 14 props, some of which could be lifted to context
3. **Multiple concerns mixed** – Row roving, sorting, scroll edges, keyboard handling
4. **Scroll edge detection** – Hardcoded logic that could be a reusable hook

## Solution

### Phase 1: Extract `useScrollEdges` hook
Create a reusable hook for scroll edge detection:

```tsx
interface useScrollEdgesReturn {
  hasScrollLeft: boolean
  hasScrollRight: boolean
  hasScrollUp: boolean
  hasScrollDown: boolean
  scrollX: number
  scrollY: number
}
```

### Phase 2: Extract `useTableKeyboard` hook
Extract keyboard navigation logic into a reusable hook.

### Phase 3: Split DataTable into DataHeader and DataBody
Split the table into compound components:

```tsx
// DataTableCompound
<DataTable.TableHeader>...</DataTable.TableHeader>
<DataTable.TableBody>...</DataTable.TableBody>
```

### Phase 4: Replace boolean props
- Remove `enableShiftScroll` boolean
- Use `DataTable.ScrollEdges` or component variants for different scroll behaviors
- Replace `busy` with explicit component state
- Replace `alertMessage` with inline rendering pattern

## Blocking

- Blocked by: None (can be worked independently)

## Done When

- [x] `DataTable.tsx` reduced to under 200 lines (86 lines)
- [x] No boolean prop proliferation in table components (`enableShiftScroll`, `busy`, `alertMessage` removed)
- [x] `useScrollEdges` and `useTableKeyboard` hooks exist
- [x] DataHeader and DataBody compound components exist
- [x] `pnpm check:all` passes (baseline: 2 pre-existing typecheck errors in unrelated test files, 19 pre-existing test failures — same baseline as HEAD)

## Answer

- [x] `DataTable.tsx` reduced from 408 to 86 lines — extracted scroll/kbd hooks and compound subcomponents.
- [x] `useScrollEdges` hook (`table/useScrollEdges.ts`) — reusable scroll-edge detection with resize listener.
- [x] `useTableKeyboard` hook (`table/useTableKeyboard.ts`) — keyboard navigation, row roving, selection, and optional Shift+Arrow scroll via `shiftScrollRef`.
- [x] `DataTableContext` (`table/DataTableContext.tsx`) — shared state/actions context for compound components.
- [x] `DataTable.Root` — owns the scroll container, edge fades, keyboard hook, scroll-offset restoration, and context provider.
- [x] `DataTable.Header` (`table/DataTableHeader.tsx`) — renders `<TableHeader>` with sortable headers.
- [x] `DataTable.Body` (`table/DataTableBody.tsx`) — renders `<TableBody>` with row roving, pinned columns, drag support.
- [x] Boolean props removed: `enableShiftScroll` (replaced by `onScrollCommit` presence), `busy` (replaced by `ariaBusy`), `alertMessage` (callers render Alert externally).
- [x] `TablePanel` and `SquadTable` updated to use the new compound API.
- [x] `status-column.test.tsx` import updated from `DataTable.js` to `useScrollEdges.js`.
- [x] Gate: typecheck, lint, effect-lint, verify-md-links, 144 table/squad tests all pass. Baseline pre-existing failures unchanged.

## Comments

- The scroll edge detection is a good candidate for a hook since it may be reused in other table-like components.
- `enableShiftScroll` should be replaced with explicit component behavior.
- Consider whether the keyboard handler should be a custom hook for testability.