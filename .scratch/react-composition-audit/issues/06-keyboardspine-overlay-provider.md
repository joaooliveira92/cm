# 06 — Refactor KeyboardSpine: extract OverlayProvider and useKeyboardState

Type: task
Status: claimed

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

<!-- to be filled by implementation -->

## Comments

- The keyboard spine is a critical infrastructure component — refactoring it must not break existing keybindings.
- The overlay state should be lifted so that any component (not just KeyboardSpine children) can open/close overlays.
- The prefix state is a good candidate for a context provider since it affects multiple components.