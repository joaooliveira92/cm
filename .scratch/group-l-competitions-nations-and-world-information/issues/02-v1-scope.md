# 02: v1 scope for Group L — which screens to build, given the data gap

## Question

All 18 screens in Group L (161–180) are absent or WIP stubs with **no data layer backing them**.
The codebase has no competition tables, results, statistics, stages, draws, awards, history, records,
world rankings, or nation football data models. Even the screens that partially exist (routes +
`<h1>` stubs) need full data-layer work in `packages/shared`, `packages/contracts`, and possibly
`packages/game-engine`.

Given this starting point and the v1 scope of the project, which screens should be:

1. **In v1** — build data models + screens
2. **Deferred** — route exists but no data model; spec recorded for later
3. **Out of scope** — not building for this project

The national team screens (176–178) and world-ranking screens (179–180) are particularly expensive
— they need new domain concepts that don't exist.

**Type:** grilling

**Blocked by:** [01 — Screen inventory](01-screen-inventory.md)

## Answer

### In v1 (implement now)

- **162 Competition Table** — League Table already exists with full standings, points, and fixtures
  data. Extend `LeagueTableScreen` or build `CompetitionTableScreen` as a wrapper. The data layer
  exists (`getLeagueTable` RPC), this is the lowest-cost screen.
- **163 Competition Fixtures** — Fixture lists exist with real data. WIP `CompetitionFixturesScreen`
  route exists. Data model needs wiring.
- **164 Competition Results** — Same fixture/match data, different presentation. Route exists.
  Combine with 163 as one "Competition Matches" screen or build separately.
- **161 Competition Overview** — A hub/header screen aggregating the above. Useful as a navigation
  entry point. Commonly the competition page's root.

### Deferred (route exists, data needed later)

- **165 Competition Statistics** — aggregate stats need new data models and computation. Not needed
  for v1 league simulation to be playable.
- **166 Competition Player Statistics** — needs per-player stat aggregation across a competition.
  Heavy data work.
- **167 Competition Team Statistics** — team-level stats aggregation. Medium effort.
- **168 Competition Rules** — static info screen with competition rules data. Needs rule data model.
- **169 Competition Stages & Qualification** — only relevant if multi-stage competitions exist
  beyond single round-robin + cup.
- **170 Competition Draw** — only relevant for cup competitions needing draw mechanics.
- **171 Competition Awards** — no awards system exists.
- **172 Competition History** — no history persistence or aggregation.
- **173 Competition Records** — no records tracking.
- **174 Nation Overview** — nation info screen, needs nation data. Partially overlaps with
  active-leagues-setup data.
- **175 Nation Competitions** — lists competitions within a nation. Data exists partially.

### Out of scope for v1

- **176 National Team Overview** — national teams are not v1. No national team manager careers,
  international match calendar, or squad system.
- **177 National Team Squad** — same national-team dependency.
- **178 International Fixtures and Results** — same national-team dependency.
- **179 World Rankings** — needs ranking formula and global aggregation. Not needed for single-league
  local play.
- **180 World Football Overview** — a landing/hub screen for the global game. No purpose without the
  world-level features it aggregates.

**Priority order for v1:** 162 → 163/164 → 161 → (deferred screens as time allows).

**Status:** resolved