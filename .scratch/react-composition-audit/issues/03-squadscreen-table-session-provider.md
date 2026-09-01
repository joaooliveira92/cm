# 03 — Refactor SquadScreen: lift table state into TableSessionProvider

Type: task
Status: claimed

## Problem

`SquadScreen.tsx` (637 lines) has several composition issues:

1. **Excessive state** – 9 useState calls (sort, filters, activeId, selectedId, bookmark, scrollLeft, legendExpanded, preferences, announcement) all in one component
2. **Boolean prop proliferation** – `enableShiftScroll`, `busy`, `legendExpanded`
3. **Prop drilling** – `DataTable` receives 14 props from the screen
4. **Pattern duplication** – Similar to TransfersScreen for table management but with separate state handling
5. **Mixed concerns** – Column preferences, row selection, scroll management, legends, announcements

## Solution

### Phase 1: Create `TableSessionProvider` context
Lift shared table session state into a provider that can be used by both SquadScreen and TransfersScreen:

```tsx
interface TableSessionState {
  sort: SortState | null
  filters: TableFilterState
  activeId: string | null
  selectedId: string | null
  scrollLeft: number
  preferences: ColumnPreferences
}

interface TableSessionActions {
  setSort: (sort: SortState | null) => void
  setFilter: (filter: TableFilterState) => void
  setActive: (id: string | null) => void
  setSelected: (id: string | null) => void
  setScrollLeft: (x: number) => void
  setPreferences: (prefs: ColumnPreferences) => void
}
```

### Phase 2: Extract column preference hook
Create `useColumnPreferences` custom hook that manages visibility, ordering, and width of columns. This hook can be shared with other table components.

### Phase 3: Replace boolean props with composition
- Remove `enableShiftScroll`, `busy` boolean flags
- Use explicit component variants for different table modes
- Extract `TableLegend` as a compound component with context

### Phase 4: Extract announcement system
Move the announcement logic into a `useTableAnnouncement` hook that can be consumed independently.

## Blocking

- Blocked by: None directly, but benefits from shared `TableSessionProvider` pattern also used by TransfersScreen refactor

## Done When

- `SquadScreen.tsx` reduced to under 200 lines
- No boolean prop proliferation in squad components
- `TableSessionProvider` context exists
- Column preferences managed via `useColumnPreferences` hook
- `DataTable` prop count reduced
- `pnpm check:all` passes

## Answer

<!-- to be filled by implementation -->

## Comments

- The shared TableSessionProvider pattern between SquadScreen and TransfersScreen should be designed together to avoid divergent implementations.
- Column preferences could live in effect-atom or local storage and be managed by the provider.
- The legend expanded state is a good candidate for lifting — it could be toggled from outside the table (e.g. from a preferences dialog).