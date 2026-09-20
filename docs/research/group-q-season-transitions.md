# Research: Group Q — Awards, Honours, Season Transitions (Screens 236–249)

## Question

What is the current state of the season lifecycle, promotion/relegation, board judgment, and awards
infrastructure, so the implementator knows which screens are grounded and which are deferred.

---

## Sources

- Primary: source code at `/Users/joao/dev/audit/apps/desktop/src/main/season/` (advance, rollover,
  start, resolveThrough, boardVerdict, standigs, queries, currentSeason, fixtureGeneration)
- Primary: `apps/desktop/src/main/db/schema.ts` (all Drizzle table definitions)
- Primary: `packages/contracts/src/schemas/season.ts` (view/event schemas)
- Primary: `packages/shared/src/rules/board.ts` (board objective bands, verdict logic)
- Primary: `packages/shared/src/news/newsCopy.ts` (event → message copy table)
- Primary: `packages/shared/src/setup/leagueSetup.ts` (ExchangeLink type)
- Primary: `packages/shared/src/content/leagueSetupCatalogue.ts` (EXCHANGE_LINKS data)
- Primary: `packages/shared/src/setup/continueReadiness.ts` (Continue blockers)
- Primary: `packages/shared/src/setup/continueOutcome.ts` (Continue outcome descriptions)

---

## Findings

### 1. season_summary

**There is no `season_summary` DB table.** The `season_summary` concept is a **read-model query**,
not a table. It is exposed as an RPC method `getSeasonSummary`, produced by the query in
`apps/desktop/src/main/season/queries.ts` (line 370).

**Schema view** (contracts):

```typescript
// packages/contracts/src/schemas/season.ts, line 189
export class SeasonSummaryView extends Schema.Class<SeasonSummaryView>("SeasonSummaryView")({
  season: SeasonView,
  standigs: Schema.Array(LeagueTableRow),
  clubId: ClubId,
  clubName: Schema.String,
  finalPosition: Schema.NullOr(Schema.Finite),       // null until SeasonConcluded
  boardObjective: Schema.NullOr(BoardObjectiveView),  // null before first verdict
  managerOutcome: ManagerOutcomeSchema,                // "none" | "warned" | "sacked"
  consecutiveMisses: Schema.Finite,
  archivedCause: Schema.NullOr(ArchivedCauseSchema),   // null while career is live
})
```

**What it returns (queries.ts, line 370-423):** The most recently judged season's summary. It reads:

- `season`: the current season row (`season` table, highest `season_number`)
- `standings`: frozen standings from `competition_participants` (if the season concluded) or computed
  from live fixtures (if running)
- `board_objective` row: sorted `verdict IS NULL ASC, season_number DESC LIMIT 1` — so if the
  latest season was never judged (still running), it falls back to the season whose verdict was
  actually issued
- `managerStatus`: `lastOutcome`, `consecutiveMisses`, `archivedCause` from the single-row
  `manager_status` table

