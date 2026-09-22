# 10: The Player screens show other clubs' Players by Scouting Progress

Sliced 2026-09-22 by the orchestrator from [decision request 01](../decision-request-01-knowledge-limited-player-reads.md).

**What to build:** opening another club's Player shows his Attributes, hidden Attributes (Potential
Ability, Injury Proneness), Overall Rating, Position Ratings and Transfer Value as **Attribute Ranges** by
the human club's **Scouting Progress** on him, exact only once **Fully Scouted**; his contract screen shows
no figure the market would withhold. The manager's own Players are unchanged. Today the Player read returns
every exact figure for any club's Player, so the Player screen discloses what the Scouting Knowledge screen
withholds. It reuses 09's shared rule and figure shape, so the market and the Player screens cannot
disagree about the same Player.

**Decisions:**

- **Knowledge-limit the market, and every Player read outside the manager's club, on one shared read.** *(Option A.)* See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-19-knowledge-limits-every-player-read.md).

**Blocked by:** [09](09-the-market-reads-players-by-scouting-progress.md)

**Status:** ready-for-agent

- [ ] Another club's unscouted Player shows every Attribute, hidden Attribute, rating and Transfer Value as a range; a Fully Scouted one shows exact figures identical to the market's
- [ ] The manager's own Player shows exact figures
- [ ] The Player response carries no exact figure for a Player below Fully Scouted (contract roundtrip, main test)
- [ ] `pnpm check:all` green, and e2e since the Player screens change
