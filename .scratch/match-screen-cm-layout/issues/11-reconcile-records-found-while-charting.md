# Reconcile records found stale while charting

Type: task
Status: resolved
Blocked by: 03, 04, 08, 09

## Question

Charting this map found code comments, records and a stored-timeline schema that disagree with the
code or with this map's decisions. Which must change, and in which implementing change, so none go
stale?

## Answer

Done as a list for the implementing tickets, not edited now: each record is true of today's code
until the change that falsifies it ships, and the repo rule is that the change updates the record.

| Record | What is wrong or about to be | Fixed by the change that ships |
|---|---|---|
| `apps/desktop/src/main/match/statistics.ts` `computePossession` | Already contradicts the implemented "shows only what it produces" note: an attack share presented as possession | [03](03-team-statistics-corners-and-possession.md) |
| `UNAVAILABLE_MATCH_STATISTICS` lists `corners` | `Corner` events exist | [03](03-team-statistics-corners-and-possession.md) |
| `packages/shared/src/rules/matchRating.ts` header | Says no event names a save or an assist | [04](04-match-rating-reads-recorded-involvement.md) |
| `packages/game-engine/src/match/events.ts` `keeperId` doc ("Read only by commentary") | Saves will read it | [02](02-per-player-columns-the-stream-backs.md)'s fold |
| `apps/desktop/src/main/match/timeline.ts` | `Offside` is listed twice in the stored-timeline union (lines 57–58); harmless but a decode-order trap | [02](02-per-player-columns-the-stream-backs.md)'s fold, same change |
| `discardSquadsForClubs` doc ("six tables") | Becomes seven | [08](08-where-a-players-match-line-lives.md) |
| `PlayerScreenFrame.tsx` `TABS` comment ("Form and History are absent") | Form ships | [09](09-the-form-tab.md) |
| `.scratch/group-d-player-and-staff-records/issues/04-remaining-screens-disposition.md`, row 53 | Out-of-scope disposition superseded | [09](09-the-form-tab.md) (one-line pointer to this map) |
| `nav-route-parser.ts` `matchRouteToTabId` and `MATCH_TAB_CONFIGS` | New tabs and routes | [05](05-one-tab-bar-for-two-tab-rows.md) |
| `CONTEXT.md` | Gains **Player of the Match** and **Match Player Line** | [09](09-the-form-tab.md), [02](02-per-player-columns-the-stream-backs.md) |
| `.agents/notes/implemented/architecture/2026-09-19-the-match-model-shows-only-what-it-produces.md` | Its premise about which events exist is dated; it gains a "Superseded in part by" line linking the two 2026-10-03 feature notes | [03](03-team-statistics-corners-and-possession.md) |
