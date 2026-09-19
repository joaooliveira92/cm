# Map: React Composition Audit

Label: `wayfinder:map`

## Destination

A refactored codebase where god components have been split into compound components with shared context, following the Vercel composition patterns guidelines.

## Notes

**Domain**: React components in `/apps/desktop/src/renderer/` that violate composition patterns by using boolean prop propogation, monolithic components, and prop drilling.

**Skills every session should consult**: `vercel-composition-patterns`, `effect-code`, `doc-standards`

## Decisions so far

- **09 (nav, 2026-09-10):** Keep `PrimaryNavItem` and `ContextNav` as separate components sharing a
  `NavContext` (state/actions/meta), rather than merging them into one compound. They serve different
  axes of the redesigned-navbar spec — the primary row and the contextual submenu strip — and context
  removes the boolean props/prop-drilling between them. The shared state (route-derived active
  section/item, preview/open, hover-intent timers) lives in `NavProvider`. Fallback to `useHoverIntent`
  hook for the intent/close-tolerance timers, per-section routing via a single shared target ref.
- **17 (table, 2026-09-10):** `onScroll` is the single re-sync point for the edge fades, and it
  also covers programmatic `scrollLeft` writes such as Shift+Arrow. Content-size changes re-measure
  through `useScrollEdges`' `extraDeps`. A scroll-offset restore is declared before the hook so the
  first paint reads the restored offset.
  [Ticket](issues/17-data-table-edge-fade-resync.md).

## Out of scope

- Pure CSS/styling changes
- Non-React files (.ts utilities, .scss, etc.)
- Backend services and API contracts
- Electron/main/preload processes
- Configuration files (tsconfig, package.json, etc.)