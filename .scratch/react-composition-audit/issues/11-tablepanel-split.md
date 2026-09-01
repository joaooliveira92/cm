# 11 — Refactor TablePanel: split into table content and filters

Type: task
Status: claimed

## Problem

`TablePanel.tsx` (239 lines) has several composition issues:

1. **Boolean prop proliferation** – `enableNameSearch`, `enablePositionFilter`, `busy`, `loadError`
2. **Prop drilling** – Receives 17 props from parent
3. **Multiple concerns mixed** – Loading states, filters, table content, error handling
4. **Filter management** – Filter logic mixed with panel structure

## Solution

### Phase 1: Create `TablePanelContent` compound component
Extract the table content portion:
- `TablePanelContent.Root` – the table container
- `TablePanelContent.Header` – sortable headers
- `TablePanelContent.Body` – table rows

### Phase 2: Create `TableFilters` compound component
Extract filter controls:
- `TableFilters.Search` – name search
- `TableFilters.Position` – position filter
- `TableFilters.Reset` – filter reset button

### Phase 3: Lift loading states to provider
Create `TableLoadingProvider` that manages:
- Loading states (busy)
- Error states (loadError)
- Loading progress

### Phase 4: Replace boolean props
- Remove `enableNameSearch`, `enablePositionFilter` booleans
- Use component variants: `TablePanel.SearchEnabled`, `TablePanel.PositionFilterEnabled`
- Replace `busy` with `TableLoadingProvider` loading state

## Blocking

- Blocked by: None (can be worked independently)

## Done When

- `TablePanel.tsx` reduced to under 100 lines
- No boolean prop proliferation in table panel components
- `TablePanelContent` and `TableFilters` compound components exist
- `TableLoadingProvider` exists
- `pnpm check:all` passes

## Answer

<!-- to be filled by implementation -->

## Comments

- The loading/busy state should be lifted if multiple panels need to share loading UI.
- Filter controls could be moved into `TableFilters` with `TablePanelContent` consuming them.
- The error handling could be extracted into `TablePanel.Error` variant.