# 16: Router adoption and the death of the root state machine

**What to build:** the renderer's navigation replaced with TanStack Router using `createHashHistory`
— a route tree for save list, creation flow (`/create/*`), and the active career (`/career/$saveId/*`)
whose parent owns the persistent career shell and the relocated save-scoped Atom registry. The
`App.tsx` hand-rolled state machine dissolves: its four state variables (`loadedSave`, `screen`,
`creating`, `creationState`) are removed, not merely unused. Creation steps share one parent-owned
provisional session with idempotent discard on leaving and a reload-to-step-1 fallback. Navigation
becomes a typed destination Action (a closed `NavigationDestination` union with typed parameters,
resolved through an adapter) and `g b` uses real history. Semantic focus restoration on
keyboard/palette-initiated route changes only; Match Day routing resumes a pending match rather than
starting one on mount.

**Decisions:**

- Typed hash routing for career, creation, and save-list views; no route loaders; early `beginCareer` preserved under a parent-owned creation session; navigation via typed destination Actions; semantic focus after keyboard navigation only. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-29-router-adoption-shape.md).

**Blocked by:** 15.

**Status:** claimed

- [ ] AC-10: Production routing uses hash history; a reload preserves the active route.
- [ ] AC-11: The active career is a route parameter; the career parent owns the persistent shell and the save-scoped registry.
- [ ] AC-12: Career routes have no domain loaders; malformed parameter shape and missing-save stay distinct failures.
- [ ] AC-13: `beginCareer` still runs before Club Selection; creation steps share a parent-owned session; leaving creation discards idempotently; reload mid-creation redirects to step 1.
- [ ] AC-14: Navigation is a typed destination Action with typed parameters, not a path template; career `g` destinations exclude creation steps; `g b` uses history.
- [ ] AC-15: Keyboard/palette navigation requests semantic focus; pointer navigation does not force it; back restores the previous target; Match Day resumes a pending match on arrival.

## Comments

- Published from the approved to-tickets breakdown (spec: `.scratch/keyboard-first-renderer/spec.md`, Stage 2).