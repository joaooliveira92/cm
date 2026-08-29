Status: ready-for-agent

# Championship Manager clone — v1 spec

## Problem Statement

The user wants to play a Championship Manager 2003/04-style football management game — squad
selection, tactics, transfers, and a season-long league campaign resolved through text commentary
rather than a 2D pitch — but no such game exists in a form they control: modern management sims have
drifted toward licensed real-world data, live-service monetization, or 3D match engines the user
doesn't want. They want a local, single-player, text-first management sim they own outright, that
respects the era's constraint of full-information scouting (no fog-of-war busywork) and a fast
season loop (jump straight to the next fixture, no idle days to click through).

## Solution

A local, single-player Electron desktop game: one fictional league of 20 clubs, one save/career at a
time. The player manages a single club through a squad screen, a tactics screen (formation + role per
position + team-wide instructions), a league table & fixtures screen, a match day screen (live
text commentary), a transfer market/inbox, and a season summary screen. Seasons resolve via a
double round-robin; the player advances by jumping to the next fixture or transfer window boundary,
never a day-by-day clock. Player attributes are fully visible; transfer value, wages, and AI-club
buying/selling behavior are all formula-driven off the same visible numbers everyone can see. A
season ends in Board judgment against a league-position objective; two consecutive misses ends the
career.

The game is architected on pingdotgg/t3code's patterns: a pnpm monorepo with `apps/desktop`
(Electron), `packages/contracts` (Effect RPC schema), `packages/game-engine` (pure, DB-agnostic
deciders/projectors/match-sim), and `packages/shared` (game-design constants). Game state is
event-sourced into SQLite, one file per save.

## User Stories

1. As a manager, I want to see my full squad with every player's attributes and position ratings, so
   that I can judge who fits where without guessing.
2. As a manager, I want to see each player's Overall Rating as a single number, so that I can compare
   players at a glance without mentally averaging 19 attributes.
3. As a manager, I want to see each player's rating at positions other than their primary one, so
   that I can consider moving someone out of position when injuries or form force my hand.
4. As a manager, I want to see a player's age and get a sense of whether they'll improve or decline,
   so that I can plan squad turnover without seeing the exact hidden Potential Ability number.
5. As a manager, I want new save-games to generate a full league of fictional players with sensible
   attribute spreads (some prospects, some journeymen, some stars), so that every career feels
   distinct and plausible.
6. As a manager, I want a squad of realistic depth (enough players to fill every position plus
   backups) generated per club at career start, so that I'm not stuck starting a career short-handed.
7. As a manager, I want to select one of five fixed formations for my team, so that I can shape how
   my squad lines up without hand-building a formation from scratch.
8. As a manager, I want to assign a tactical Role to each outfield slot in my formation, so that I can
   tell a Ball-Playing Defender to play differently from a pure stopper.
9. As a manager, I want to see how well a specific player suits the Role I've put them in, so that I
   can catch a mismatch (a slow player assigned Wing-Back) before kickoff.
10. As a manager, I want to set team-wide Mentality, Tempo, and Pressing sliders, so that I can shape
    my team's overall approach beyond individual role assignments.
11. As a manager, I want my tactic (formation, roles, instructions) to persist between matches until I
    change it, so that I don't have to re-set it before every fixture.
12. As a manager, I want to change my tactics mid-match, so that I can react to being behind or
    protect a lead.
13. As a manager, I want to make substitutions mid-match (up to 5, across up to 3 windows), so that I
    can respond to fatigue, injuries, or tactical need.
14. As a manager, I want to see my league table update as fixtures resolve, so that I always know
    where my club stands.
15. As a manager, I want the league table to break ties by goal difference then goals scored, so that
    standings behave the way I expect from a real league table.
16. As a manager, I want to see my full fixture list for the season, so that I can plan around
    upcoming opponents.
17. As a manager, I want to advance the calendar to the next fixture or transfer window boundary with
    a single action, so that I'm not clicking through empty days with nothing to do.
