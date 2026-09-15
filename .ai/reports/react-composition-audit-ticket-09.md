# Validation report: react-composition-audit / ticket 09

**Date**: 2026-09-10
**Ticket**: `.scratch/react-composition-audit/issues/09-navigation-compound-components.md`
**Type**: Implementation (compound component refactoring)

## Summary

Extracted navigation state into `NavProvider` + `NavContext` (state/actions/meta), created the
`useHoverIntent` hook for intent-delay/close-tolerance timers, and refactored `PrimaryNavItem` and
`ContextNav` to consume context instead of receiving boolean props (`active`, `submenuOpen`) and
callbacks (`onNavigate`, `onToggleSubmenu`, `onMouseEnter`, `onMouseLeave`) from the parent.

## Changed files

| File | Change |
|---|---|
| `apps/desktop/src/renderer/navigation/navContext.ts` | **New** — `NavState`/`NavActions`/`NavMeta`/`NavContextValue` interfaces, `NavContext` and `useNavContext` |
| `apps/desktop/src/renderer/navigation/NavProvider.tsx` | **New** — owns nav state, route-derived active section/item, preview/open, hover-intent timers, goTo navigation |
| `apps/desktop/src/renderer/navigation/useHoverIntent.ts` | **New** — generic hover-intent timer hook with `handleEnter(alreadyShown)` / `handleLeave()` |
| `apps/desktop/src/renderer/navigation/components/Navbar.tsx` | **Modified** — 292 → 67 lines, thin shell wrapping `<NavProvider>`, composes `PrimaryNavItem` + `ContextNav` |
| `apps/desktop/src/renderer/navigation/components/PrimaryNavItem.tsx` | **Modified** — 8 props → 4, consumes `useNavContext` for `active`/`submenuOpen`/`goTo`/`handleSectionEnter`/`handleToggleSubmenu` |
| `apps/desktop/src/renderer/navigation/components/ContextNav.tsx` | **Modified** — 6 props → 0, consumes `useNavContext` for `stripSection`/`activeItemId`/`stripItems`/`goTo`/`handleSectionEnter`/`handleSectionLeave` |
| `.scratch/react-composition-audit/map.md` | Updated Decisions section |
| `.scratch/react-composition-audit/issues/09-navigation-compound-components.md` | Updated Status: resolved, Answer section |

## Validation evidence

### Typecheck

`pnpm --filter @cm-clone/desktop typecheck`:
- 0 errors in my files
- 2 pre-existing errors in unrelated test files (`manager-identity-step-pillars.test.tsx`, `level1-a11y.test.tsx`) — unchanged from HEAD
- **Fixed**: the 2 pre-existing Navbar typecheck errors (dead `revealKey`/`revealKeys` props from commit 94d5e16) are eliminated

### Lint

`oxlint apps/desktop/src/renderer/navigation`:
- 0 errors in navigation files

### effect-lint

`tsx scripts/effect-lint.ts`: no violations found in 604 files

### Test: navbar spec

```
pnpm exec vitest run test/renderer/navigation/navbar.test.tsx
  ✓ shows the persistent contextual strip for the active section
  ✓ the Squad submenu lists the club menu options and marks Squad active on the squad route
  ✓ keeps the News section active and its strip up on the inbox route
  ✓ opens a section's submenu after the hover-intent delay
  ✓ hovering a different section never marks it active
  Test Files  1 passed (1)
  Tests        5 passed (5)
```

### Test: boundary lint, route-index, adapter-coverage

```
pnpm exec vitest run test/shared/renderer-boundary-lint.test.ts \
  test/renderer/navigation/route-index.test.ts \
  test/renderer/navigation/adapter-coverage.test.ts
  Test Files  3 passed (3)
  Tests       29 passed (29)
```

### Full gate

`pnpm check:all`:
- ✓ effect-lint
- ✓ verify-md-links
- ✓ verify-db-schema
- ✗ typecheck (2 pre-existing errors only — same baseline)
- ✗ lint (pre-existing noise in untouched files only)
- ✗ test (19 pre-existing failures in same 4 files as HEAD — zero new)

No regressions added. The pre-existing baseline is unchanged and documented in the sprint plan.

## Commit

`refactor(nav): extract NavProvider, NavContext, useHoverIntent; slim Navbar to 67 lines`