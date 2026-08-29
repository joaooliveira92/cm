# Map: Championship Manager clone

Label: wayfinder:map

> **Status: closed at handoff.** The destination (a written spec, [spec.md](spec.md)) is reached and
> handed off; implementation is in progress (tickets 09–18 built, 19–20 follow-on decisions). This map
> no longer charts new work. Per [ADR-0010](../../docs/adr/0010-post-handoff-decisions-live-in-adrs-map-closes.md),
> post-handoff decisions live in the ADR layer, not here; this file is retained as the index of the
> decisions the way was built on.

## Destination

A written **spec document** for a Championship Manager 2003/04-style local, single-player Electron
game, architected on pingdotgg/t3code's patterns, ready to hand off to an implementation effort.

v1 scope: single fictional league, one save/career at a time, TEXT-commentary match engine (no 2D
pitch), tactics (formation + role-per-position + team-wide instructions), transfers/contracts with
full-information player attributes, season/calendar loop.

## Notes

**Architecture (decided, not up for re-litigation on this map):**
- pnpm monorepo: `apps/desktop` (Electron main + renderer), `packages/contracts` (Effect RPC schema +
  event/command types), `packages/game-engine` (pure decider + projector + match-sim, DB-agnostic,
  unit-testable without Electron), `packages/shared`. No separate server app — the Electron main
  process is the server.
- Toolchain mirrors t3code 1:1: `vite-plus` (`vp`), `electron-builder`, React, Tailwind v4.
- Effect ecosystem pinned to `rc`/`next` tags together: `effect@rc`, `@effect/platform-node`,
  `@effect/sql-sqlite-node`, `@effect/rpc`, `@effect/vitest`. No mixing v3-targeted satellite packages
  with a v4 core.
- Game/season state is event-sourced: commands -> decider -> events -> projector -> persisted read
  model, one SQL transaction, SQLite via `@effect/sql-sqlite-node` directly, no ORM.