18. As a manager, I want all other league fixtures on my matchday to resolve automatically when I
    advance, so that the league table and season stay consistent without me simulating 19 other
    matches by hand.
19. As a manager, I want to watch my own match unfold as a live scrolling text commentary feed, so
    that I get the drama of a live match without a 2D pitch.
20. As a manager, I want the commentary to name the players and teams involved in each event, so that
    the feed reads like real commentary rather than generic event logs.
21. As a manager, I want the commentary to show the running scoreline when a goal is scored or a half
    ends, so that I can follow the state of the match from the feed alone.
22. As a manager, I want commentary phrasing to vary across a match rather than repeat the same line
    for the same event type back to back, so that the feed doesn't feel robotic.
23. As a manager, I want to see match events like goals, cards, injuries, and substitutions called out
    distinctly in the feed, so that I understand what's shaping the scoreline.
24. As a manager, I want a match's outcome to be reproducible from its recorded events, so that I can
    trust that revisiting a match's history shows exactly what happened, not a new random replay.
25. As a manager, I want two transfer windows per season (pre-season and mid-season), so that my
    transfer activity follows a realistic season rhythm.
26. As a manager, I want to see my Transfer Budget and Wage Budget at all times, so that I know what
    I can afford before I bid.
27. As a manager, I want bidding for a player outside an open transfer window to be rejected, so that
    the game enforces the same window rules I have to play by.
28. As a manager, I want to bid for any player regardless of whether their club has listed them, so
    that I can pursue any target, matching how transfer speculation actually works.
29. As a manager, I want a selling club to be able to accept, reject, or counter my bid exactly once,
    so that negotiations resolve quickly without dragging on indefinitely.
30. As a manager, I want to receive unsolicited bids from AI clubs for my own players, so that the
    transfer market feels alive even when I'm not actively selling.
31. As a manager, I want AI clubs to negotiate my bids for their players using the same accept/
    reject/counter rules I'm bound by, so that the market feels fair and consistent.
32. As a manager, I want to offer a Contract of 1–5 years when signing a player, so that I can control
    how long I commit budget to them.
33. As a manager, I want a player's wage to be computed automatically from their ability and age, so
    that I don't have to negotiate wages by hand.
34. As a manager, I want players whose contracts expire to become Free Agents I can sign for no
    transfer fee, so that I have a low-cost way to strengthen my squad.
35. As a manager, I want AI clubs to identify and fill their own squad gaps in the transfer market
    without my involvement, so that opposing squads evolve realistically across a career.
36. As a manager, I want AI clubs to pick a sensible tactic for their squad at the start of each
    season, so that AI opponents aren't randomly or nonsensically set up.
37. As a manager, I want a league-position Board Objective set for my club at the start of each
    season, so that I know what success looks like this year.
38. As a manager, I want to see whether I Exceeded, Met, or Missed my Board Objective at season end,
    so that I get clear feedback on my season's performance.
39. As a manager, I want a warning after missing my Board Objective once, so that I understand my job
    is at risk before it's actually lost.
40. As a manager, I want to be sacked after missing my Board Objective two seasons in a row, so that
    there are real stakes to sustained underperformance.
41. As a manager, I want a sacked career to remain viewable as a read-only archive, so that I can look
    back on how it ended without being able to keep playing it.
42. As a manager, I want to continue playing indefinitely if I'm never sacked, so that there's no
    arbitrary end to a successful career.
43. As a manager, I want to have multiple saves and choose which one to continue, so that I can run
    more than one career or start over without losing a prior one.
44. As a manager, I want my progress saved reliably to a local file, so that I don't lose a career to
    a crash or an accidental quit.
45. As a developer integrating the renderer, I want every player-invokable action exposed as its own
    typed RPC method, so that I get compile-time safety and don't have to hand-parse a generic
    command envelope.
46. As a developer testing the game engine, I want the core simulation and decision logic to run as
    pure functions with no Electron or SQLite dependency, so that I can write fast, deterministic
    unit tests against it.

## Implementation Decisions

