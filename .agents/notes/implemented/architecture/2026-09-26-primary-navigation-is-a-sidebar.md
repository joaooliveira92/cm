# Agent Note: Primary navigation is a sidebar

Status: implemented

> **Superseded in part, 2026-09-27.** A section's items no longer expand inline under its row: they
> open in a click-only panel beside the sidebar, and the route's section is marked with a caption
> naming the current item. Decision 2 (one section expanded, following the route) and the item half
> of decision 7 no longer hold. See
> [section items open in a flyout](2026-09-27-section-items-open-in-a-flyout.md).

## Problem

The two-row top navbar shipped, and reviewing it against the game it clones showed the shape was
wrong for this app. Three things were wrong at once, and only the third is a matter of taste.

**The shell had grown six horizontal bands above the screen.** Title band, season readout, primary
nav row, context submenu strip, screen toolbar, contextual tab row — then the bands the career loop
adds when it has something to report. On the 800px-tall window the app opens at, a table screen was
reading through a slot.

**Two vocabularies were on screen for the same idea.** `nav-config.ts` owned eight sections whose
items are real destinations, and `spec-nav-config.ts` owned ten sections whose tabs came from
`docs/menu.md`. Both rendered. On `/career/:saveId/squad` a player saw the Squad submenu strip (Squad,
Staff, Information, Finances, Fixtures, Transfers, Last Match, Serie A, History) *and*, two bands
below it, a Squad tab row (First Team, Reserves, Under-19s, Selection, Statistics, Reports) whose
entries mostly resolved to no destination at all — `tabToDestination` returned `null` for every tab id
that did not happen to equal a destination type. The second row was decorative and, where it wasn't,
misleading.

**`PrimaryNav.tsx` was never mounted.** 327 lines with a passing test file and no consumer: the
horizontal primary row that shipped was the older `PrimaryNavItem` + `ContextNav` pair, so the two
halves of the two-row model came from two different configs.

## Decision

The primary sections and their items both live in a left sidebar, built on the vendored shadcn sidebar
primitive. One section is expanded at a time, and by default it is the section the route belongs to.

1. **`nav-config.ts` is the navigation model.** Its eight sections are the sidebar's rows and their
   `items` are the submenu each row expands into. It won over `spec-nav-config.ts` because its
   destinations exist: every entry navigates somewhere the router can reach. `SPEC_SECTIONS` no longer
   renders anything.

2. **One expanded section, following the route.** A user toggle overrides which section is open, and
   the override is dropped on the next navigation, so arriving anywhere re-syncs the sidebar to the
   route. This is the vertical form of what the single submenu strip enforced horizontally, and it
   earns more than familiarity: the sidebar's height stays predictable, and an item label two sections
   share — "Transfers" belongs to both Squad and Recruitment — resolves to exactly one control,
   because Base UI's collapsible panel unmounts its contents while closed.

3. **Hover-intent is gone.** Previewing a section on hover made sense when the submenu appeared in a
   fixed strip below the row. In a sidebar it would reflow everything under the pointer, so expansion
   is click-only and `useHoverIntent.ts` is deleted.

4. **`ContextTabs` replaces `SecondaryNav`, and only for the contexts a section cannot express.** An
   entity profile and a match keep a horizontal tab row, because both are transient — a player screen
   is somewhere you pass through, not a standing domain — and neither has a sidebar section to expand.
   On a section route the row renders nothing. The rename matters: in this game the secondary
   navigation *is* a section's item list, and it is in the sidebar now, so a component called
   `SecondaryNav` meaning something else was the naming half of the same confusion.

5. **The header spans the full width, above the sidebar.** It is the window's drag handle
   (`titleBarStyle: "hiddenInset"` leaves macOS with no other one) and it carries the club identity,
   which belongs to the save rather than to the navigation. `--header-height` names that band's height
   in one place; the sidebar is the next flex row down and needs no offset against it, unlike the
   shadcn block this was modelled on, which positions the sidebar `fixed` against the viewport.

6. **Everything the screen owns moved inside the content column.** The screen toolbar and the
   career-loop bands sit beside the screen rather than above the whole shell, so they resize with it
   instead of pushing the shell down.

7. **The keyboard model is unchanged.** `g <1-8>` still reaches a section and `g <n> <q,w,e,…>` still
   reaches an item; the hints render on the sidebar rows and on the expanded section's items. The
   sections are still ordered by `NAV_SECTIONS`, which is what both levels of the prefix derive from.

