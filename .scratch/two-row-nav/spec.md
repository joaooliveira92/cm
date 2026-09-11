# Two-Row Top Navigation

Status: ready-for-agent

## Problem Statement

The current navbar (`/apps/desktop/src/renderer/navigation/`) uses a single primary row with a hover-intent submenu strip and 7 sections (Squad, Tactics, Training, Recruitment, Analysis, News, Club). This diverges from the Championship Manager 03/04 navigation model, which requires:

1. **Two persistent rows**: a stable primary row (10 domains) and a contextual secondary row that changes per section, entity context, or match state
2. **Entity-specific contextual navigation**: opening a player profile replaces the secondary row with player-specific tabs
3. **Pre-match, live-match, and post-match contexts**: each with their own secondary row
4. **No sidebar**: the original game had no left sidebar; the adaptation must not introduce one

The spec at `docs/menu.md` (1796 lines) defines the full navigation model in exhaustive detail but leaves 10 implementation decisions unresolved. Those decisions were settled by wayfinding on 2026-09-10 and are captured in `.agents/notes/proposed/architecture/2026-09-10-menu-nav-architecture.md`.

## Solution

Rebuild the navbar to the two-row model specified in `docs/menu.md`, incorporating the 10 settled architectural decisions. The primary row remains stable across contexts; the secondary row switches per section, entity profile, pre-match, live-match, or post-match context. The existing 7-section nav-config is replaced with a data-driven config matching the spec's 10 primary items and their secondary tabs.

## User Stories

1. As a manager, I want to see 10 stable primary navigation domains (Manager, Squad, Tactics, Training, Transfers, Club, Competitions, World, Search, More) so I always know where to find each area of the game.
2. As a manager, I want the primary row to stay fixed when I open a player profile, so I never lose my bearings.
3. As a manager, I want the secondary row to switch to entity-specific tabs when I open a player, staff member, club, nation, competition, or match profile.
4. As a manager, I want a "Back" button that returns me to the list I was on with filters, sorting, and scroll position preserved.
5. As a manager, I want the secondary row's tabs to be destinations (not commands) and page-level actions to live in an Actions menu in the page header.
6. As a manager, I want conditional tabs (Table, Tree, Draw, Coefficients, Awards, Stages) to appear only when their content is valid.
7. As a manager, I want selection filters (competition, squad, squad level) to be context selectors, not duplicated tabs.
8. As a manager, I want the "Continue" button always visible and prominent, with contextual labels (Continue, Go to Match, Respond).
9. As a manager, I want a pre-match context with tabs for Team Selection, Tactics, Opposition, Past Meetings, and Conditions.
10. As a manager, I want a live-match context with tabs for Match, Commentary, Statistics, Player Ratings, Tactics, Opposition, and Live Table.
11. As a manager, I want a post-match context with tabs for Summary, Statistics, Player Ratings, Commentary, Other Results, and Table.
12. As a manager, I want the responsive layout to adapt at 1200px and 768px without introducing a sidebar.
13. As a manager, I want keyboard navigation for all nav items with visible focus states and screen-reader announcements.
14. As a manager, I want overflow in the secondary row to scroll horizontally (not wrap or nest) with a fade-to-background gradient indicating offscreen tabs.
15. As a manager, I want the "More" section to open as a dropdown/panel for low-frequency utilities (Save, Preferences, Quit).

## Implementation Decisions

1. **URL-only state ownership.** Route is the single source of truth for all nav state (primary section, secondary tab, entity id, context selector). Nav components derive active state from the router; no Zustand/Effect store owns nav position. The existing `adapter.ts` and `navContext.ts` can be simplified rather than replaced wholesale.

2. **Entity origin in URL param.** When an entity profile is opened, the origin primary section is carried as `?origin=<sectionId>`. Survives refresh.

3. **Browser history API for back/forward.** List state encoded as URL search params. The existing `useNavContext` / `NavProvider` pattern at `navContext.ts` and `NavProvider.tsx` should be replaced: nav state derives from the URL rather than from a React context.

4. **Two independent nav components.** `PrimaryNav` reads the top-level route segment. `SecondaryNav` reads the full route + entity context. The existing single `Navbar` component that wires `PrimaryNavItem` + `ContextNav` together is the right seam to split.

5. **Config objects with visibility predicates.** Each domain exports `{ id, label, visible: (context) => boolean }[]`. The existing `nav-config.ts` `NavSection`/`NavItem` shape is replaced to match the spec's 10-section layout and supports conditional visibility.

6. **Actions menu in page header.** Already partially aligned: the existing `AppTitleBar` has an `actions` slot. Page-level actions move there.

7. **Responsive breakpoints.** Wide ≥ 1200px, medium ≥ 768px, narrow < 768px.

8. **Snap transitions for nav rows.** No animation on secondary row content swaps. Overflow menu open/close uses fade + scale.

