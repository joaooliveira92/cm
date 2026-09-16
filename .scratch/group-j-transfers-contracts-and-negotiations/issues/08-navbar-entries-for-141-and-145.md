# 08: Navbar entries for Contract Expiry (141) and Budget Review (145)

**What to build:** Recruitment-submenu entries for the two Group J screens that shipped without one,
so all three v1 screens are reachable the same way.

Tickets 05 and 06 shipped Contract Expiry (`career/$saveId/contract-expiry`) and Budget Review
(`career/$saveId/budget-review`) as working screens with no navigation to them — they are reachable
only by typing the URL. Ticket 07 added a Recruitment submenu entry for Transfer History, which
leaves Group J internally inconsistent: one of three v1 screens is navigable.

Follow ticket 07's wiring, which is the complete set of touch points:
`destinations.ts` (`CareerDestination`, `ResolvedDestination`, `resolveDestination`, `careerRoute`),
`adapter.ts` (save-scoped case group), `NavProvider.tsx` (`destinationToRouteChild`),
`KeyboardSpine.tsx` (the exhaustive `SaveScopedCareerDestinationType` record), `nav-config.ts`, and
`e2e/launchApp.ts` (`NAV_PATH`).

**Decisions:**

- Group J v1 scope: see [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-15-group-j-v1-scope.md).
- Transfer History's own route and its navbar precedent: see
  [Agent Note](../../../.agents/notes/implemented/architecture/2026-09-15-transfer-history-takes-its-own-career-route.md).

**Blocked by:** None

**Status:** claimed

- [ ] Contract Expiry and Budget Review each reachable from the Recruitment submenu
- [ ] A Playwright spec navigates to each through the navbar rather than by URL
- [ ] Keyboard access matches Transfer History's
