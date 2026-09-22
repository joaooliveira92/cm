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

- **Knowledge-limit the market, and every Player read outside the manager's club, on one shared read.** *(Option A.)* See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-19-knowledge-limits-every-player-read.md).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] An unscouted Player from another club, and an unscouted Free Agent, show Overall Rating and Transfer Value as ranges on the market; a Fully Scouted one shows exact figures
- [ ] The range narrows as Scouting Progress rises and never widens, proved at three progress values
- [ ] The manager's own Players show exact figures
- [ ] The Bid composer shows the same range and accepts a bid against it
- [ ] The market response carries no exact figure for a Player below Fully Scouted (a contract roundtrip test, and a main test that reads it)
- [ ] `CONTEXT.md` **Listed** no longer claims full-information Transfer Value
- [ ] `pnpm check:all` green, and e2e since the market changes
