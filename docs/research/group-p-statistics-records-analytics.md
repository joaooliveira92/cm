# Group P: Statistics, Records, Analytics — Screen Inventory & Data Facts

## Question

What match statistics does the engine produce, what accumulated season statistics exist, what
analytics/charting code is in the renderer, what statistics screens already ship, and what are
the "four statistics" the engine does **not** produce?

## Sources

- `packages/game-engine/src/match/events.ts` — Match Event types (v1 vocabulary)
- `packages/game-engine/src/match/simulate/resolvers.ts` — event resolution (Goal/BigChance/ShotOnTarget/ShotMissed shares)
- `packages/game-engine/src/match/simulate/loop.ts` — simulation loop, `SimulateMatchInput`
- `packages/game-engine/src/match/simulate/teamState.ts` — per-team runtime state
- `packages/game-engine/src/match/simulate/constants.ts` — tuning constants (GOAL_SHARE, BIG_CHANCE_SHARE, etc.)
- `packages/contracts/src/schemas/match.ts` — `MatchStatisticsView`, `MatchStatisticKey`, `MatchReportView`
- `packages/contracts/src/schemas/season.ts` — `SeasonSummaryView`
- `apps/desktop/src/main/match/statistics.ts` — `aggregateMatchStatistics`, `matchStatisticsView`, `getMatchStatistics`
- `apps/desktop/src/renderer/matchStats/MatchStatsScreen.tsx` — Match Statistics screen
- `apps/desktop/src/renderer/match/MatchStatsView.tsx` — shared component rendering the stats table
- `apps/desktop/src/renderer/match/PostMatchSummary.tsx` — Post-Match Summary screen (links to stats)
- `apps/desktop/src/renderer/matchReport/MatchReportScreen.tsx` — Match Report (includes `MatchStatsView`)
- `apps/desktop/src/renderer/seasonSummary/SeasonSummaryScreen.tsx` — Season Summary screen
- `apps/desktop/src/renderer/navigation/destinations.ts` — all existing route destinations
- `apps/desktop/src/renderer/router/index.tsx` — route definitions
- `apps/desktop/test/main/match/statistics.test.ts` — test for `aggregateMatchStatistics`
- `.scratch/group-g-match-day/issues/09-match-statistics-component.md` — confirms "four statistics the model does not simulate"
- `.scratch/group-g-match-day/decision-request-02-unsimulated-match-statistics.md` — decision that possession, corners, fouls, offsides stay unavailable
- `.scratch/group-p-statistics-records-and-analytics/issues/01-screen-inventory.md` — inventory ticket for Group P (screens 222-235)

All source files verified by direct read.

## Findings

### 1. Match statistics the engine produces (per-match)

The engine produces a flat timeline of `MatchEvent` tagged unions (`packages/game-engine/src/match/events.ts`):

```typescript
export type MatchEvent =
  | MatchStartedEvent
  | GoalEvent
  | ShotOnTargetEvent
  | ShotMissedEvent
  | BigChanceEvent
  | YellowCardEvent
  | RedCardEvent
  | InjuryEvent
  | SubstitutionEvent
  | HalfTimeReachedEvent
  | FullTimeWhistleEvent;
```

**Each `MatchEvent` carries:**
- `minute: number` (always)
- `half: MatchHalf` (1 or 2) — for events that happen during play (TeamPlayerEvent subtypes)
- `teamClubId: ClubId` — which team
- `playerId: PlayerId` — which player
- Event-specific fields:
  - `GoalEvent`: `homeScore`, `awayScore` (running score)
  - `InjuryEvent`: `trigger` ("contact" | "non-contact"), `severity` ("light" | "medium" | "severe"), `tier` ("orange" | "red"), `type` (body part)
  - `SubstitutionEvent`: `outPlayerId`, `inPlayerId`, `forcedByInjury`
  - `HalfTimeReachedEvent` / `FullTimeWhistleEvent`: `homeScore`, `awayScore`

