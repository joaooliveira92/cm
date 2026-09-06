# 09 — Refactor Navigation: extract NavContext and compound nav components

Type: task
Status: ready-for-agent

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

- No boolean prop proliferation in navigation components
- `NavContext` provider exists
- Compound `NavItem` and `NavSubmenu` components exist
- `useHoverIntent` hook exists
- `pnpm check:all` passes

## Answer

<!-- to be filled by implementation -->

## Comments

- The hover intent is a good candidate for a custom hook since it affects multiple components.
- The `active`/`submenuOpen` props should be managed by the NavContext, not passed from parent.
- Consider whether ContextNav and PrimaryNavItem should be merged or kept separate with a shared context.