The summary is **per-save** (shows the human's club), not per-season in a browseable history.
There is one summary produced per season, but only the latest judged one is queryable — earlier
seasons' `board_objective` rows survive but `getSeasonSummary` only returns the latest.

### 2. Season Concluded Event

**No explicit `SeasonConcluded` schema class exists** — it is an untyped event pushed to the event
stream as a `{ tag, payload }` tuple.

**Definition** (all call sites):

```typescript
{ tag: "SeasonConcluded", payload: { seasonNumber: number } }
```

**Where fired:**
- `apps/desktop/src/main/season/resolveThrough.ts`, line 72: fired inside `stepCalendarTo` when
  no unplayed fixture remains anywhere in the world AND no cup round is outstanding
- `apps/desktop/src/main/season/advance.ts`, line 340: `conclusion` returned from `stepCalendarTo`
  includes `seasonConcluded: boolean`

**Payload fields:** `{ seasonNumber: number }` — just the season number.

**News copy** (newsCopy.ts line 225-231):
- Category: `"season"`, priority: `"normal"`
- Subject: `"Season {seasonNumber} is over"`
- Body: `"The final table is settled and the board's review follows. Player development for the season has been applied."`

### 3. Board Objective Judged Event

Also an **untyped event** pushed to the event stream.

**Definition**:

```typescript
// fired at apps/desktop/src/main/season/boardVerdict.ts, line 51
{ tag: "BoardObjectiveJudged", payload: {
  seasonNumber: number,
  clubId: ClubId,
  competitionId: string,
  finalPosition: number,
  band: { minPosition: number, maxPosition: number },
  verdict: Verdict,  // "exceeded" | "met" | "missed"
}}
```

**Where fired:** Inside `judgeSeasonEnd` (boardVerdict.ts, line 22-82), which runs as an
in-process synchronous reactor to `SeasonConcluded` (same transaction, same request — ADR-0007).

**Logic:** Compares the human club's frozen `final_position` against the board's band
(`minPosition`–`maxPosition`). Uses the pure function `judgeBoardObjective` from
`packages/shared/src/rules/board.ts`:
- `finalPosition < minPosition` → `"exceeded"`
- `finalPosition > maxPosition` → `"missed"`
- otherwise → `"met"`

**News copy** (newsCopy.ts line 256-260):
- Category: `"board"`, priority: `"missed" → "high"`, otherwise `"normal"`
- Subject: `"Board verdict on season {seasonNumber}"`
- Body: `"A finish of {finalPosition}th against the board's target of {minPosition}-{maxPosition}. The board's verdict is "{verdict}"."`

### 4. Season Rollover (advance.ts + rollover.ts + resolveThrough.ts)

**Entry point:** `advanceCalendar(savesDir, saveId)` at `apps/desktop/src/main/season/advance.ts`,
line 176.

**One transaction — yes.** `advanceCalendar` wraps `runAdvance` in
`sql.withTransaction(runAdvance(saveId))` (advance.ts line 186). Every write — bid expiry, fixture
resolution, standings freeze, season-concluded events, board judgment, player development, contract
expiry, rollover, next-season creation — commits together or not at all.

**Resumable — partially.** The advance is guarded by a per-Save lock (`advanceLock.ts`). A second
concurrent advance returns `AdvanceInProgressError` (not queued). The advance itself is **not**
inherently resumable mid-stream — if the process crashes mid-transaction, SQLite rolls back the
entire transaction and the career state is unchanged. But the calendar state machine is designed so
that re-executing advance lands at the same boundary (the `awaitingFixtureId` guard at line 210
re-checks before doing work).

**What happens during rollover** (resolveThrough.ts `stepCalendarTo`, lines 51-97):

1. **Check remaining fixtures:** `SELECT COUNT(*) FROM fixtures WHERE played = 0` + check cup rounds
   outstanding. If 0 and no cup rounds pending → season is concluded.

2. **Freeze final standings** (standings.ts `freezeFinalStandings`, line 105):
   - For each competition, ranks clubs via `computeStandings` (points → GD → GF tie-break, no
     head-to-head per ADR-0004)
   - For cups, uses `cupFinishingOrder` instead
   - Writes `final_position`, `points`, `goal_difference`, `goals_for` to
     `competition_participants` rows
   - The four standings columns were NULL all season; frozen once at conclusion

3. **Append `SeasonConcluded` event** to the season stream

4. **Expire contracts** (`expireContractsForSeason`) — contracts ending this season → players go
   to Free Agency

5. **Develop players** (`developPlayersForSeason`) — every player on every club develops toward
   their age-appropriate ceiling (one `PlayerDeveloped` event per club)

6. **Judge board objective** (`judgeSeasonEnd` in boardVerdict.ts):
   - Reads the frozen `final_position`
   - Compares to band → `Verdict`
   - Updates `board_objective` row with `final_position` and `verdict`
   - Appends `BoardObjectiveJudged` event
   - Updates `manager_status.consecutive_misses` + `last_outcome`
   - If `consecutiveMisses >= 2`: appends `ManagerSacked`, sets `archived_cause = 'sacked'`,
     releases club staff — the save becomes read-only (archived)

7. **Rollover the world** (rollover.ts `rolloverToNextSeason`, line 37) — only if not sacked:
   - Reads every league's `competition_participants` for the concluded season, ordered by
     `final_position ASC`
   - Reads `competition_links` (the persisted Exchange Links)
   - For each link: takes the bottom N clubs from the higher division (where N = `slots`), takes
     the top N clubs from the lower division, builds `goingDown`/`goingUp` maps
   - Inserts new `competition_participants` rows for next season (`INSERT OR IGNORE`)
   - Reconciles squads with depth: clubs relegated to `results-only` depth lose their squads
     (`discardSquadsForClubs`); clubs promoted out of `results-only` get a generated squad at
     their current results strength
   - Prunes concluded season: deletes fixtures (and their match event streams) for competitions
     the human's club did NOT play in

8. **Start next season** (`startNextSeason` in start.ts, line 139):
   - Inserts next season row: `(season_number, pre-season date, 'pre_season')`
   - Generates league fixtures via `generateRoundRobinFixtures` (seeded, deterministic double
     round-robin: Fisher-Yates shuffle + circle method + mirrored second leg)
   - Materialises cup round 1 for the new season
   - Resets `player_fitness`: condition = 100, last_injury_severity = `'none'` for all players
   - Inserts new `board_objective` row with band from the human's Stature Tier (judges against
     the division they are now in — which after promotion/relegation is different)
   - Assigns AI tactics

