# 01: Screen inventory — what of screens 236–249 exists

Type: task
Status: resolved

## Question

Which screens of Group Q (236–249) have any existing implementation, stub, route, RPC, schema, or
domain model in the shipped codebase?

Classify each screen as:
- **Shipped** — a route and component exist that match the screen's purpose
- **Partial** — some data exists but no dedicated screen
- **Absent** — no route, no component, no data

Separately answer the data-layer question:
- What does the `season_summary` read model actually contain? What schema table backs it?
- What does the Season Concluded event carry?
- What does Board Objective Judged carry?
- Does any awards model exist — player of the season, team of the season, manager of the month, etc.?
- What does the season rollover/transition (`advance.ts`) actually do — one transaction or
  resumable?
- What pre-season infrastructure exists (budget setting, new season expectations)?

This is a fact-finding ticket. It decides nothing — it exists so the v1 scope decision has the
real facts.

## Answer

**Zero screens have a dedicated route or component.** The classification is:

| Screen | Category | Detail |
|--------|----------|--------|
| 236 Awards Centre | **Absent** | No awards infrastructure exists. |
| 237 Player Awards | **Absent** | No player stats exist for awards. |
| 238 Manager Awards | **Absent** | No manager reputation/honours model. |
| 239 Team/Club Awards | **Absent** | No club honour tracking. |
| 240 Team of the Season | **Absent** | No selection model. |
| 241 Goal/Moment Awards | **Absent** | No highlight/clip model. |
| 242 Honours Summary | **Absent** | No honours accumulation model. |
| 243 End of Season Review | **Partial** — `getSeasonSummary` returns standings, board verdict, manager outcome, consecutive misses. No dedicated screen. |
| 244 Promotion/Relegation Confirmation | **Partial** — rollover processes exchange links. No confirmation screen. |
| 245 Season Awards Ceremony | **Absent** | Depends on awards infrastructure. |
| 246 Season Transition / Rollover | **Partial** — rollover exists as one SQLite transaction in `advance.ts`. No transition screen. |
| 247 Off-Season / Holiday Planning | **Absent** | No holiday/inactivity model. |
| 248 New Season Expectations / Budgets | **Partial** — budget derivation from Stature Tier exists. No expectation-setting screen. |
| 249 Pre-Season Readiness Checklist | **Absent** | Pre-season exists as a phase but no checklist screen. |

**Data-layer findings:**

*`season_summary`* is a read-model query (`getSeasonSummary`), not a table. Returns `SeasonSummaryView`
with standings, board objective verdict, manager outcome, consecutive misses. Only the latest
judged season — not a multi-season view.

*`SeasonConcluded`* carries `{ seasonNumber }` only.

*`BoardObjectiveJudged`* carries `{ seasonNumber, clubId, competitionId, finalPosition, band,
verdict }`.

*Awards model* — **none.** Zero DB tables, zero event tags. No golden boot, player of the season,
team of the season, manager of the month, or titles/honours.

*Season rollover* is one SQLite transaction in `advance.ts`. Sequence: freeze standings →
SeasonConcluded → expire contracts → develop players → judge board → rollover → start next season.
If sacked, rollover does NOT run and save becomes read-only (`Archived Save`).

*Promotion/relegation* uses `competition_links` with symmetric slots. Implemented in `rollover.ts`.

*Pre-season* exists as the first phase (`pre_season` → `in_season`/`mid_window_open` →
`season_complete`). No pre-season friendlies or training camps exist.

See [Research note](../../../../docs/research/group-q-season-transitions.md).