9. **Horizontal scroll with fade gradient for overflow tabs.** CSS `overflow-x: auto` with `mask-image` linear-gradient fade at edges.

10. **"More" as dropdown/panel.** Not a full page. Uses the existing popover/overflow pattern from Base UI.

Reference: `.agents/notes/proposed/architecture/2026-09-10-menu-nav-architecture.md`

### Existing code to keep, replace, or modify

- **Keep**: `adapter.ts` (route binding), `destinations.ts` (destination type system), `params.ts`, `useHoverIntent.ts`, `ShortcutHint` component, `FOCUS_RING`, `NO_DRAG` drag region, `club-scheme.ts` club styling.
- **Replace**: `nav-config.ts` — rewrite to match the spec's 10 sections and their secondary tabs exactly, with config-driven visibility predicates.
- **Replace**: `NavProvider.tsx` / `navContext.ts` — replace React-context-based nav state with URL-derived state, so the active section and tab are read from the route.
- **Replace**: `Navbar.tsx` — split into `PrimaryNav` and `SecondaryNav` components.
- **Replace**: `ContextNav.tsx` — its role is absorbed by `SecondaryNav`.
- **Modify**: `AppTitleBar.tsx` — integrate the Actions menu and continue button into the primary row's right side, per the spec's desktop layout diagram.
- **Add**: Entity-context navigation configs (player profile tabs, staff profile tabs, club profile tabs, nation profile tabs, competition profile tabs, match profile tabs, pre-match tabs, live-match tabs, post-match tabs).
- **Add**: Page header component for entity pages that renders title, subtitle, breadcrumbs, status indicators, and Actions menu below the nav rows.

### Route model

The existing route tree already uses a `$saveId` + child route pattern. The primary section and secondary tab hierarchy routes defined in `docs/menu.md §11` should be mapped to the existing router, adding the `?origin=` param for entity contexts:

```
/career/:saveId/manager/overview
/career/:saveId/manager/inbox
/career/:saveId/squad/first-team
/career/:saveId/players/:playerId/overview?origin=squad
/career/:saveId/matches/:matchId/live
```

## Testing Decisions

A good test for this navigation system asserts external behavior: which tabs render, which is active, what happens on click, and which keyboard interactions work. It does not assert internal wiring (which React context value was set, which reducer action fired).

### Modules to test

- `apps/desktop/src/renderer/navigation/components/PrimaryNav.tsx` — primary row rendering, active state, responsive hiding, overflow
- `apps/desktop/src/renderer/navigation/components/SecondaryNav.tsx` — contextual tab rendering, entity-profile tabs, conditional visibility, horizontal scroll
- `apps/desktop/src/renderer/navigation/nav-config.ts` — config shape, tab visibility predicates, section ordering
- `apps/desktop/src/renderer/chrome/header/continue-button.tsx` (new) — Continue button label derivation and disabled states
- `apps/desktop/src/renderer/chrome/header/actions-menu.tsx` (new) — actions menu rendering, conditional action enablement

### Prior art

The existing `test/renderer/navigation/navbar.test.tsx` (176 lines, 8 tests) establishes the pattern: mount via `createMemoryHistory` + `createRouter` + `RouterProvider`, assert on `screen.getByRole`, test hover-intent with fake timers, test ARIA attributes (`aria-current="page"`). This pattern continues for the new components, with additional test coverage:

- Tab visibility: assert presence/absence of conditionally-rendered tabs for different mock route states
- Context switching: assert that navigating from Squad to a player shows player-profile tabs and the active primary item stays Squad
- Back navigation: assert that pressing Back returns to the originating list (tested by route param, not by DOM state restoration)
- Responsive behavior: test that resize to medium width hides World/Search and shows Continue
- Keyboard navigation: test Tab order, arrow key tab selection, and Enter activation

### Seam

The highest testing seam is the route-aware `RouterProvider` wrapper (existing pattern from `navbar.test.tsx`). For pure-logic assertions (label derivation, visibility predicates), test as plain `.ts` files without jsdom, following the pattern of `test/renderer/chrome/career-header-state.test.ts`.

## Out of Scope

- Visual design of every content page (defined elsewhere, per `docs/menu.md §2`)
- Match engine implementation
- Player or competition data models in full
- Save-game file behavior
- Implementing screen content for entity-profile tabs (only the nav switching mechanism and route mapping are in scope)
- Responsive behavior below 480px (mobile phones — not a supported form factor in MVP)

## Further Notes

The primary source for navigation content (tab names, per-section secondary tabs, entity-profile tabs, match context tabs) is `docs/menu.md`. That document is the canonical definition; this spec adds the implementation architecture and decisions. The wayfinding note at `.agents/notes/proposed/architecture/2026-09-10-menu-nav-architecture.md` records the 10 settled decisions and their rationale.