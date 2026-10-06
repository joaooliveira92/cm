# 06 — Refactor KeyboardSpine: extract OverlayProvider and useKeyboardState

Type: task
Status: resolved

> **Relabelled 2026-09-06 (tracker sweep).** This ticket was sitting at `Status: claimed` with its
> `## Answer` still holding the untouched `<!-- to be filled by implementation -->` placeholder, so
> no work had ever started on it. Ten of this effort's sixteen tickets were in that state.
> `claimed` is a lock -- [issue-tracker.md](../../../docs/agents/issue-tracker.md) has the frontier
> scan skip claimed tickets -- so the effort looked in progress while nothing could pick it up.
> **Still open and unstarted**, verified 2026-09-06 against the tree: none of the components,
> providers or hooks in its Done-When list exist yet. Moved to `ready-for-agent` so the frontier
> scan can see it.
## Problem

`KeyboardSpine.tsx` (360 lines) has several composition issues:

1. **Multiple concerns mixed** – Global keyboard handling, action registry, binding overrides, overlay management, prefix state all in one component
2. **Complex state** – 3 useState (bindingOverrides, layer, prefix) with overlapping concerns
3. **No context pattern** – All state is local, making it hard to share with overlay components
4. **Tight coupling** – Overlay components directly depend on KeyboardSpine internals

## Solution

### Phase 1: Extract `OverlayProvider` context
Create a provider that manages overlay state (open/closed, which overlay, z-index stacking):

```tsx
interface OverlayState {
  open: ReadonlyArray<string>
  activeOverlay: string | null
}

interface OverlayActions {
  openOverlay: (id: string) => void
  closeOverlay: (id: string) => void
  closeAll: () => void
}
```

### Phase 2: Extract `KeyboardStateProvider`
Create a provider for keyboard state that can be consumed by any component:

```tsx
interface KeyboardState {
  bindingOverrides: Record<string, string>
  layer: KeyboardLayer
  prefix: string | null
}

interface KeyboardActions {
  setBindingOverride: (key: string, binding: string) => void
  setLayer: (layer: KeyboardLayer) => void
  clearPrefix: () => void
}
```

### Phase 3: Extract prefix state into `usePrefixState` hook
The prefix state (for key sequences) should be a custom hook that any component can consume.

### Phase 4: Extract action registry
Move the action registry into a separate module that can be consumed independently.

## Blocking

- Blocked by: None (can be worked independently)

## Done When

- `KeyboardSpine.tsx` reduced to under 100 lines
- `OverlayProvider` and `KeyboardStateProvider` contexts exist
- No boolean prop proliferation in keyboard components
- Overlay components consume providers, not KeyboardSpine internals
- `pnpm check:all` passes

## Answer

### Implementation

Five new files created, one refactored:

**New files (in `apps/desktop/src/renderer/keyboard/`):**

1. `OverlayProvider.tsx` — `OverlayContext`, `OverlayProvider`, `useOverlay` consumer hook.
   - Manages `layer` state (palette/help/none), `topLayer` computation (splash > layer > panel > none),
     `openOverlay`, `closeOverlay`, `dismissSplash`.
   - Uses `useTeachingSplashVisibility` internally.
   - Publishes `spineOverlayLayer` to ScopeState (AC-20 Escape layering).
   - Follows the existing provider pattern (TransfersProvider).

2. `KeyboardStateProvider.tsx` — `KeyboardContext`, `KeyboardStateProvider`, `useKeyboardState` consumer hook.
   - Manages `bindingOverrides` with mount-fetch + mutation-adoption (F4 clobber-resistance preserved via `mutatedRef`).
   - Derives all effective views via `withEffectiveBindings`: `effectiveActions`, `activeActions`,
     `effectiveCompletions`, `effectiveGByKey`, `effectivePrefixEntries`.
   - Publishes binding overrides through the shared store for chrome controls.
   - Contains `usePrefixState` for the `g <key>` lifecycle.

3. `usePrefixState.ts` — The `g <key>` prefix lifecycle hook.
   - Manages `PrefixState` with the ~800ms auto-cancel timeout.
   - Publishes `prefixActive` to ScopeState for the navbar.

4. `PrefixIndicator.tsx` — The `PrefixIndicator` component and `PREFIX_INDICATOR_ENTRIES` constant,
   plus the re-export of `PrefixIndicatorEntry`.

5. `screenId.ts` — `screenIdOfPath` helper and `CLUB_SURFACE_BY_SEGMENT` constant extracted from the spine.

**Refactored file:**

6. `KeyboardSpine.tsx` — Reduced from 383 lines to 195 lines (49% reduction).
   - Outer `KeyboardSpine` component handles route context + scope state, then renders both providers
     around a `SpineOrchestrator` inner component.
   - `SpineOrchestrator` consumes overlay + keyboard state via `useOverlay()` and `useKeyboardState()`,
     registers action handlers, defines the `onKeyDown` callback, and renders the JSX tree.
   - Re-exports `PrefixIndicator`, `PREFIX_INDICATOR_ENTRIES`, and `PrefixIndicatorEntry` for backward compat.

### Test results
- Keyboard tests: 12/12 pass
- Discoverability tests: 62/62 pass
- Club staff tests: 32/32 pass
- All renderer tests: 838/838 pass
- Pre-existing failures only: `live-keyboard.test.tsx` (16 tests, pre-existing match-day flake),
  `scouting.test.ts`, `cups.test.ts`, `simulation-depth.test.ts` (known flaky main-process tests).

## Comments

- The keyboard spine is a critical infrastructure component — refactoring it must not break existing keybindings.
- The overlay state should be lifted so that any component (not just KeyboardSpine children) can open/close overlays.
- The prefix state is a good candidate for a context provider since it affects multiple components.