**The `MatchStatisticKey` vocabulary** (`packages/contracts/src/schemas/match.ts` lines 233-243) defines exactly **9** statistics the model can produce:

1. `goals` — Goals scored
2. `attempts` — Goals + shots on target + shots off target + big chances
3. `shotsOnTarget` — Goals + shots saved (Goal + ShotOnTarget events)
4. `shotsOffTarget` — Shots that missed (ShotMissed events)
5. `bigChances` — Clear chances not converted into a recorded shot (BigChance events)
6. `yellowCards` — Yellow cards shown
7. `redCards` — Red cards shown
8. `injuries` — Players injured
9. `substitutions` — Substitutions made

**Aggregation logic** (`apps/desktop/src/main/match/statistics.ts` lines 46-70):

| MatchEvent | Counts toward |
|---|---|
| `Goal` | goals, attempts, shotsOnTarget |
| `ShotOnTarget` | attempts, shotsOnTarget |
| `ShotMissed` | attempts, shotsOffTarget |
| `BigChance` | attempts, bigChances |
| `YellowCard` | yellowCards |
| `RedCard` | redCards |
| `Injury` | injuries |
| `Substitution` | substitutions (via `countedSubstitutions`) |

Possession is **not** derived or computed despite `homePossessionProbability` existing in the loop — it's a pure per-minute probability used to decide which side attacks, never accumulated into a post-match statistic. The engine does not model corners, fouls, or offsides at all.

### 2. Accumulated season statistics

**No aggregated season or competition statistics table exists in the schema.**

The schema at `apps/desktop/src/main/db/schema.ts` has:
- `fixtures` table: per-fixture `homeGoals`, `awayGoals`, `homePenalties`, `awayPenalties`, `played` flag — no per-fixture statistics are persisted beyond the scoreline.
- `competitionParticipants` table: `finalPosition`, `points`, `goalDifference`, `goalsFor` — frozen at season end for the league table.
- `events` table: the append-only event log. Match streams store the raw event timeline (not aggregated per-match totals).
- No `season_statistics`, `competition_statistics`, `season_summary`, `player_statistics` or similar tables.

**What does exist:**

- **`SeasonSummaryView`** (`packages/contracts/src/schemas/season.ts` line 189): A read model projected on every request (not persisted), containing:
  - `season` (SeasonView — number, date, phase)
  - `standings` (league table rows — played, won, drawn, lost, goalsFor, goalsAgainst, goalDifference, points)
  - `clubId`, `clubName`, `finalPosition`
  - `boardObjective` (minPosition, maxPosition, finalPosition, verdict)
  - `managerOutcome`, `consecutiveMisses`, `archivedCause`

  This is the **Season Summary** screen (Screen 105 in navigation), which is about board objective and league position — not about accumulated match statistics.

- **`LeagueTableRow`**: The league table screen shows P, W, D, L, GF, GA, GD, Pts per club. These are computed from resolved fixtures (not from a separate statistics table).

- **No per-player season statistics** exist anywhere — no goals scored, assists, appearances, average ratings, etc.

### 3. Analytics/visualization code

**No charting libraries are installed.** None of recharts, d3, chart.js, victory, nivo, visx, echarts, or plotly appear in any `package.json`.

**No chart, graph, or visualization components exist.** The only "visualization" is:
- `MatchStatsView.tsx` — an accessible HTML table with numeric home/away rows
- `LeagueTableScreen.tsx` — an HTML table
- All statistics are rendered as text and tabular-nums in HTML `<table>` elements or plain `<p>`/`<span>` text

There is no SVG-based chart, no bar chart, no radar/spider chart, no trend line, no gauge (besides `WorkloadGauge.tsx` in training, which is for training load, not statistics).

### 4. Existing statistics surfaces

**Screens that ship and show statistics:**

