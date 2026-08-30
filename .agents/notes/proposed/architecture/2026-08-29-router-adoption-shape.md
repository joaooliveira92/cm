# Agent Note: Router Adoption Shape

Status: proposed

## Problem

The renderer's navigation is a hand-rolled state machine in `App.tsx`: four pieces of state (`loadedSave`, `screen` union, `creating`, `creationState`) controlling three mutually exclusive render branches via `&&` chains. There is no URL, no back button, no declarative route tree, and no navigation lifecycle. The keyboard-first effort depends on router-backed navigation (Actions dispatch to it, focus restoration hooks into it, the command palette enumerates destinations through it), so the adoption shape must be settled before any implementation begins.

## Proposal

Adopt **TanStack Router** with `createHashHistory` to power all stable application views as routes. The renderer will use a nested route tree with three top-level branches — save list, creation flow, and career — and wire focus restoration through a navigation-intent-aware coordinator rather than the router's own lifecycle.

### History mode

Use `createHashHistory`. Hash history preserves the active route across an Electron renderer reload (loaded from `file://` in production), whereas memory history resets to `/` on every reload. The hash is invisible in a frameless Electron window, so the aesthetic cost is zero for the player.

### Route tree

```
/
├── create
│   ├── step-1
│   ├── step-2
│   └── step-3
└── career
    └── $saveId
        ├── squad
        ├── tactics
        ├── league
        ├── fixtures
        ├── match
        ├── transfers
        └── season-summary
```

`saveId` is a **path parameter** — the career is a hierarchical identity, not an orthogonal search qualifier. The `/career/$saveId` parent owns the persistent career shell (manager/club identity, season context, navigation bar, save-scoped Atom registry) and renders an `<Outlet />` for the active child screen. Navigating to `/career/$saveId` with no child redirects to `squad`.

