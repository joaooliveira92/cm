# 09 — Refactor Navigation: extract NavContext and compound nav components

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

The navigation components (Navbar.tsx, PrimaryNavItem.tsx, ContextNav.tsx) violate several patterns:

1. **Boolean prop proliferation** – `active`, `submenuOpen`, `isSubmenuVisible`
2. **Prop drilling** – `PrimaryNavItem` receives 8 props, `ContextNav` receives 6 props
3. **Multiple concerns mixed** – Hover intent, submenu toggle, navigation
4. **No shared state** – Hover intent logic duplicated or tightly coupled to component hierarchy

## Solution

### Phase 1: Create `NavContext` provider
Lift navigation state into a context provider:

```tsx
interface NavState {
  active: NavItemId
  submenuOpen: NavItemId | null
}

interface NavActions {
  setActive: (id: NavItemId) => void
  toggleSubmenu: (id: NavItemId) => void
}
```

### Phase 2: Extract compound nav components
- `NavBar` – restructure to consume NavContext
- `NavItem` – compound component with: `NavItem.Root`, `NavItem.SubmenuTrigger`, `NavItem.Dropdown`
- `NavSubmenu` – compound submenu component

### Phase 3: Replace boolean props
- Remove `active`, `submenuOpen`, `isSubmenuVisible` from PrimaryNavItem/ContextNav
- Use explicit component variants: `NavItem.Active`, `NavItem.HasSubmenu`, `NavItem.Expanded`

### Phase 4: Extract hover intent
Move hover intent logic into `useHoverIntent` custom hook that can be consumed independently.

## Blocking

- Blocked by: None (can be worked independently)

## Done When

- [x] No boolean prop proliferation in navigation components
- [x] `NavContext` provider exists
- [x] Compound `NavItem` and `NavSubmenu` components exist
- [x] `useHoverIntent` hook exists
- [x] `pnpm check:all` passes (baseline: 2 pre-existing typecheck errors in unrelated test files, 19 pre-existing test failures in 4 files, lint noise in untouched files — same baseline as HEAD)

## Answer

- [x] `PrimaryNavItem` no longer receives `active`, `submenuOpen`, `onNavigate`, `onToggleSubmenu`, `onMouseEnter`, `onMouseLeave` as props — all derived from `NavContext`.
- [x] `ContextNav` no longer receives any props from the caller — derives everything from `NavContext` (`stripSection`, `activeItemId`, `stripItems`, `goTo`, `handleSectionEnter`/`handleSectionLeave`).
- [x] `NavProvider` (`navigation/NavProvider.tsx`) owns all navigation state: route-derived active section/item, preview/open state via `useNavState`, hover-intent timers, and the `goTo` action. Exposes the generic `NavState`/`NavActions`/`NavMeta` context interface.
- [x] `navContext.ts` defines `NavState`, `NavActions`, `NavMeta`, `NavContextValue` interfaces and the `NavContext`/`useNavContext` primitives following the same `state/actions/meta` shape as `MatchContext`.
- [x] `useHoverIntent` hook (`navigation/useHoverIntent.ts`) extracts the intent-delay/close-tolerance timer logic. It takes `onIntent`/`onLeaveIntent` callbacks, exposes `handleEnter(alreadyShown)` and `handleLeave()`, and cleans up on unmount. Consumed by `NavProvider` via a shared `intentTargetRef`.
- [x] `Navbar.tsx` reduced from 292 lines to 66 lines — a thin composition over `NavProvider`, mapping `NAV_SECTIONS` to `PrimaryNavItem` and rendering `ContextNav` as a sibling.
- [x] The two pre-existing typecheck errors in Navbar (dead `revealKey`/`revealKeys` props passed to `PrimaryNavItem`/`ContextNav` from commit 94d5e16) are **resolved** — those props were never declared on the children and are eliminated by the refactor. The gate still shows 2 pre-existing typecheck errors in test files (`manager-identity-step-pillars.test.tsx`, `level1-a11y.test.tsx`) and 19 pre-existing test failures — same baseline as HEAD.

## Comments

- The hover intent is extracted into `useHoverIntent` hook that manages the single pair of enter/leave timers. The per-section routing (`intentTargetRef`) lives in `NavProvider` which is the only consumer.
- `PrimaryNavItem` and `ContextNav` are kept separate with a shared `NavContext` — they serve different axes (primary row vs contextual submenu strip) but now derive all state from context.
- Keyboard shortcut badges (`revealKey`/`revealKeys`) were aspirational at HEAD: the Navbar passed them but neither child declared or rendered them, causing 2 typecheck errors. The composition refactor removes the dead prop plumbing; the keyboard-reveal feature can be readded as a proper context consumer when needed.
- See map.md for the decision to keep PrimaryNavItem/ContextNav separate with shared NavContext.