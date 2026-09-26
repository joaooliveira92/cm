# 09: The Transfer market shows other clubs' Players by Scouting Progress

Sliced 2026-09-22 by the orchestrator from [decision request 01](../decision-request-01-knowledge-limited-player-reads.md).

**What to build:** on the Transfers screen, every Player outside the manager's club — another club's
Player or a Free Agent — shows his Overall Rating and Transfer Value as an **Attribute Range** that
narrows with his **Scouting Progress**, and as an exact figure only once he is **Fully Scouted**. The
manager's own Players are unchanged. The Bid composer offers a bid against that same range: the manager
bids against an estimate. Sorting the market by a ranged figure orders by the range's midpoint.

The knowledge limit lives in one shared read, not in the screen: a pure rule in the shared package turns a
Player's true figures and the human club's Scouting Progress on him into either an exact figure or a range
(using the existing `attributeRange`), and the market read returns what that rule gives. The read's failures
are the ones the market read already has; it needs nothing beyond the save. The wire carries a figure that
is exact or a range, never both, so no surface can read the exact value of a Player the manager has not
fully scouted. Later reads (the Player screens, Player Search, Transfer Target Comparison) reuse this rule
and figure shape.

`CONTEXT.md` is amended in the same commit: **Listed** loses its "full-information Transfer Value" clause;
a Bid still needs no "for sale" signal.

**Decisions:**

- **Knowledge-limit the market, and every Player read outside the manager's club, on one shared read.** *(Option A.)* See [Agent Note](../../../.agents/notes/implemented/architecture/2026-09-19-knowledge-limits-every-player-read.md).

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] An unscouted Player from another club, and an unscouted Free Agent, show Overall Rating and Transfer Value as ranges on the market; a Fully Scouted one shows exact figures
- [x] The range narrows as Scouting Progress rises and never widens, proved at three progress values
- [x] The manager's own Players show exact figures
- [x] The Bid composer shows the same range and accepts a bid against it
- [x] The market response carries no exact figure for a Player below Fully Scouted (a contract roundtrip test, and a main test that reads it)
- [x] `CONTEXT.md` **Listed** no longer claims full-information Transfer Value
- [x] `pnpm check:all` green, and e2e since the market changes

## Answer

Shipped in `70aa419f` (`feat(transfers): market player scouting progress`), which the previous session
committed but left at `claimed` — resolved against the tree 2026-09-23, not against the commit message.

The knowledge limit lives in the shared read as the ticket required:

- `packages/shared/src/rules/scouting.ts` — pure `figureByProgress` / `transferValueFigureByProgress`
  turning (true figures, Scouting Progress) into a `KnownFigure` (`exact` | `range`) over the existing
  `attributeRange`.
- `main/transfers/commands.ts` — the market read loads the human club's `scouting_progress` rows once
  and maps every rival and Free Agent through `toMarketPlayerView(player, progress)`; absence of a row
  means progress 0, the widest Range. Both lists (`marketPlayers`, `freeAgents`) go through the same
  path, so the wire can carry no exact figure below Fully Scouted.
- `CONTEXT.md` **Listed** struck its "full-information Transfer Value" clause in the same commit.

Evidence per acceptance criterion, all observed green on the tree 2026-09-23:

| # | Criterion | Proof |
|---|---|---|
| 1 | Rival + Free Agent ranged, Fully Scouted exact | `apps/desktop/test/main/transfers/market-knowledge.test.ts` test 1 (AC1 rival / Free Agent / progress 100 halves) |
| 2 | Narrows, never widens, at three progress values | same file test 2 (0 / 50 / 100) + `packages/shared/test/rules/scouting.test.ts` monotonicity over every progress step |
| 3 | Own Players exact | `market-knowledge.test.ts` test 3 (own squad reads plain numbers, never listed on the market) |
| 4 | Bid composer shows the range and bids against it | `BidComposer.tsx` renders via `formatFigureCredits`; `transfers.test.ts` bids `figureHigh(target.transferValue)` and the accept/counter branches pass against the ranged view |
| 5 | No exact figure below Fully Scouted | `market-knowledge.test.ts` test 4 (every row Ranged with one rival at 99) + `packages/contracts/test/market-player-figures.test.ts` roundtrip, which rejects any figure that is neither exact nor range |
| 6 | `CONTEXT.md` Listed amended | `git show 70aa419f -- CONTEXT.md` |
| 7 | Gate green | focused runs observed: shared 507 passed, contracts 183 passed, desktop transfers 28 passed; full `pnpm check:all` observed green at the ticket-10 commit that follows |
