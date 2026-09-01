# 04: Setup state, derived atoms, and the league grid

**What to build:** the authoritative setup state and its derived view, plus the primary dense workspace control — a TanStack-backed, CSS-Grid league table. From the spec's "one authoritative setup state; everything else is derived" and "TanStack Table for identity and rendering, not state ownership" decisions:

- A single setup state carries the active leagues (each with a stable league-id and depth), the scope-level intents, and the advanced options from ticket 03.
- Derived atoms compute active-league count, entity count (from ticket 02), processing-cost reading, recommendation reasons, validation status, and whether Continue is allowed — none of them written into authoritative state, and never synchronized through a `useEffect` (no value can go stale).
- Interactions are typed intents — `changeSimulationDepth({ leagueId, simulationDepth })`, `addActiveLeague`, `removeActiveLeague`, `applySetupPreset`, `changeAdvancedOption`, and the rest — never arbitrary path mutation.
- The league table renders one dense row per active league: identifier (emblem, name, scope description), depth selector, recommendation cell (icon + visible text from ticket 02), and an accessibly-named remove action. Rows carry stable ids keyed by league id, never the array index; the body renders on CSS Grid; future sorting and grouping remain available.

The slice's edge promise: renderer-local, with no I/O beyond the resolved-selection atoms the concerns already read — no new RPC method exists yet. Failures are checked values, not throws: the derived atoms surface validation as a value the grid composes, never a thrown error. Callers observe the row model, the typed intents it fires, and the derived figures.

**Blocked by:** 01 — Simulation Depth and the active-leagues projection (the row model and depth first); 02 — Consequences — entity count, processing cost, recommendations (the derived figures).

**Status:** ready-for-agent

- [ ] One authoritative setup state carries active leagues, scope intents, and advanced options; a league row's identity is a stable league id, never the array index.
- [ ] Derived atoms compute count, entity count, processing cost, recommendations, validation status, and can-continue — none stored in authoritative state, no `useEffect` copying.
- [ ] The league table renders one row per active league with identifier, depth selector, recommendation cell (icon + visible text), and an accessibly-named remove; body renders on CSS Grid.
- [ ] Interactions fire as typed intents targeting the correct stable league id; no arbitrary path mutation exists.
- [ ] Component tests cover: all configured leagues render; changing depth emits the correct intent against the correct id; remove targets the correct id; derived summary values update after a config change; Continue is disabled when validation fails. Prior art: the existing league-selection-screen test seam.
- [ ] `pnpm check:all` is green at this commit.