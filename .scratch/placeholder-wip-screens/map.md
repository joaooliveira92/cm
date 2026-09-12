# Map: Placeholder WIP screens for CM 03/04 clone

Labels: wayfinder:map

## Destination

Create placeholder WIP screens for every missing CM 03/04 destination in the existing clone app so that navigation shortcuts (g-keys, navbar clicks, palette) no longer dead-end. Each placeholder is at skeleton depth: correct `data-focus-id`, `aria-label`, focus management, route registration, and nav-config wiring — but no domain logic or real data. The navbar is already top-bar (not sidebar), which is the one architectural difference from the original game.

## Notes

- Standard existing patterns: `defineCareerChild()` for career scoped routes, `CareerClubChildView` for club drill-downs, entity-scoped routes at `/career/$saveId/{entity}/$entityId/...` for new entity types (player, staff, nation).
- Placeholder depth: **skeleton** — `<main tabIndex={-1} data-focus-id="screenName" aria-label="Screen Name">` shell with the title and "WIP" badge, plus a stub provider pattern if the existing screen triple pattern (`{ state, actions, meta }`) requires it for the shell to mount without throwing. No domain logic, no RPC calls in the placeholder itself.
- Nav section layout: existing 7 sections (Squad, Tactics, Training, Recruitment, Analysis, News, Club) — add a **World** section for Competitions, Nations, Clubs. Fold new sub-items into existing sections where they belong (Club Info/Finances/History under Club, Staff under Squad, Search/Shortlist/Scouting under Recruitment).
- The map's `Blocked by` uses ticket numbers (NN format) from `.scratch/placeholder-wip-screens/issues/`.

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [Batch 1: Career-scoped placeholder screens](issues/01-career-scoped-placeholders.md): 15 skeleton placeholder screens created with routes, nav-config wiring (8 sections, g1-g8), and keyboard spine integration.
- [Player contextual placeholders](issues/02-player-contextual-placeholders.md): 8 player sub-screen routes under `/career/$saveId/player/$playerId/...` with `CareerPlayerChildView`.
- [Staff contextual placeholders](issues/03-staff-contextual-placeholders.md): 5 staff sub-screen routes under `/career/$saveId/staff/$staffId/...`.
- [Club contextual (other club views)](issues/04-club-contextual-placeholders.md): 9 new club sub-surface routes under existing `/career/$saveId/club/$clubId/...`.
- [Nation contextual placeholders](issues/05-nation-contextual-placeholders.md): 10 nation sub-screen routes under `/career/$saveId/nation/$nationId/...`.
- [Competition contextual placeholders](issues/06-competition-contextual-placeholders.md): 12 competition sub-screen routes under `/career/$saveId/competition/$competitionId/...`.
- [Match sub-screen placeholders](issues/07-match-sub-screen-placeholders.md): 13 match sub-screen flat routes at `/career/$saveId/match-*`.

## Not yet specified

*(All contextual placeholders implemented in tickets 02-07. No remaining fog for this effort.)*

## Out of scope

- Full (non-placeholder) implementations of any screen — placeholder first, real content later as a separate effort.
- Changing the sidebar-to-navbar architectural decision — already done.