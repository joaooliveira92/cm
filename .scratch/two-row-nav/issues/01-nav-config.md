# 01: Nav config + URL-derived state

**What to build:** A data-driven navigation configuration (`nav-config.ts`) that defines exactly 10 primary sections (Manager, Squad, Tactics, Training, Transfers, Club, Competitions, World, Search, More) with their secondary tabs, entity-profile tab definitions, and match-context tab definitions. Each tab descriptor supports a `visible: (context) => boolean` predicate for conditional tabs. The file also exports URL-parsing utilities that derive the active primary section, secondary tab, entity context, and context selector from the route — no React context, no Zustand store. This replaces the existing 7-section `nav-config.ts` and the `NavProvider` + `navContext.ts` contextual state pattern.

Configs to define:

- Primary sections (spec §5): labels, default destinations, and secondary tab arrays per section
- Entity-profile tabs (spec §6): Player, Staff, Club, Nation, Competition, Match (non-live)
- Match-context tabs (spec §7–9): Pre-match, Live-match, Post-match
- Visibility predicates: conditional tabs (Table, Tree, Draw, Coefficients, Awards, Stages, Live Table) each expose a `visible` function
- Context selector definitions: competition selector, squad selector, squad-level selector
- URL parser: derive active section/tab/entity from route path + search params

Route ownership logic: when an entity profile is opened, `?origin=<sectionId>` encodes which primary section was active. The parser reads this to keep the correct primary item lit.

**Decisions:**

- URL-only state ownership. See [Agent Note](../../.agents/notes/proposed/architecture/2026-09-10-menu-nav-architecture.md).
- Config objects with visibility predicates. See [Agent Note](../../.agents/notes/proposed/architecture/2026-09-10-menu-nav-architecture.md).

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] `nav-config.ts` defines all 10 primary sections with correct labels, default destinations, icons, and secondary tabs per spec §5
- [x] Entity-profile tab configs exist for Player, Staff, Club, Nation, Competition, Match per spec §6
- [x] Match-context tab configs exist for Pre-match (spec §7), Live-match (spec §8), Post-match (spec §9)
- [x] Conditional tabs use predicate functions checked against context (competition type, match type, squad level)
- [x] Context selector definitions exist for competition and squad selection
- [x] URL parser derives active primary section, secondary tab, and entity context from route path + `?origin=` param
- [x] Pure-logic tests (no jsdom) cover every config's shape, every visibility predicate, and URL parsing