# 04 — Split LeagueSelectionScreen into NationTree and SelectionSummary compound components

Type: task
Status: claimed

## Problem

`LeagueSelectionScreen.tsx` (822 lines) violates several composition patterns:

1. **Complex state** – Uses `useReducer` with complex state, plus 3 useState (index, loadError, warningPrompt)
2. **Boolean prop proliferation** – `expanded`, `dependencyOnly`, `matchesSearch`, `available`
3. **Prop drilling** – `NationTreeRow` receives 5 props
4. **Multiple concerns mixed** – League browsing, nation selection, simulation mode, scope selection, estimate calculation
5. **Monolithic reducer** – All transitions handled in a single reducer with implicit boolean state

## Solution

### Phase 1: Create `LeagueSelectionProvider`
Lift the reducer state into a provider context with a generic interface:

```tsx
interface LeagueSelectionState {
  index: number
  warnings: ReadonlyArray<string>
  loadError: string | null
  selectedNations: ReadonlySet<NationId>
  mode: "league" | "competition" | "depth"
}

interface LeagueSelectionActions {
  selectNation: (id: NationId) => void
  setMode: (mode: SelectionMode) => void
  estimate: () => SelectionEstimate
}
```

### Phase 2: Extract `NationTree` compound component
Create a `NationTree` compound component with:
- `NationTree.Root` – the tree container
- `NationTree.Row` – individual nation rows
- `NationTree.Search` – search input for filtering
- `NationTree.ExpansionControl` – expand/collapse controls

### Phase 3: Extract `SelectionSummary`
Create a `SelectionSummary` compound component that:
- Shows current selection
- Calculates and displays estimates
- Provides `SelectionSummary.Estimate` for inline use

### Phase 4: Replace boolean props with composition
- Remove `expanded`, `dependencyOnly`, `matchesSearch`, `available` from `NationTreeRow`
- Use explicit component variants: `NationRow.Available`, `NationRow.Blocked`, `NationRow.Selected`

## Blocking

- Blocked by: None (can be worked independently)

## Done When

- `LeagueSelectionScreen.tsx` reduced to under 200 lines
- No boolean prop proliferation in nation tree components
- `LeagueSelectionProvider` exists with generic state/actions/meta interface
- `NationTree` compound component exists
- `SelectionSummary` compound component exists
- `pnpm check:all` passes

## Answer

<!-- to be filled by implementation -->

## Comments

- The NationTree compound component should be reusable across other screens that show nation hierarchies.
- The reducer state is well-suited to live in a provider, since the selection affects downstream screens.
- Boolean props on NationTreeRow suggest it should be split into explicit variants or accessed via a `useNationRow` hook.