| Screen | Route | What it shows |
|---|---|---|
| Match Statistics | `/career/$saveId/match-stats` | Team totals table: 9 statistics (goals through substitutions) + 4 named as unavailable |
| Match Report | `/career/$saveId/match-report/$matchId` | Full timeline + the same `MatchStatsView` component |
| Post-Match Summary (on Match Day) | part of `/career/$saveId/match` | Score, goalscorers, cards/injuries, links to Statistics/Report/Ratings |
| League Table | `/career/$saveId/league` | P/W/D/L/GF/GA/GD/Pts per club (standings from fixtures) |
| Competition Table | `/career/$saveId/competition/$competitionId/table` | Same league table per competition |
| Competition Results | `/career/$saveId/competition/$competitionId/results` | Played fixtures newest first |
| Season Summary | `/career/$saveId/season-summary` | Final position, board objective verdict, manager outcome |
| Fixtures | `/career/$saveId/fixtures` | Own club's fixture list |
| Competition Fixtures | `/career/$saveId/competition/$competitionId/fixtures` | Competition fixture calendar |
| Club Fixtures | `/career/$saveId/club/$clubId/fixtures` | One club's fixtures across all competitions |

**WIP/placeholder screens in the stats group:**
- Match Ratings: `/career/$saveId/match-ratings` — stub screen with "WIP — Placeholder screen"

**Screens that do NOT exist (Group P, screens 222-235 according to inventory ticket):**
No screens for: Player Statistics, Career Records, Competition Records, Club Records, Season Statistics, Analytics/Charts, Awards, History, Head-to-Head — all absent.

### 5. The four statistics the engine does NOT produce

This is settled by `decision-request-02-unsimulated-match-statistics.md`:

1. **Possession** — The loop has a per-minute `homePossessionProbability` but it's never accumulated. Adding a possession model would require changing what a seed produces.
2. **Corners** — No set-piece events exist in the model.
3. **Fouls** — No foul event exists; cards are rolled as a penalty mechanic, not a foul count.
4. **Offsides** — No offside event or flag exists.

The decision (2026-09-19, confirmed as Option A): **These four are named as unavailable** rather than estimated, derived, or blank. The `MatchStatsView` component renders them below the table:

```
"Not tracked by the match model: Possession, Corners, Fouls, Offsides."
```

The `UnavailableMatchStatistic` schema (`packages/contracts/src/schemas/match.ts` line 248) encodes this permanently:
```typescript
export const UnavailableMatchStatistic = Schema.Literals(["possession", "corners", "fouls", "offsides"]);
```

## Recommendations

- **Implementator may rely on**: `MatchStatisticsView` has exactly 9 countable statistics + 4 unavailable statistics. The `aggregateMatchStatistics` function in `main/match/statistics.ts` is the pure fold to reuse for any new statistics projection.
- **Implementator may rely on**: No accumulated season/competition/player statistics tables exist. Any aggregate beyond a single match must be computed from the fixtures + events tables on each read, or a new aggregation table must be introduced.
- **Implementator may rely on**: The Match Ratings screen is a blank stub. The Post-Match Summary links to it but there is no data model for player ratings yet.
- **Design choice (not a finding)**: Whether to add season-wide statistics tables (player goals, assists, appearances, etc.) or compute them on read from the match event streams is a design decision Group P must make.
- **Design choice (not a finding)**: Whether to add charting libraries for visual analytics is a design decision — no charting infra exists today.

## Gaps

- **No per-player match statistics model exists.** The engine assigns events to `playerId` but no system aggregates a player's goals, cards, or minutes across multiple matches. The `MatchRatings` screen's data model is entirely unbuilt — not even a stub schema.
- **No head-to-head or past-meetings data model.** The pre-match tab mentions them in `career.tsx`'s matchTabMap ("past-meetings") but no data or screen exists.
- **No "awards" or "records" model.** Group P screens 222-235 are annotated as `deferred` for want of a model in the competition overview screen's docstring.
- **No possession accumulation despite the loop computing `homePossessionProbability`.** The probability exists only as a per-minute steering variable; aggregating it into a match statistic would be a new feature, not an existing one — and would require reconciliation with the decision not to fabricate unsimulated values.