**All persistent career screens** from the authoritative inventory (reconciled before freezing the tree, not copied from `App.tsx`'s seven-value union) live as child routes. Non-persistent screens or transient overlays (dialogs, modals, palette, help) are not routes.

### No route loaders for domain data

Route loaders duplicate the Atom seam (ticket 08), which already owns RPC calls, schema decoding, SWR, typed failures, caching, and invalidation. Routes validate **navigation structure** and **parameter shape only** — malformed `saveId` syntax is a route concern; a well-formed but nonexistent save is a typed RPC failure.

### Creation wizard lifecycle

`beginCareer` runs early (before step 2 / club selection) because club selection depends on generated world data and a persisted economy that generation produces. Moving it to review would break this dependency. The three creation routes share a **parent-owned provisional session** mounted at `/create` by `CreationFlowLayout`. The session holds `provisionalSaveId`, generation status, manager draft, and commit status. Navigation between creation steps preserves it; navigation **out** of `/create/**` triggers `discardCareer` with idempotent cleanup. Reloading step 2 or 3 without a recoverable session redirects to step 1. Crash cleanup of orphaned provisional saves remains unresolved fog.

### Navigation as a typed Action

Navigation is a registered Action category, but it uses **typed destination identifiers** and **typed route parameters**, not raw path templates. A `NavigateAction` carries `{ type: "navigate"; destination: NavigationDestination; scope }` and a resolver adapter translates it to `router.navigate()` with TanStack Router's typed route definitions. `NavigationDestination` is a closed union of all valid destinations (saveList, squad, tactics, transfers, ...). **Career `g <key>` bindings target only persistent career screens** — Club Selection and other creation steps are not `g` destinations. A `navigateBack` action (`g b`) calls history back, not a fixed path.

### Focus on route change

The router initiates navigation but does **not** own focus policy. After a route commits, ticket 06's focus coordinator restores focus by **semantic identity** (e.g., `squad.player-list`, `transfers.negotiation-list`), not by DOM position. **Navigation intent matters**: keyboard/palette-initiated navigation requests explicit destination focus; pointer navigation does not force focus unless the activated element is removed. Back navigation restores the previous screen's remembered semantic target where available. Match day navigation resumes authoritative pending match state rather than starting a new match on mount.

### Domain state excluded from routes

Routes encode which save is active, which screen is active, and which creation step is active. They do **not** encode selected players, current tactic, training focus, readiness blockers, pending transfer state, in-progress match cursor, manager pillars, or any other domain or transient application state.

## Alternatives considered

- **Memory history**: Rejected because a reload resets the route to `/`, sending a player in an active career back to the save list. The one advantage (no hash in URL) is invisible in a frameless Electron window.
- **Route loaders for career data**: Rejected because they duplicate the Atom seam's fetch, cache, SWR, and invalidation responsibilities. Two overlapping server-state layers would create coherence bugs.
- **Moving `beginCareer` to review step**: Rejected because club selection requires the generated world and persisted economy that `beginCareer` produces. Generation cannot wait until after selection is complete.
- **Raw path-template strings in Actions**: Rejected in favour of typed destination identifiers. String interpolation (`"/career/{saveId}/squad"`) bypasses TanStack Router's type safety, allows missing parameters, and couples the Action registry to renderer-routing syntax.
- **Router-owned focus restoration**: Rejected because TanStack Router's type surface has no focus-management API. Even if it did, focus policy (semantic identity, intent-awareness, back-navigation restoration) is a product concern that belongs in a dedicated coordinator, not interleaved with route matching.
- **Every view as a route**: Dialogs, modals, palette, help overlay, and transient state are excluded from the route tree. They have no navigable URL identity, no back-button semantics, and no reload expectation.

## Acceptance criteria

- AC-01: Production routing uses `createHashHistory`
- AC-02: Reload preserves the active hash route
- AC-03: The active career is represented by `/career/$saveId`
- AC-04: The career parent route owns the persistent shell and save-scoped Atom registry
- AC-05: Career routes do not duplicate Atom-backed fetching in route loaders
- AC-06: Malformed route parameters and typed missing-save failures remain distinct
- AC-07: `beginCareer` still runs before Club Selection requires generated club data
- AC-08: All creation steps share one parent-owned provisional session
- AC-09: Leaving creation normally attempts idempotent `discardCareer` cleanup
- AC-10: Reloading a later creation step without recoverable flow state redirects to step 1
- AC-11: Navigation Actions use typed destinations and typed params, not raw path templates
- AC-12: No career `g`-prefix binding targets Club Selection or another creation step
- AC-13: Route changes caused by keyboard or palette actions request semantic focus restoration
- AC-14: Destination focus targets use stable identities rather than DOM position
- AC-15: Pointer navigation does not cause unnecessary forced focus
- AC-16: Match day routing resumes authoritative pending match state and never starts a match on mount

## Risks

- **Creation session durability**: The provisional creation session lives in memory (React state in `CreationFlowLayout`). Reload loses it — we redirect to step 1, which is acceptable for v1 but means a player who reloads mid-creation loses their draft. A durable session design (localStorage, Atom persistence) would add complexity with unclear player-facing benefit until usage data suggests otherwise.
- **Hash-fragment conflicts**: `createHashHistory` may interact poorly with any existing hash-based anchor navigation. The renderer has none today, but a future feature must not assume `#` is available for fragment IDs.
- **Nine-screen inventory drift**: `App.tsx` names seven career screens. The authoritative inventory may differ when implementation starts. The route tree must be reconciled against the final screen list, not the current `CareerScreen` union.
- **Crash cleanup orphan**: The skill notes that crash cleanup for orphaned provisional saves is unresolved fog. A process kill during creation leaves a provisional database entry with no `save_meta` — invisible but unreclaimed. Acceptable for v1 but worth a design note.
- **`navigateBack` over layer boundaries**: `g b` calling `history.back()` may traverse across the creation-flow boundary into career history, or vice versa, in ways that confuse the lifecycle. The focus coordinator may need to filter or redirect back-navigation that crosses incompatible lifecycle scopes.