**Key architecture: everything happens in one transaction.** A world is never half-promoted or
half-concluded. If sacked, the rollover does NOT run (the save is archived).

### 5. Awards Model

**Deliberately absent.** The codebase explicitly documents awards, honours, and statistics as
**deferred** — not implemented and not planned for this milestone.

Evidence:
- `apps/desktop/src/main/season/queries.ts`, lines 251-252 on `CompetitionsListView`:
  > "Carries no standings and no honours. Every screen that would source such a column — statistics,
  > records, history, awards — is `deferred`"
- `packages/contracts/src/schemas/season.ts`, lines 305-307 on `CompetitionsListView`:
  > "It carries no standings, no form and no honours, because a browse list is exactly where one
  > would look at a 'titles won' column and every one of those screens is `deferred`."

No code exists for:
- Player of the Match / Man of the Match
- Team of the Season / Team of the Year
- Manager of the Month / Manager of the Season
- Player of the Year / Player of the Season
- Golden Boot / Top Scorer
- Most Assists / Most Clean Sheets
- Any seasonal or all-time records
- Titles won / honours list for a competition or club

**No DB tables exist for any awards data.** There are no `player_statistics`, `seasonal_stats`,
`tournament_awards`, or similar tables. No event stream tag carries awards data either.

The navigation config at `apps/desktop/src/renderer/navigation/spec-nav-config.ts` (line 153) does
have an **"Awards" tab** registered for competitions:
```typescript
{ id: "awards", label: "Awards", visible: (type) => type !== undefined }
```
This tab exists in the spec navigation configuration but has no corresponding backend query — it
would display an empty/placeholder state.

### 6. Pre-season Infrastructure

**Existing, fully implemented.** The pre-season is not a separate state machine — it is the first
phase of the calendar lifecycle.

**Season phases** (`packages/contracts/src/schemas/season.ts`, line 11):
```typescript
export const SEASON_PHASES = ["pre_season", "in_season", "mid_window_open", "season_complete"] as const;
```

**Pre-season mechanics:**
- A career opens in `pre_season` (start.ts line 146: `INSERT INTO season ... phase = 'pre_season'`)
  — some weeks before the first league round
- The pre-season date derives from `seasonStartDate(referenceYear, seasonNumber)` — the date the
  season opens on, giving the human somewhere to stand before round 1
- The pre-season Transfer Window is open from the season start until the first advance that moves
  past it
