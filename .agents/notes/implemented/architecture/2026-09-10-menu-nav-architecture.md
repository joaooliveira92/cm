# Agent Note: Menu navigation state and component architecture

Status: implemented

## Problem

The two-row navbar specification in `docs/menu.md` leaves ownership, routing, component boundaries, visibility logic, and responsive behavior as open implementation decisions. Without settling these, different implementers will make different choices, producing an inconsistent nav system.

## Decision

The nav system uses the following architectural decisions, settled by wayfinding on 2026-09-10:

1. **URL-only state ownership.** The route is the single source of truth for all nav state: primary section, secondary tab, entity ID, and context selector (e.g., `/squad/first-team?competition=123`). The nav components derive active state from the URL via the router; no Zustand/Effect store owns nav position.

2. **Entity origin in URL param.** When an entity profile is opened (e.g., `/players/42/overview`), the origin primary section is carried as a query param (`?origin=squad`). This survives page refresh without a state machine.

3. **Browser history API for back/forward.** Navigation uses `history.pushState`/`popstate` via TanStack Router's hash history. List state (filters, sort, visible columns, active tab, view, context selector, scroll position) is preserved across back/forward through URL search params, with full-text search queries stored in sessionStorage to avoid bloated URLs. Screens encode their state into the URL before navigating away; the browser restores it on `popstate`.

4. **Two independent nav components.** `PrimaryNav` reads the top-level route segment to light its active item. `SecondaryNav` reads the full route + entity context to render its tabs. They are independent children of a layout shell, keeping responsive splitting clean.

5. **Config objects with visibility predicates.** Each domain exports an array of tab descriptors `{ id, label, visible: (context) => boolean }`. The nav component iterates and filters; no if/else in JSX.

6. **Actions menu in page header.** Below the navbar, above content. The label names the current entity (e.g., "Actions ▼").

7. **Responsive breakpoints.** Wide ≥ 1200px, medium ≥ 768px, narrow < 768px. Overflow and icon-only changes match the app's standard breakpoints.

8. **Snap transitions for nav rows.** No animation on secondary row content swaps. Overflow menu open/close uses fade + scale.

9. **Horizontal scroll with fade gradient for overflow tabs.** Secondary tabs that don't fit scroll inline with a CSS fade-to-background at each edge. No nested "More" overflow.

10. **"More" as dropdown/panel.** Not a full page. Infrequent utilities (Save, Quit, Preferences) live in a transient overlay.

## Alternatives considered

- **React/Zustand state for nav position.** Rejected because it breaks on refresh and requires sync code with URL; URL-only is simpler and matches the spec's route-centric language.
- **Origin tracked in a React context or store.** Rejected because `?origin=` in the URL survives refresh trivially and avoids a hidden dependency between nav and entity pages.
- **Custom back/forward stack.** Rejected because the browser already provides one; a custom stack adds complexity for no benefit the URL-param approach can't achieve.
- **Single monolithic nav component.** Rejected because it couples Primary and Secondary, making the responsive split harder (medium layout hides primary items but not secondary).
- **Monolithic if/else for conditional tabs.** Rejected because a data-driven config is testable, type-safe, and extensible without editing nav code.
- **Actions menu in secondary nav row or primary row.** Rejected: the page header is the canonical location for page-level commands, not navigation.
- **Animations on nav transitions.** Rejected to preserve the information-dense feel of the game; animation slows perception.
- **"More" as a full-page route.** Rejected because the items are low-frequency utilities; a dropdown is faster to reach and dismiss.

## Consequences

- A fresh implementation derived from `docs/menu.md` and this note produces a two-row navbar that works without guessing at these ten decisions.
- The CSS breakpoints are defined in one place and match the app's existing responsive system.
- Tab visibility is data-driven (config predicates), not hard-coded in the nav component.
- The action menu renders below the navbar, above content.
- Back navigates correctly across entity profiles, preserving the origin primary section's active state.
- URL-only state means deeply nested UI state (scroll position inside a long list) cannot be restored from the URL alone. These are accepted as session-only losses, mitigated by scroll capture in `history.state` and session-scoped table state (`tableState.ts`).
- The horizontal-scroll overflow pattern is less discoverable than a "More" dropdown for users who don't expect inline scroll in a nav row. The fade gradient mitigates this by signalling offscreen content.
- History state captures route, entity id, primary section, secondary tab, context selector, list state (via URL search params), and scroll position (via `history.state.__scroll`). Full-text search queries that would bloat URLs are stored in sessionStorage.

## Implementation

Shipped in ticket 01 (nav config + URL parser):

- Decision 1 (URL-only state ownership): `nav-route-parser.ts` implemented
- Decision 2 (Entity origin in URL param): `?origin=` parsing in `nav-route-parser.ts`
- Decision 5 (Config objects with visibility predicates): `spec-nav-config.ts`, `entity-nav-config.ts`, `match-nav-config.ts`

Shipped in ticket 02 (PrimaryNav component):

- Decision 4 (Two independent nav components — PrimaryNav half): `PrimaryNav.tsx` reads the top-level route segment to light the active item. Independent of SecondaryNav, receives badge counts and slot-based global controls.
- Decision 7 (Responsive breakpoints): PrimaryNav adapts at 1200px and 768px.
- Decision 8 (Snap transitions): PrimaryNav uses `transition-colors` for hover/active states only.
- Decision 10 ("More" as dropdown/panel): `MoreDropdown` uses Base UI Popover with `MORE_ITEMS` from `spec-nav-config.ts`.

Shipped in ticket 03 (SecondaryNav component):

- Decision 4 (Two independent nav components — SecondaryNav half): `SecondaryNav.tsx` renders contextual tabs.
- Decision 9 (Horizontal scroll with fade gradient): Secondary tabs overflow scroll inline with CSS `mask-image` linear-gradient.

Shipped in ticket 06 (Actions menu and Continue button):

- Decision 6 (Actions menu in page header): `HeaderActionsMenu.tsx` renders below the navbar, above content. Uses Base UI Popover, filters screen-scoped actions from the registry.

Shipped in ticket 07 (Back/forward and history preservation):

- Decision 3 (Browser history API): `adapter.ts` uses `history.pushState`/`popstate` via TanStack Router. `list-state-storage.ts` provides URL param encoding/decoding with sessionStorage fallback. `scroll-state.ts` captures and restores scroll position. `use-list-state.ts` hooks screens into the history system. Screens encode their list state into URL search params before navigation; the browser restores it on `popstate`.