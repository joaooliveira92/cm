# Agent Note: Career-scoped placeholder screens for CM 03/04 clone

Status: proposed

## Problem

The existing clone app had ~12 real screens but approximately 15+ CM 03/04 destinations the user expects to navigate to via the top navbar, `g <key>` shortcuts, and the command palette. Navigating to these destinations produced nothing — no route matched, the spine's action registry lacked a handler, and the user landed on either a blank shell or an error. The F-key equivalents from the original game (F3 Finances, F8 Search, F9 Chat, F10 Game Status, F11 Training) had no targets either.

Without placeholders, every missing screen is a dead end that breaks the keyboard-first navigation loop. A skeleton placeholder solves this without requiring any domain logic or RPC handlers: it renders, accepts focus, and announces itself via aria — so the keyboard system works, the palette works, and the navbar highlights the active section.

## Proposal

Create a set of 15 new career-scoped routes, each with a skeleton placeholder screen component. The convention for every placeholder is:

- **One `defineCareerChild` route** registered in `router/index.tsx`, with a unique `screenId` and path segment.
- **A skeleton component** in `src/renderer/<feature-name>/<FeatureName>Screen.tsx` — a `<main>` element with `tabIndex={-1}`, `data-focus-id`, and `aria-label`, a title heading, and an italic "WIP — Placeholder screen" subtitle.
- **No RPC calls, no provider pattern, no action handlers.** The skeleton renders unconditionally with no data dependencies.
- **A destination type** in the `CareerDestination` discriminated union in `destinations.ts`, with entries in `resolveDestination`, `careerRoute`, `CAREER_G_BINDINGS`, `CAREER_SCREEN_TYPES`, and `SaveScopedCareerDestinationType`.
- **A nav-config entry** — either as a new section (World) or as a sub-item under an existing section (Club, Recruitment).
- **An adapter switch arm** in `adapter.ts` for the new route path.
- **A `destinationToRouteChild` entry** in `NavProvider.tsx`.
- **A `target` record entry** in `KeyboardSpine.tsx`.

The nav section layout becomes 8 sections in display order: Squad (g1), Tactics (g2), Training (g3), Recruitment (g4), Analysis (g5), News (g6), Club (g7), World (g8). A new "World" section houses Competitions, Nations, and Clubs. Game Status and Manager Chat live under the Club section as utility items.

### Screens created

| # | Screen id | Route path | Section | Nav location |
|---|-----------|-----------|---------|-------------|
| 1 | training | `/career/$saveId/training` | Training (g3) | Own section (default) |
| 2 | clubInfo | `/career/$saveId/club-info` | Club (g7) | Club > Information |
| 3 | boardConfidence | `/career/$saveId/board-confidence` | Club (g7) | Club > Board Confidence |
| 4 | clubHistory | `/career/$saveId/club-history` | Club (g7) | Club > History |
| 5 | finances | `/career/$saveId/finances` | Club (g7) | Club > Finances |
| 6 | staffOverview | `/career/$saveId/staff-overview` | Club (g7) | Club > Staff |
| 7 | shortlist | `/career/$saveId/shortlist` | Recruitment (g4) | Recruitment > Shortlist |
| 8 | scouting | `/career/$saveId/scouting` | Recruitment (g4) | Recruitment > Scouting |
| 9 | playerSearch | `/career/$saveId/player-search` | Recruitment (g4) | Recruitment > Player Search |
| 10 | staffSearch | `/career/$saveId/staff-search` | Recruitment (g4) | Recruitment > Staff Search |
| 11 | competitions | `/career/$saveId/competitions` | World (g8) | World > Competitions (default) |
| 12 | nations | `/career/$saveId/nations` | World (g8) | World > Nations |
| 13 | clubs | `/career/$saveId/clubs` | World (g8) | World > Clubs |
| 14 | gameStatus | `/career/$saveId/game-status` | Club (g7) | Club > Game Status |
| 15 | managerChat | `/career/$saveId/manager-chat` | Club (g7) | Club > Manager Chat |

### Files changed

- `apps/desktop/src/renderer/navigation/destinations.ts` — types, bindings, resolver
- `apps/desktop/src/renderer/navigation/nav-config.ts` — new World section, expanded sub-items
- `apps/desktop/src/renderer/navigation/adapter.ts` — route switch arms
- `apps/desktop/src/renderer/navigation/NavProvider.tsx` — route child mappings
- `apps/desktop/src/renderer/keyboard/KeyboardSpine.tsx` — action target record
- `apps/desktop/src/renderer/router/index.tsx` — route definitions and tree
- 15 new screen files under `src/renderer/<feature-name>/`
- `test/renderer/router/stage2.test.ts` — updated g-binding expectations (7→8 sections)

## Alternatives considered

- **Single "Under Construction" route with a query-param-driven title.** Rejected: it would lose the `data-focus-id` per screen, breaking keyboard focus restoration (the spine would restore focus to the same id for every screen). Each screen needs a unique identity.

- **Only create routes without screen files (use a fallback component).** Rejected: `tanstack/react-router` requires a registered component per route. A shared fallback is possible via a generic `<WipPlaceholder screenId={...} />` pattern, but the explicit per-screen file is trivially more code and avoids indirection — the placeholder becomes the real screen when someone implements it.

- **Defer route registration until the screen is implemented.** Rejected: this is exactly the state that produced dead-end navigation. The whole point is that the route exists, so the navbar highlights, the spine binds, and the palette completes.

- **Placeholder at full provider/atom depth.** Rejected: the skeleton pattern avoids RPC calls that would fail with no backend handler. Providers and atoms are added when the real implementation lands.

## Acceptance criteria

- Navigating to any of the 15 new routes (via navbar click, `g <key>` shortcut, or direct URL) renders the skeleton — title + "WIP" indicator — without crashing.
- Each screen has a unique `data-focus-id` matching its `screenId` in the route definition.
- The `g <3>` key navigates to Training (was previously falling back to Squad).
- The World section appears in the navbar at position 8 with Competitions, Nations, and Clubs sub-items.
- All existing tests pass (only pre-existing `window is not defined` scroll-state failures remain).
- The typecheck, lint, and effect-lint gates pass with no new violations.

## Risks

- **Binding shift**: Changing g3 from squad → training means players used to g3 for squad will now go to training. The squad remains at g1. This is a one-time adjustment. The previous g3→squad was itself a fallback; training is the correct CM 03/04 F11 binding.

- **Stale fallback items**: Six Squad sub-items (staff, information, finances, fixtures, transfers, history) still point to squad or other existing screens as destinations, mirroring the original game's behavior where those are in-squad views, not separate pages. If the Squad screen is later split, these should be re-pointed.

- **Contextual screen ordering**: Tickets 02-07 in this effort's map define the contextual drill-downs. The routing pattern established here (flat routes under `$saveId/`) will need to coexist with contextual routes under `$saveId/player/$playerId/` etc. No conflict is expected since the flat and parameterized paths are structurally distinct.