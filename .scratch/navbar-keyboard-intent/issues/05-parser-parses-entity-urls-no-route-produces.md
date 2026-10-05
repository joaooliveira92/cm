# 05: The nav-route parser parses an entity URL vocabulary no route produces

Type: bug
Status: needs-triage

## What was measured

Found on `dev` at `4827f564` while collapsing the route registries (shipped as `a679be93`).
`parseNavState` (`apps/desktop/src/renderer/navigation/nav-route-parser.ts`) derives `entityType`
from `routeSegmentToEntityType`, whose keys are the **plural** segments `players`, `staff`,
`nations`. No registered route uses those segments: the entity routes are
`/career/$saveId/player/$playerId/...`, `/career/$saveId/club/$clubId/...` and
`/career/$saveId/competition/$competitionId/...` — all singular — per `router/index.tsx`. So
`entityType` is `null` on every URL the app can produce.

The other legacy branches are the same:

- `firstChild === "matches"` — no `matches/` route exists.
- `matchContextForRouteSegment` (`pre-match` / `live-match` / `post-match`) — no such routes exist.
- The `?origin=` query param the origin branch reads has no writer anywhere in `src/`; it appears
  only in `nav-route-parser.test.ts` and `context-tabs.test.tsx`.

`ContextTabs` is live (rendered by `CareerShell`) and its docstring says it renders "inside a player
or staff profile, and inside a match" — but with `entityType` always `null`, its entity half can
never activate. It only ever renders match tabs.

## Why it matters

This is the one registry the route-collapse ticket named (`nav-route-parser.ts:24`, `:36`, `:187`)
that could not be collapsed: it does not describe the current routes. Left alone it is a trap — the
next entity screen's tabs silently render nothing, and the parser specs stay green against the dead
contract. `nav-route-parser.test.ts` (300+ lines) and `context-tabs.test.tsx` lock the dead
vocabulary in.

## Direction

Decide one of:

- **Delete the dead vocabulary.** Remove `routeSegmentToEntityType`, `inferSectionForEntity`, the
  `matches` branch, `matchContextForRouteSegment`, the origin branch, and `EntityType` if nothing
  else needs it, then rewrite the parser specs against the routes that exist. Separately decide
  whether `ContextTabs` should render entity tabs at all — the sidebar owns section navigation now,
  and player/staff profile tabs may live inside their screens.
- **Rebuild `parseNavState` on the destination registry.** Match the pathname through the TanStack
  route tree / `ROUTE_BUILDERS` instead of a parallel segment table, so the parser cannot describe
  routes that do not exist.

## Files

- `src/renderer/navigation/nav-route-parser.ts`
- `src/renderer/navigation/entity-nav-config.ts`
- `src/renderer/navigation/components/ContextTabs.tsx`
- `src/renderer/router/career/hooks/useCareerTabNavigation.ts`
- `src/renderer/router/career/utils/tabDestination.ts`
- `test/renderer/navigation/nav-route-parser.test.ts`
- `test/renderer/navigation/context-tabs.test.tsx`

**Blocked by:** none.