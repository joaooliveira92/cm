# 11: Player Search reads by Scouting Progress

Sliced 2026-09-23 from [decision request 01](../decision-request-01-knowledge-limited-player-reads.md) by the orchestrator. The decision is answered and the shared rule exists (tickets 09/10); this screen was the reason the rule had to land in the read.

**What to build:** the manager searches every player in the world — by name, age, position, nationality, club, or any knowledge-limited criterion the read supports — and the results list reads Player figures exactly the way the market and Player screens now do: the manager's own Players exact, every other Player an **Attribute Range** by the human club's **Scouting Progress** on him, exact only at **Fully Scouted**. A result row offers exact figures for the manager's own squad and for a Fully Scouted target, and ranges below it; opening a result lands on that Player's Profile, already knowledge-limited. The wire carries no exact figure for a Player below Fully Scouted. This retires the WIP `playerSearch` placeholder, one of the four M1 exit criterion 1 names.

**Decisions:**

- Knowledge-limit the market, and every Player read outside the manager's club, on one shared read. A Player outside the manager's club shows Attribute Range values by Scouting Progress — Transfer Value and Overall Rating included — never an exact figure, until Fully Scouted. The manager's own Players are unaffected. The fix goes in the **read**, not the screens, so the market, BidComposer, Player Search (119) and Transfer Target Comparison (129) cannot disagree. See [Agent Note](../../../.agents/notes/implemented/architecture/2026-09-19-knowledge-limits-every-player-read.md).

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] Searching returns Players from the whole save, with the manager's own squad and rivals/Free Agents the same result pool
- [x] An unscouted or mid-progress rival's result shows every figure as a range that narrows with Scouting Progress and never widens; a Fully Scouted rival and an own-squad Player show exact figures
- [x] The search response carries no exact figure for a Player below Fully Scouted (contract roundtrip, main test)
- [x] Opening a result navigates to that Player's Profile and reads the figures the result just published
- [x] The `playerSearch` WIP placeholder is gone, with its route and screen-scope entries
- [x] `pnpm check:all` green, and e2e since the search entry point changes
## Answer

Shipped in `58eab5d4` (`feat(scouting): implement knowledge-limited player search`).

One read, `getPlayerSearch`, covers the whole save in one result pool (`main/transfers/playerSearch.ts`,
`packages/contracts/src/rpc-scouting.ts`). The human club's `scouting_progress` rows load once and every
rival/Free Agent maps through the shared `figureByProgress` rule — own squad exact, ranged below **Fully Scouted**, exact at it — so the wire cannot carry an exact figure for a Player below Fully Scouted.
`PlayerSearchScreen` replaces the WIP `playerSearch` placeholder (its route, `rpc/playerSearchQueries.ts`
and `table/playerSearch/` screen entries ship with it).

Evidence per acceptance criterion, observed green on the tree 2026-09-23:

| # | Criterion | Proof |
|---|---|---|
| 1 | Whole-save result pool, own squad + rivals/FA together | `apps/desktop/test/main/transfers/player-search.test.ts` (results span the save; own squad exact beside ranged rivals; Free Agents can come back unclubbed) |
| 2 | Ranges narrow with Scouting Progress, never widen; exact at Fully Scouted | same file (progress 0/50/100) + `packages/shared/test/rules/scouting.test.ts` monotonicity |
| 3 | No exact figure below Fully Scouted on the wire | `packages/contracts/test/player-search-figures.test.ts` (results schema + `AppRpcs.getPlayerSearch` union roundtrip: success `PlayerSearchResultsView`, failure `SaveNotFoundError`) |
| 4 | Result opens the Player's Profile, figures agree | `apps/desktop/e2e/player-search-scouting.spec.ts` |
| 5 | WIP placeholder gone | `main/renderer/playerSearch/PlayerSearchScreen.tsx` real screen replaces the placeholder |
| 6 | `pnpm check:all` green + e2e | run at close 2026-09-23 |
