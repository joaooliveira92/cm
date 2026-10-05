# 06: NavProvider's tab→parent remaps are a hand-maintained path-tail table

Type: bug
Status: needs-triage

## What was measured

`NavProvider` resolves the active navbar item by taking the last pathname segment
(`activeChild = location.pathname.split("/").at(-1)`) and mapping it to a destination through
`routeChildToDestination`. That map is built by inverting `destinationToRouteChild`, then
hand-overriding every sub-tab back to its parent scope:

```
inbox → manager, confidence → manager, notes → manager, jobs → manager,
responsibilities → manager, career → manager,
editor → tactics, workload → training, schedule → training,
coaching → training, "development-centre" → training
```

Those overrides are the only thing that keeps a manager sub-tab or a training sub-screen from
clearing the navbar highlight. They are hand-maintained: a new sub-tab added under `manager/` or
`training/` without an override here silently arrives with no highlight, and nothing catches it.

The authoritative source already exists. Each route in `router/index.tsx` declares its scope, and
`defineCareerChild(path, screenId, ...)` passes the parent's `screenId` (`managerInbox` →
`"manager"`, `trainingWorkload` → `"training"`, `tacticsEditor` → `"tactics"`). That scope is what
`routeChildToDestination` is reconstructing from URL tails.

## Direction

Make the route's scope the active destination instead of remapping by path tail. Attach the scope
as route `staticData` (e.g. `staticData: { screenId }` in `defineCareerChild` and the bespoke
sub-tab routes), then read the deepest match's `screenId` in `NavProvider` via `useMatches()`. The
override table and the `destinationToRouteChild` inversion both fall away, and a new sub-tab
inherits its parent's highlight by construction.

## Files

- `src/renderer/navigation/NavProvider.tsx`
- `src/renderer/router/index.tsx` (`defineCareerChild`, the manager/training/tactics sub-routes)

**Blocked by:** none.