# 10 — Refactor DataTable: extract scroll and keyboard hooks

Type: task
Status: claimed

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

- `DataTable.tsx` reduced to under 200 lines
- No boolean prop proliferation in table components
- `useScrollEdges` and `useTableKeyboard` hooks exist
- DataHeader and DataBody compound components exist
- `pnpm check:all` passes

## Answer

<!-- to be filled by implementation -->

## Comments

- The scroll edge detection is a good candidate for a hook since it may be reused in other table-like components.
- `enableShiftScroll` should be replaced with explicit component behavior.
- Consider whether the keyboard handler should be a custom hook for testability.