**Monorepo & toolchain**
- pnpm monorepo mirroring pingdotgg/t3code 1:1: `apps/desktop` (Electron main + renderer),
  `packages/contracts` (Effect RPC schema + event/command types), `packages/game-engine` (pure
  decider + projector + match-sim, DB-agnostic, unit-testable without Electron), `packages/shared`
  (game-design constants: Position Weights, Role Weights, Team Instruction multiplier tables,
  Commentary Templates, Stature Tier tables). No separate server app — the Electron main process is
  the server.
- Toolchain: `vite-plus` (`vp`), `electron-builder`, React, Tailwind v4.
- Effect ecosystem pinned to `rc`/`next` tags together: `effect@rc`, `@effect/platform-node`,
  `@effect/sql-sqlite-node`, `@effect/rpc`, `@effect/vitest`. No mixing v3-targeted satellite
  packages with a v4 core.
- Persistence: one SQLite file per save/career under Electron's `userData` dir, accessed directly via
  `@effect/sql-sqlite-node` with no ORM; multiple saves listed at a "continue career" screen, one
  loaded at a time.
- Renderer-to-main transport is exclusively an `@effect/rpc` `RpcGroup` contract over Electron IPC
  (`contextBridge`) — no websocket, no remote client, ever.
- World is fully fictional: invented league, clubs, generated players — no real-world names/badges.
  Real-world data packs are an explicitly out-of-scope future concern.

**Player attributes & derived values**
- 19 Attributes (1–20 scale) in four Categories: Technical (Passing, Shooting, Tackling, Dribbling,
  Heading, Crossing, Finishing, First Touch), Mental (Positioning, Decisions, Composure,
  Determination, Teamwork, Flair), Physical (Pace, Acceleration, Stamina, Strength, Agility),
  Goalkeeping (Handling, Reflexes, Aerial Reach, Command of Area, Kicking — NULL for outfield
  players).
- 10 fixed Positions: GK, DC, DL, DR, DM, MC, ML, MR, AMC, ST. A player holds one or more playable
  Positions, each with a Familiarity Tier (Natural / Competent / Unfamiliar), stored in a
  variable-length `player_positions` table.
- Potential Ability: hidden 1–100 scalar, never shown in UI. Attributes grow toward its
  age-appropriate ceiling ages 16–23, plateau 24–29, Physical attributes decline 1–2 points/season
  from 30+. Applied by the projector on season-advance events.
- Position Rating (1–100): weighted average of Attributes against a Position's `position_weights`
  (code-defined constant in `packages/shared`, not a SQL table), computed on read, never stored.
  Overall Rating = a player's Position Rating at their strongest Natural-tier Position; not a
  separately stored concept.
- Transfer Value: derived (not stored) integer Credits amount from Overall Rating (exponential base
  curve) × age modifier × Potential-Ability-gap premium.
- Player generation: draw Potential Ability from a right-skewed distribution, derive an
  age-appropriate effective ceiling, generate Attributes around that ceiling with
  `position_weights`-driven skew + noise.
- SQLite schema: a wide `players` table (all Attributes as columns, no EAV) plus `player_positions`
  keyed on `(player_id, position)`. See ADR-0001 for full DDL and rationale.

**Match engine**
- Resolution loop: one Minute-Slice per simulated minute across 90, plus a Stoppage Slice per half
  (1–5 minutes, length biased upward by that half's count of stoppage-causing events).
- Team strength: three Phase Strengths per team (Attack, Midfield, Defense), each a weighted average
  of Position Ratings for players occupying that phase's Positions (Defense: GK/DC/DL/DR; Midfield:
  DM/MC/ML/MR; Attack: AMC/ST), computed pre-tactics. Per Minute-Slice: Midfield battle decides
  possession winner; winner's Attack rolls against loser's Defense to decide whether a notable event
  fires.
- Tactics interface: tactics resolve into a flat `TacticalModifiers` struct (attack/midfield/
  defense/tempo/pressing-aggression multipliers + event-odds biases, the last fixed at 0 for v1)
  applied to Phase Strength. The match engine has zero knowledge of formations, roles, or
  instructions — only this struct.
