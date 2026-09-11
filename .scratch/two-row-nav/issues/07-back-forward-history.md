# 07: Back/Forward and history preservation

**What to build:** Application history management using the browser's native `history.pushState` / `popstate` API (spec §10). No custom JavaScript navigation stack.

When navigating away from a list and returning, preserve (spec §10.1):
- selected filters
- sorting
- visible columns
- pagination or virtual-scroll position
- selected squad
- selected competition
- selected stage or round
- expanded groups
- active tab where appropriate

A history entry captures (spec §10.2):
- route
- entity identifier
- active primary section
- active secondary tab
- relevant context selector
- recoverable list state

List state is encoded as URL search params wherever practical to leverage browser restoration. Full-text search queries that would bloat URLs may use sessionStorage.

**Decisions:**

- Browser history API for back/forward. See [Agent Note](.agents/notes/proposed/architecture/2026-09-10-menu-nav-architecture.md).

**Blocked by:** 02 (PrimaryNav), 03 (SecondaryNav).

**Status:** ready-for-agent

- [ ] Back and Forward use browser `history.pushState` / `popstate` (spec §10.2)
- [ ] Returning from an entity profile to a list restores: filters, sorting, visible columns, scroll position
- [ ] Returning restores: selected squad, selected competition, selected stage/round, expanded groups
- [ ] Navigating back to a section restores its secondary tab selection
- [ ] History entries capture route, entity id, primary section, secondary tab, context selector
- [ ] List state is encoded as URL search params (full-text search may use sessionStorage)
- [ ] Tests cover: state preservation on back navigation, URL param encoding/decoding, sessionStorage fallback for search queries