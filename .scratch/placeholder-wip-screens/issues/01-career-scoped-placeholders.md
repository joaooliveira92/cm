# Batch 1: Career-scoped placeholder screens

Type: task
Status: resolved
Blocked by:

## Question

Create skeleton placeholder screens for ~14 career-scoped destinations that currently have no route, so that `g <key>` navigation, navbar clicks, and the command palette land on a real page instead of nothing. The screens are:

**New standalone routes:**
- Training (existing nav section, currently falls back to "squad")
- Club Information (club overview)
- Board Confidence
- History (club historical records)
- Finances (club financial overview)
- Staff (your own club's staff — distinct from the `/club/$clubId/staff` drill-down)
- Shortlist
- Scouting
- Player Search
- Staff Search
- Competitions (competition browser)
- Nations (national teams browser)
- Clubs (club browser)
- Game Status
- Manager Chat

**Work required:**
1. Add each destination to the `CareerDestination` type in `destinations.ts`
2. Add each destination to `resolveDestination` in `destinations.ts`
3. Add each destination to `SaveScopedCareerDestinationType` (most, except drill-downs)
4. Register each route in the router via `defineCareerChild()`
5. Update `nav-config.ts` — add a new "World" section (Competitions, Nations, Clubs), populate sub-items in existing sections
6. Update `CAREER_G_BINDINGS` — potentially re-map or extend for new sections
7. Create skeleton screen components following the established pattern: `<main tabIndex={-1} data-focus-id="..." aria-label="...">` with title and "WIP" badge
8. Handle the Game Status case — is it a nav screen or a menu action?

Each placeholder must not throw and must render without crashing even with zero RPC data, since there's no backend handler for its query yet.

## Answer

**15 placeholder screens created, wired into 8 nav sections with g1-g8 bindings.** See [Agent Note](../../../.agents/notes/proposed/feature/2026-09-11-career-scoped-placeholder-screens.md).