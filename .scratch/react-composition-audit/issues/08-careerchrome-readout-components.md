# 08 — Refactor CareerChrome: extract readout components and use context

Type: task
Status: claimed

## Problem

`CareerChrome.tsx` (242 lines) has several composition issues:

1. **Boolean prop proliferation** – `disabled`, `busy`, `continueDisabled`
2. **Multiple concerns mixed** – Season readout, match readout, continue action, navigation
3. **Prop drilling** – `Navbar` receives 4 props
4. **No context pattern** – Career state not lifted, making it hard to share across screens

## Solution

### Phase 1: Extract readout components
Create explicit variant components for career readouts:
- `SeasonReadout` – shows current season
- `MatchReadout` – shows current match
- `ContinueAction` – the continue button

### Phase 2: Create `CareerStateProvider`
Lift career state into a provider context that any component can consume:

```tsx
interface CareerState {
  season: number
  match: MatchSummary | null
  disabled: boolean
  busy: boolean
}

interface CareerActions {
  continue: () => void
}
```

### Phase 3: Replace boolean props
- Remove `disabled`, `busy`, `continueDisabled` from CareerChrome
- Use explicit component variants for different career states

### Phase 4: Extract Navbar
Move the Navbar into a compound component that consumes CareerStateProvider.

## Blocking

- Blocked by: None (can be worked independently)

## Done When

- `CareerChrome.tsx` reduced to under 100 lines
- No boolean prop proliferation in chrome components
- `CareerStateProvider` exists
- Readout components are explicit variants
- `pnpm check:all` passes

## Answer

<!-- to be filled by implementation -->

## Comments

- The career state should be lifted if multiple screens need to show the same career info.
- The `disabled`/`busy` flags suggest the continue action should be a compound component with its own state.
- Consider whether the Navbar should consume the CareerStateProvider directly.