8. **Rows carry `data-nav-section` / `data-nav-item`.** With both levels on screen at once their
   labels collide — "Squad" is the Squad section *and* its first item — so the e2e navigation helper
   addresses rows by `nav-config.ts` id instead of by visible label. That also makes a label rename a
   no-op for the suite.

## What this supersedes

[Menu navigation state and component architecture](2026-09-10-menu-nav-architecture.md), partially.

Superseded: decision 4 (two independent nav components reading the route), decision 7 (responsive
breakpoints at 1200px/768px for hiding primary items), decision 9 (horizontal scroll with a fade
gradient for overflow primary items), and decision 10 ("More" as a dropdown) — `MORE_ITEMS` had no
sidebar home and no destinations, and went with `PrimaryNav.tsx`.

Still standing: decision 1 (URL-only state ownership — the sidebar derives active section and item
from the route and owns only which section is expanded), decision 2 (`?origin=` for entity contexts),
decision 3 (browser history for back/forward, with `list-state-storage.ts` and `scroll-state.ts`
unchanged), decision 5 (config objects with visibility predicates, which is how the match tabs still
work), decision 6 (the actions menu is page-level, not navigation), and decision 8 (no animation on
context swaps).

The horizontal-scroll consequence that note recorded — "less discoverable than a dropdown for users
who don't expect inline scroll in a nav row" — is resolved rather than mitigated: a vertical list of
ten items needs no gesture to read.

## Alternatives considered

- **Keep the two rows and merge the two configs.** This was the smaller change and it fixes the
  duplicate vocabulary, but not the six bands: the deepest cause is that every navigation level costs
  vertical space in a horizontal navbar, and this app has two levels and an 800px window. Rejected
  for that reason, not for the duplication.

- **Build the sidebar from `spec-nav-config.ts`.** Its ten sections match `docs/menu.md` exactly and
  the tab lists are richer. Rejected because its tabs are not destinations: adopting it would have
  meant either shipping a sidebar of mostly dead links or writing the missing routes first, which is a
  much larger effort than a navigation refactor. `docs/menu.md` remains the source for what the
  sections *should* eventually contain; `nav-config.ts` remains the record of what exists.

- **Primary sections in the sidebar, secondary items in a horizontal row.** Preserves the two-level
  reading and removes only one band. Rejected because it keeps the worst property of the old shape —
  the second level's width is bounded by the window, which is what forced the sideways wheel gesture
  on Recruitment's ten entries — and because it splits one config across two orientations.

- **`offcanvas` collapse instead of `icon`.** Rejected: a manager who collapses the sidebar to read a
  wide table still needs to get back out of that table, and an icon rail keeps every section one click
  away. Off-canvas is kept for the mobile breakpoint, where a 3rem rail is not affordable.

## Consequences

- The shell is two bands above the screen (title, readout) plus the toolbar row inside the content
  column, down from six.
- `Navbar.tsx`, `PrimaryNavItem.tsx`, `ContextNav.tsx`, `PrimaryNav.tsx`, `SecondaryNav.tsx` and
  `useHoverIntent.ts` are deleted; `CareerSidebar.tsx`, `SidebarNavSection.tsx` and `ContextTabs.tsx`
  replace them.
- `docs/menu.md`'s ban on a persistent sidebar is reversed in place, and its two-row layout diagrams
  are now a record of a shape that was tried rather than a specification. Its navigation *content* is
  untouched and still canonical.
- `spec-nav-config.ts` still exports the types `entity-nav-config.ts`, `match-nav-config.ts` and
  `nav-route-parser.ts` depend on, but `SPEC_SECTIONS` and `MORE_ITEMS` now have no renderer. They are
  left in place rather than deleted: `?origin=` parsing resolves against `SPEC_SECTIONS` ids, so
  removing them is its own change with its own route work.
- `routeSegmentToEntityType` in `nav-route-parser.ts` maps `players`/`staff`/`nations`, but the route
  tree serves `player/$playerId` and `staff`. `ContextTabs` therefore renders on no entity screen that
  currently ships — it is correct and tested, and inert until the entity routes are pluralised. This
  predates the refactor; it was hidden by the section tabs that used to render in its place.
- `ShortcutHint` takes a `className`, because a sidebar row is a full-width block rather than the
  inline control the horizontal navbar wrapped.