- Home advantage: flat ~+5–10% multiplier on all three home-team Phase Strengths, applied before
  Tactical Modifiers.
- Fatigue: from minute ~60, Midfield and Defense Phase Strength decay a few percent per 15 minutes,
  scaled inversely by squad-average Stamina; resets every match, no persistent cross-match fitness
  state in v1.
- Mid-match commands: `ChangeTactics` and `MakeSubstitution`. Subs: 5 total per team across a maximum
  of 3 windows (halftime doesn't count as a window). No extra time/penalties in v1.
- Match Event vocabulary: `MatchStarted` (carries RNG seed), `Goal`, `ShotOnTarget`, `ShotMissed`,
  `BigChance`, `YellowCard`, `RedCard`, `Injury` (match-scoped only, forces an immediate sub, no
  persistent effect), `Substitution`, `HalfTimeReached`, `FullTimeWhistle`.
- Determinism: fully deterministic from a single seed recorded on `MatchStarted`; a splittable PRNG
  makes the event timeline exactly reproducible from event history alone.

**Tactics**
- 5 fixed v1 Formations: 4-4-2, 4-3-3, 4-5-1, 3-5-2, 5-3-2 — each a fixed multiset of 10 outfield
  Position slots plus implicit GK. Purely structural, no formation-level multiplier.
- 8 v1 Roles (one per Position): Goalkeeper, Ball-Playing Defender (DC), Wing-Back (DL/DR), Anchorman
  (DM), Playmaker (MC), Winger (ML/MR), Attacking Midfielder (AMC), Poacher (ST). Chosen per
  formation-slot at tactic-set time, not a saved player property. Each has a Role Weights profile
  (parallel to Position Weight); Role Rating (parallel to Position Rating) derived from it.
- Role Rating is computed at tactic-resolution time in `packages/game-engine`, before the match
  engine runs. The Role Rating vs. Position Rating delta feeds `TacticalModifiers` as a small
  additive bump (±0.05 cap) — never replaces Position Rating in Phase Strength.
- 3 Team Instruction sliders, each 3-state: Mentality (defensive/balanced/attacking), Tempo
  (slow/normal/fast), Pressing (low/medium/high, also scales Fatigue decay rate). Fixed multiplier
  table as tunable `packages/shared` constants.
- Tactic (persisted shape, `ChangeTactics` payload): `{ formation, slots: { position, role,
  playerId }[11], mentality, tempo, pressing }`. No separate `TacticSelected` event.

**Season & calendar**
- 20 clubs, fixed membership, no promotion/relegation. Double round-robin: 38 fixtures/club/season.
  No cup competition in v1.
- Calendar advances by jump-to-next-fixture: the atomic unit of advance is a Matchday's fixtures or a
  Transfer Window open/close — never a day-by-day clock.
- Two Transfer Windows per season: pre-season (open until Matchday 1) and mid-season (opens after
  Matchday 19, closes when Matchday 20 is due). Transfer commands illegal outside an open window. No
  deadline-day mechanic.
- Each season's fixture list is freshly shuffled among the same 20 clubs, no seeding by prior
  standings.
- League Table tie-break: points → goal difference → goals scored. No head-to-head.

**Transfers, contracts & AI clubs**
- Currency: Credits, a single fictional unit.
- Contracts: 1–5 years, set identically at signing or renewal; wage is pure formula output (Overall
  Rating, age, Potential-Ability-gap), no negotiation UI. On expiry (season start), player becomes a
  Free Agent, signable for Credits 0 via the normal signing flow. Renewal reuses the signing flow
  against the player's current club during an open window.
- Budgets: Transfer Budget (per-season Credits pool, spend-down, no replenishment between windows)
  and Wage Budget (running cap on active Contracts' wages), both derived from a fixed per-club
  Stature Tier at season start — not board-set.
- Listing/bidding: any player can receive a Bid during an open window regardless of Listed status
  (cosmetic flag only). A Bid is single-round: selling club accepts, rejects, or makes exactly one
  counter-offer, which the bidder then accepts or withdraws from.
- AI-club buying: at each window's open, checks each Position for a squad gap (best Position Rating
  below a fixed threshold vs. league average for that slot); targets the highest-Transfer-Value
  affordable player and bids Transfer Value exactly; accepts a counter up to 1.15x Transfer Value if
  still affordable, otherwise withdraws; one target per weak slot per window.
- AI-club selling: accepts any bid ≥1.0x Transfer Value outright; counters bids between 0.85x–1.0x up
  to exactly Transfer Value; rejects below 0.85x. No squad-need veto in v1.
- AI-club tactics: one fixed Tactic per season — formation chosen by best-fit against squad Position
  Ratings, roles defaulted to each slot's designated v1 Role, instructions fixed at
  balanced/normal/medium. Never changes mid-season or reacts to opponent/in-match state.

**Board objectives**
- Board Objective: a League-position band per club per season, derived from Stature Tier via a fixed
  `packages/shared` tier→band table; a sibling of Transfer/Wage Budget, not a driver or consequence
  of it. Stature Tier is permanently fixed for v1. Only the player's club receives an objective and
  is judged.
- `SeasonConcluded` fires off the final Matchday, then `BoardObjectiveJudged` (player's club only)
  compares final position to the band and records a Verdict: `Exceeded` / `Met` / `Missed`.
- Consecutive-Miss Counter increments on `Missed`, resets on `Exceeded`/`Met`. 0→1 fires
  `ManagerWarned` (no mechanical effect). 1→2 fires `ManagerSacked`: archives the save (read-only, no
  further commands), returns the player to the "continue career" list, no re-hire flow. Exceeding is
  flavor-only, does not escalate next season's band.
- No explicit win state — careers are open-ended; `ManagerSacked` is the only career-ending event.

**Match commentary**
- Pure templated strings: a fixed Commentary Template pool per Match Event type, one picked at random
  per firing. No composition/generation engine.
- Player/team names and (for Goal/HalfTimeReached/FullTimeWhistle only) the running scoreline are
  baked into the line from the event payload; minute is rendered separately by the UI, not baked into
  template text.
- A Commentary Line fires only alongside an actual Match Event (including the three boundary events);
  quiet Minute-Slices produce nothing.
- Per match, per event type, the last-used Commentary Template index is excluded from the next random
  pick for that event type, to avoid back-to-back repeats.
- Templates live in `packages/shared` alongside Position/Role Weights.

**Technical contract (RPC & event sourcing)**
- Three domain-bounded Deciders: **Club Decider** (one stream per club, ×20/save — Contracts,
  Transfer Budget, Wage Budget, Board Objective, Consecutive-Miss Counter), **Match Decider** (one
  stream per Fixture — `MatchStarted`..`FullTimeWhistle` plus mid-match `ChangeTactics`/
  `MakeSubstitution`), **Season/Calendar Decider** (one stream per save — Matchday counter, fixture
  generation, Transfer Window open/close). League Table is a projection, not a Decider.
- RpcGroup gives every player-invokable Command/query its own typed method (e.g. `bidForPlayer`,
  `getSquad`), no generic envelope. `AdvanceCalendar` is the sole player-invoked time-advancing
  command; crossing a Matchday resolves the other 9 fixtures synchronously via an internal-only
  `SimulateAiFixture` command in the same request. AI clubs' transfer and tactics activity reuses
  human-facing Commands, self-issued internally, never through RPC.
- Live match resolution is chunked resimulation: `ResumeSimulation` simulates from the current point
  to the next interaction opportunity (or full-time) in one response, deterministic from the
  `MatchStarted` seed; the renderer paces reveal client-side. No RPC streaming transport anywhere in
  v1.
- Cross-Decider reactions (`SeasonConcluded` → `BoardObjectiveJudged`/`ManagerWarned`/
  `ManagerSacked` across 20 Club streams) run as an in-process synchronous reactor, no outbox.
  `CompleteTransfer` spans two Club streams in one SQL transaction — safe under single-file SQLite
  (single writer).
- Read model: persisted, projector-maintained tables the RpcGroup's queries serve (`squad_view`,
  `league_table`, `transfer_inbox`, `match_day_timeline`, `season_summary`). Derived values fixed as
  computed-on-read (Position Rating, Overall Rating, Transfer Value) are computed at query time from
  stored primitives, never persisted a second time.

## Testing Decisions

- Good tests here exercise external behavior at the Decider boundary — command in, events out, and
  (where relevant) projected read-model state — not internal helper functions or SQL statements
  directly.
- The single highest-value seam is `packages/game-engine`: it is pure and DB-agnostic by design (per
  the map's locked architecture), so the Club Decider, Match Decider, Season/Calendar Decider,
  match-sim resolution loop, tactic/Role-Rating resolution, and AI-club buy/sell/tactic logic should
  all be unit-testable via `@effect/vitest` with no Electron process, no real SQLite file, and no IPC
  — command/event fixtures in, event/state assertions out. This is the dominant seam; prefer it over
  any other test entry point.
- Determinism is directly testable: given a fixed seed on `MatchStarted`, replaying the same commands
  against the Match Decider must reproduce an identical event timeline — a strong regression net for
  the match-sim algorithm.
- `packages/contracts` should have schema-level tests (encode/decode round-trips, error-channel
  shapes) rather than full IPC round-trip tests — the IPC transport itself is t3code boilerplate, not
  bespoke logic worth testing here.
- Full Electron app / renderer-to-main IPC integration tests are out of scope for unit-level
  coverage; if end-to-end coverage is wanted later, it should drive through the RpcGroup client
  against a real `apps/desktop` main process, not simulate IPC.
- Read-model projector tests (event stream in, `squad_view`/`league_table`/etc. row assertions out)
  belong alongside the Decider tests in `packages/game-engine`, since projection is part of the same
  pure, DB-agnostic package.

## Out of Scope

- Training.
- Scouting (full-information attributes are the direct consequence).
- Media / press conferences.
- Multi-league structure, promotion/relegation.
- Visual (2D pitch) match engine — text-commentary only is the v1 fidelity target.
- Real-world clubs/players/leagues, and any remote/multi-client access — ruled out permanently, not
  deferred.
- Cup competitions.
- Wage negotiation UI (wages are formula-only).
- Deadline-day transfer mechanics.
- Persistent, cross-match fitness/injury-proneness system (season-long recovery timelines and
  injury-proneness attributes beyond in-match, match-scoped Injury events).
- Stature Tier mobility (a club moving tiers after sustained over/under-performance).
- AI difficulty/skill tiers for opponent clubs.
- Match engine event-odds mechanics (the `TacticalModifiers` event-odds-biases field exists but is
  fixed at 0 in v1 — unspecified, deferred).
- Per-screen UI layout/interaction detail for the six locked v1 screens (Club/Squad, Tactics, League
  table & fixtures, Match day, Transfer market/inbox, Season summary) — each is ready to graduate
  into its own prototype ticket, but layout itself is fog, not decided by this spec.

## Further Notes

- This spec synthesizes eight resolved grilling tickets (`.scratch/cm-clone/issues/01`–`08`) and
  their corresponding ADRs (`docs/adr/0001`–`0008`); it introduces no new decisions beyond what those
  tickets already locked. Canonical vocabulary lives in [CONTEXT.md](../../CONTEXT.md).
- The map ([map.md](map.md)) is the durable source of architecture-level decisions "not up
  for re-litigation on this map" (monorepo layout, Effect version pinning, event-sourcing approach,
  IPC-only transport, fully fictional world). Implementation tickets built from this spec should
  treat those as fixed constraints, not open questions.
- Every "Not yet specified" item from the map is carried into this spec's Out of Scope section
  verbatim in substance — none of them block v1 implementation, but none should be silently designed
  around either; they should surface as their own follow-up tickets when picked up.