- Renderer talks to main over an `@effect/rpc` `RpcGroup` contract (schema-validated, same shape as
  t3code's `rpc.ts`), transported over Electron IPC (`contextBridge`), **not** a websocket — there is
  no remote client, ever, and won't be.
- Persistence: one SQLite file per save/career under Electron's `userData` dir; multiple saves listed
  at a "continue career" screen, one loaded at a time.
- World is fully fictional (invented league, clubs, generated players) — no real-world names/badges,
  to sidestep licensing/trademark exposure. Real-world data packs are a future, separate concern.
- Full-information player attributes in v1 (no scouting-gated fog-of-war on stats) — direct
  consequence of scouting being out of scope.
- v1 screen list (locked; per-screen layout is fog, not decided here): Club/Squad view, Tactics
  screen, League table & fixtures, Match day (live text commentary), Transfer market/inbox, Season
  summary/end-of-season.
- Skills every session should consult: `grilling`, `domain-modeling` for design tickets touching game
  rules or data shape.

## Decisions so far

- [Player attribute model & data schema](issues/01-player-attribute-model.md): 19 attributes (1–20)
  across Technical/Mental/Physical/Goalkeeping; 10-position taxonomy with a variable-length
  Position + Familiarity Tier table; hidden Potential Ability (1–100) drives an age-based
  grow/plateau/decline curve; Overall Rating and Transfer Value are derived on read, never stored,
  from a code-defined `position_weights` constant (not a SQL table); wide `players` table, no EAV.
  Vocabulary in [CONTEXT.md](../../CONTEXT.md), architecture rationale in
  [ADR-0001](../../docs/adr/0001-derived-player-ratings-and-value.md).
- [Match engine resolution algorithm](issues/02-match-engine-algorithm.md): discrete per-minute
  resolution loop (Minute-Slices + a biased Stoppage Slice per half) rolling three Phase Strengths
  (Attack/Midfield/Defense, derived from Position Ratings) per team; tactics reach the engine only as
  a flat `TacticalModifiers` multiplier struct (formation/role vocabulary stays ticket 03's concern);
  home-advantage multiplier and Stamina-scaled late-match fatigue; mid-match `ChangeTactics`/
  `MakeSubstitution` commands (5 subs / 3 windows, no extra time in v1); full v1 Match Event
  vocabulary (Goal, cards, match-scoped Injury, Substitution, etc.); fully deterministic from a seed
  on `MatchStarted`. Vocabulary in [CONTEXT.md](../../CONTEXT.md) under "Match engine", architecture
  rationale in
  [ADR-0002](../../docs/adr/0002-three-phase-match-strength-and-deterministic-seed.md).
- [Tactics model detail: formations, roles, team instructions](issues/03-tactics-model-detail.md): 5
  fixed v1 formations (4-4-2, 4-3-3, 4-5-1, 3-5-2, 5-3-2), all expressed via the existing Position
  taxonomy, purely structural (no formation-level multiplier); 8 v1 Roles (one per Position) with a
  Role Weights/Role Rating pair parallel to Position Weight/Position Rating, computed at tactic-
  resolution time *outside* the match engine and folded into `TacticalModifiers` as a capped additive
  bump — never replacing Position Rating in Phase Strength; 3 Team Instruction sliders (Mentality,
  Tempo, Pressing) with a locked multiplier table as tunable `packages/shared` constants;
  `event-odds biases` left at 0 for v1. Vocabulary in [CONTEXT.md](../../CONTEXT.md) under "Tactics",
  architecture rationale in
  [ADR-0003](../../docs/adr/0003-role-rating-outside-match-engine.md).
- [Season calendar & fixture generation](issues/04-season-calendar.md): 20-club fixed-membership
  League, double round-robin (38 fixtures/club), no cup competition; Calendar advances by
  jump-to-next-fixture (no day-by-day clock) keyed on Matchday number, not calendar dates; two
  Transfer Windows per season (pre-season until Matchday 1, mid-season Matchday 19→20) with no
  deadline-day mechanic; each season's fixtures freshly shuffled with no seeding; League Table
  tie-break stops at points → goal difference → goals scored (no head-to-head). Vocabulary in
  [CONTEXT.md](../../CONTEXT.md) under "Season & calendar", architecture rationale in
  [ADR-0004](../../docs/adr/0004-fixture-driven-calendar-no-day-clock.md).
- [Transfer & contract mechanics, AI-club behavior](issues/05-transfers-and-ai-clubs.md): formula-only
  wages and Transfer Value (no negotiation for wages), 1–5 year Contracts, expiry to Free Agent at
  Credits 0; per-club Transfer Budget (spend-down, no window-to-window replenishment) and Wage Budget
  (running cap) from a fixed stature tier, not board-set; any player biddable regardless of Listed
  flag; single-counter-offer Bid flow; AI clubs buy/sell via fixed multipliers of Transfer Value with
  no squad-need awareness; AI clubs get one fixed best-fit Tactic per Season, no reactive tactics.
  Vocabulary in [CONTEXT.md](../../CONTEXT.md) under "Transfers & contracts", architecture rationale in
  [ADR-0005](../../docs/adr/0005-formula-driven-transfer-economy.md).
- [Board objectives & win/loss conditions](issues/06-board-objectives.md): per-club League-position
  Board Objective, a sibling of Transfer/Wage Budget both derived independently from the same
  permanently-fixed Stature Tier (not one constraining the other); only the player's club is judged,
  strictly at Season end (`SeasonConcluded` → `BoardObjectiveJudged`, Verdict Exceeded/Met/Missed); a
  Consecutive-Miss Counter drives `ManagerWarned` at one miss and `ManagerSacked` (save archived,
  read-only, no re-hire flow) at two in a row; exceeding is flavor-only; no explicit win state, careers
  are open-ended. Vocabulary in [CONTEXT.md](../../CONTEXT.md) under "Board & objectives", architecture
  rationale in [ADR-0006](../../docs/adr/0006-board-objectives-and-manager-sacking.md).

- [Draft the Effect RPC contract & event-sourcing schema](issues/07-rpc-contract-schema.md): three
  domain-bounded Deciders (Club per club ×20, Match per Fixture, Season/Calendar per save) rather than
  one global Decider or finer Club splitting; League Table is a projection, not a Decider; one typed
  RpcGroup method per Command/query, no generic envelope; `AdvanceCalendar` is the sole time-advancing
  command, batch-resolving other Fixtures via internal-only `SimulateAiFixture`; AI clubs reuse
  human-facing Commands self-issued internally; live matches use chunked `ResumeSimulation`
  resimulation (no RPC streaming); cross-Decider reactions run as an in-process synchronous reactor (no
  outbox); `CompleteTransfer` spans two Club streams in one SQL transaction (safe under single-file
  SQLite). Vocabulary in [CONTEXT.md](../../CONTEXT.md) under "Technical contract", architecture
  rationale in
  [ADR-0007](../../docs/adr/0007-domain-bounded-deciders-and-chunked-match-resimulation.md).
- [Match commentary text-generation approach](issues/08-match-commentary-generation.md): pure
  templated strings (a fixed Commentary Template pool per Match Event type, no generation/composition
  engine); player/team names and (for Goal/HalfTimeReached/FullTimeWhistle only) the running scoreline
  baked into the line from the event payload, minute rendered separately by the UI; a Commentary Line
  only fires alongside an actual Match Event — quiet Minute-Slices produce nothing; last-used-template
  exclusion per event type per match to dodge back-to-back repeats; templates live in `packages/shared`
  alongside Position/Role Weights. Vocabulary in [CONTEXT.md](../../CONTEXT.md) under "Match
  commentary", architecture rationale in
  [ADR-0008](../../docs/adr/0008-templated-match-commentary.md).
- [Match engine runtime consumes resolved flat phase-slots, not Tactic](issues/19-engine-flat-phase-slots.md): each tactic (at setup and each mid-match `ChangeTactics`) resolves once at a new `resolveTeamTactics` boundary into a flat, engine-owned shape — `slots: { playerId, phase, fit }[]` with formation/role vocabulary dropped, plus flat instruction multipliers. Each slot's `fit` closure rates whichever player occupies it, so substitutions need no tactics knowledge; `TeamRuntimeState` carries only that shape and `pickPlayerId` selects event participants from the attack phase instead of hardcoded formation positions; red cards remove slots, subs swap a slot's `playerId`. This closes the ADR-0002 "zero knowledge" gap in code, verified byte-identical to the pre-refactor engine across a 120-seed sweep and three command scenarios.
- [Update the tactical boundary ADR to name the flat phase-slot resolution](issues/20-adr-0002-flat-phase-boundary.md): ADR-0002's tactics-boundary paragraph now names the exact two shapes the engine consumes — the five `TacticalModifiers` numbers plus the resolved phase-slot map — and states plainly that Position/Role vocabulary survives only inside per-slot `fit` closures at resolution, which is what lets the engine pick event participants without reading a formation or role name. Written against the refactor in the preceding ticket, not ahead of it.

## Not yet specified

- Per-screen UI layout/interaction for the six locked v1 screens — all six underlying domain tickets
  (attributes, match engine, tactics, transfers, calendar, board objectives) are now resolved, so each
  screen is ready to graduate into a prototype ticket. **One inherited constraint on the Squad screen**:
  the onboarding effort's
  [ticket 11](../onboarding/issues/11-training-focus-has-no-ui.md) requires Squad to carry an editable
  per-player Training Focus column and its Term Disclosure, so that the shipped `SetTrainingFocus`
  command is player-reachable. This does **not** reopen Training as a cm-clone feature area or add a
  seventh screen; it fixes one column on an already-wide table, whose density, optional Attribute
  columns and responsive behaviour remain this fog's to settle.
- Match engine event-odds mechanics (which events `TacticalModifiers`' `event-odds biases` field
  actually biases, and by how much) — ticket 02 named the field but didn't specify it; once it is,
  ticket 03's Roles may want to feed it (currently defaulted to 0).
- Persistent, cross-match fitness/injury-proneness system (in-match Injury events and their
  match-scoped handling are decided — see [Match engine resolution algorithm](issues/02-match-engine-algorithm.md)
  — this is only the season-long layer: recovery timelines, injury-proneness attributes, how it
  feeds back into match availability).
- Stature Tier mobility (whether/how a club can move tiers after sustained over/under-performance) —
  explicitly deferred by [Board objectives & win/loss conditions](issues/06-board-objectives.md); v1
  keeps Stature Tier permanently fixed.
- AI difficulty/skill tiers for opponent clubs.

## Out of scope

- Training — cut from v1 scope during destination-setting; may return as a later map.
- Scouting — cut from v1; full-information attributes are the direct consequence.
- Media / press conferences — cut from v1 scope during destination-setting.
- Multi-league structure, promotion/relegation — cut from v1 scope during destination-setting.
- Visual (2D pitch) match engine — text-commentary only is the v1 fidelity target.
- Real-world clubs/players/leagues, and any remote/multi-client access — ruled out permanently
  (legal exposure and explicit "never a remote client" decision, respectively), not just deferred.
