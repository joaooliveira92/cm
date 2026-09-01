# Map: React Composition Audit

Label: `wayfinder:map`

## Destination

A refactored codebase where god components have been split into compound components with shared context, following the Vercel composition patterns guidelines.

## Notes

**Domain**: React components in `/apps/desktop/src/renderer/` that violate composition patterns by using boolean prop propogation, monolithic components, and prop drilling.

**Skills every session should consult**: `vercel-composition-patterns`, `effect-code`, `doc-standards`

## Decisions so far

<!-- Will be populated as tickets are resolved -->

## Out of scope

- Pure CSS/styling changes
- Non-React files (.ts utilities, .scss, etc.)
- Backend services and API contracts
- Electron/main/preload processes
- Configuration files (tsconfig, package.json, etc.)