- On the first advance: if `row.phase === "pre_season"`, the advance emits
  `TransferWindowClosed({ window: "pre_season" })` and runs AI transfer activity, then moves to
  `in_season` or stops at Matchday 1 (advance.ts lines 273-281)
- `isWindowOpen("pre_season")` returns `true` — transfers are legal during the pre-season window
- Budgets are set at season start, not during pre-season (budgets.ts notes there is no "next
  Season's pre-season" seam)

**What is NOT implemented:**
- Pre-season friendlies / exhibition matches — no concept exists
- Pre-season training camps — no concept exists
- Squad fitness/condition built up over pre-season — players start at 100 condition by default
- Pre-season transfer budget setting (budgets are set once at season creation from Stature Tier,
  not adjustable)
- Season expectation setting by the player — the board objective band is derived from Stature Tier
  automatically

### 7. Promotion/Relegation

**Fully implemented** in `apps/desktop/src/main/season/rollover.ts`, lines 37-117.

**Data model:**
- `competition_links` table (schema.ts line 282): one row per link, with `higher_competition_id`,
  `lower_competition_id`, `slots` (integer ≥ 1). Both endpoints always exist in this save (closed
  world — the lowest loaded division never relegates out).
- `ExchangeLink` interface (`packages/shared/src/setup/leagueSetup.ts`, line 129):
  ```typescript
  interface ExchangeLink {
    higherCompetitionId: string;
    lowerCompetitionId: string;
    slots: number;
  }
  ```

**Exchange Link data** (`packages/shared/src/content/leagueSetupCatalogue.ts`, line 438):
- England: comp_eng_1 ↔ comp_eng_2 (3 slots), comp_eng_2 ↔ comp_eng_3 (3 slots), comp_eng_3 ↔
  comp_eng_4 (3 slots)
- Spain: comp_esp_1 ↔ comp_esp_2n (1 slot), comp_esp_1 ↔ comp_esp_2s (1 slot) — parallel
  regional second tier
- Germany: comp_deu_1 ↔ comp_deu_2 (3), comp_deu_2 ↔ comp_deu_3 (3)
- France: comp_fra_1 ↔ comp_fra_2 (3)
- Portugal: comp_prt_1 ↔ comp_prt_2 (2)
- Brazil: comp_bra_1 ↔ comp_bra_2 (4)

**Promotion/relegation is symmetric** — one `slots` count determines both how many go up and how
many come down. "Three up, four down" is deliberately not expressible.

**Algorithm** (rollover.ts lines 71-113):
1. Read all `competition_links` sorted by `higher, lower`
2. For each link: take the bottom `slots` clubs from the higher division (by `final_position`),
   take the top `slots` clubs from the lower division
3. Track with `goingDown`/`goingUp` maps, handling the "already taken" offset for parallel
   regional feeds
4. For each competition: compute `leaving` set (promoted out or relegated out), compute `arriving`
   set (promoted in or relegated in), write `nextField` as
   `[stayers, ...new Set(arrivals)]`
5. `INSERT OR IGNORE INTO competition_participants` for next season

**Squad reconciliation** (rollover.ts line 172-246): clubs relegated to a `results-only` depth
lose their squads; clubs promoted out of `results-only` receive a generated squad at the strength
they were already performing at.

### 8. Competition Rollover

**League tables between seasons — frozen, then overwritten.**

- At season conclusion: `freezeFinalStandings` writes `final_position`, `points`,
  `goal_difference`, `goals_for` onto `competition_participants` rows (standings.ts line 105-131)
- For subsequent reads: `standingsForSummary` (standings.ts line 20-53) reads from frozen rows
  first, falling back to live fixture recomputation only if frozen rows don't exist
- The `played`, `won`, `drawn`, `lost` columns are NOT frozen — they are recovered from fixtures
  when those fixtures survive, and reported as zero when pruned

**What is cleared:**
- `fixtures` for competitions the human didn't play in (pruneConcludedSeason, rollover.ts line 139)
- Match event streams for those fixtures
- `player_fitness` reset: all players get `condition = 100`, `last_injury_severity = 'none'`
- Old season row stays (one row per season survives)
- `board_objective` row for the concluded season stays (its `final_position` and `verdict` were
  just set)
- `manager_status` stays (consecutive_misses persists across seasons)

**What is NOT cleared:**
- `competition_participants` rows for concluded seasons — they survive as the historical record
  (final standings)
- The `events` log is untouched (except match streams for pruned fixtures)

**Fixture generation for the new season:**
- `generateLeagueFixtures` (start.ts line 107: throws `CalendarSlotsExhaustedError` if the season
  can't hold the required rounds)
  - Calls `generateRoundRobinFixtures` — seeded double round-robin (Fisher-Yates shuffle of club
    order + circle method + mirrored second leg with home/away swapped)
  - Draw seed = `deriveSeed(worldSeed, "draw", competitionId, seasonNumber)` — deterministic from
    world seed, never re-rolled
  - Dates from `leagueRoundDates(startYear, rounds)` — pure function, shared slot template
- Cup fixtures are NOT generated at season start: they materialise round-by-round as the bracket
  resolves (`materialiseCupRounds`)

---

## Recommendations

### Can be relied on (fact, not design)

| Fact | Source |
|---|---|
| Season lifecycle phases are `pre_season` → `in_season`/`mid_window_open` → `season_complete` | `season.ts:11` |
| Promotion/relegation is 1 `competition_links` row per pairing with symmetric `slots` count | `schema.ts:282` |
| `freezeFinalStandings` writes `final_position`, `points`, `goal_difference`, `goals_for` to `competition_participants` | `standings.ts:105` |
| All season-conclusion steps run in one SQLite transaction | `advance.ts:186` |
| Board objective bands are fixed per Stature Tier: big (1-6), mid (7-14), small (15-20) | `board.ts:22` |
| Verdict = exceeded (< band.min), met (in band), missed (> band.max) | `board.ts:29` |
| Consecutive-miss counter: 0→1 warns, 1→2 sacks | `board.ts:51` |
| `BoardObjectiveJudged` payload carries `{seasonNumber, clubId, competitionId, finalPosition, band, verdict}` | `boardVerdict.ts:51` |
| Season-concluded sacking → no rollover, save archived | `resolveThrough.ts:87` |
| Pre-season window opens at season start date, closes on first advance | `advance.ts:273` |

### Design choices (not facts — the implementator decides)

| Question | Context |
|---|---|
| Awards (Player of Match, Golden Boot, etc.) | Entirely deferred — no data model, no query, no event. The spec nav has an "Awards" tab placeholder. |
| Titles/honours history per competition | Deferred. Only frozen standings rows are the historical record. |
| Pre-season friendlies, training camps | No concept exists. Players start at 100 condition. |
| Season-expectation negotiation by player | Board objective band is set automatically from Stature Tier. |
| Managers between seasons (new club offers, job market) | No code exists — sacking archives the save (no "apply for jobs"). |
| Mid-season entry (joining in January) | Not modelled. Career starts at pre-season of season 1. |

---

## Gaps

1. **No awards infrastructure at all** — no player statistics table, no season statistics query, no
   "top scorer", no "team of the season". The UI nav tab exists but the backend is empty.

2. **No club history/honours** — `competitions` and `clubs` have no "titles won" column, no past
   champions, no "most recent winner" query.

3. **Season summary only returns the latest judged season** — there is no per-season history
   browsing. Earlier seasons' `board_objective` rows survive in the DB but `getSeasonSummary` only
   returns the latest.

4. **No staff job market or manager movement** — being sacked is terminal (save is archived).
   There's no "apply for jobs at other clubs" or "start a new career at a different club" flow.

5. **No seasonal form/statistics tracking** — the `player_fitness` table tracks condition across
   seasons (resets to 100 each season), but there's no per-player seasonal appearance, goal, or
   rating ledger.