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

**Status:** resolved

- [x] Contract Expiry and Budget Review each reachable from the Recruitment submenu
- [x] A Playwright spec navigates to each through the navbar rather than by URL
- [x] Keyboard access matches Transfer History's

## Answer

Resolved 2026-09-16. Recruitment's submenu now lists Contract Expiry (`g 4 o`) and Budget Review
(`g 4 p`) after Transfer History and the existing entries.

What the ticket's touch-point list got wrong: `destinations.ts`, `adapter.ts`, `NavProvider.tsx` and
`KeyboardSpine.tsx` were already wired by tickets 05 and 06. The missing pieces were `nav-config.ts`,
`NAV_PATH`, and the test-side sub-surface lists. Two more things the list missed:

- **Tenth position key.** `POSITION_KEYS` had nine keys and Recruitment reached ten items, so `p` was
  appended. Level-1 keys are only matched against the chosen section's items, so `p` cannot collide.
- **Submenu overflow.** Ten items are wider than the 1200px window, and the submenu strip could not
  scroll, so the last two entries were unreachable by mouse. `ContextNav` now scrolls horizontally,
  like the primary nav.

Tests: `e2e/contract-expiry-and-budget-review.spec.ts` (navbar navigation to each, plus a wheel-scroll
check that fails without the overflow fix); `test/renderer/keyboard/spine-live.test.tsx` (the
`g <section> <position>` path for all three Group J screens); `route-index.test.ts` (six sanctioned
navbar sub-surfaces). Gate evidence in
[the report](../../../.ai/reports/group-j-transfers-contracts-and-negotiations.md).
