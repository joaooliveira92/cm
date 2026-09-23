# 11: Player Search reads by Scouting Progress

Sliced 2026-09-23 from [decision request 01](../decision-request-01-knowledge-limited-player-reads.md) by the orchestrator. The decision is answered and the shared rule exists (tickets 09/10); this screen was the reason the rule had to land in the read.

**What to build:** the manager searches every player in the world — by name, age, position, nationality, club, or any knowledge-limited criterion the read supports — and the results list reads Player figures exactly the way the market and Player screens now do: the manager's own Players exact, every other Player an **Attribute Range** by the human club's **Scouting Progress** on him, exact only at **Fully Scouted**. A result row offers exact figures for the manager's own squad and for a Fully Scouted target, and ranges below it; opening a result lands on that Player's Profile, already knowledge-limited. The wire carries no exact figure for a Player below Fully Scouted. This retires the WIP `playerSearch` placeholder, one of the four M1 exit criterion 1 names.

**Decisions:**

- Knowledge-limit the market, and every Player read outside the manager's club, on one shared read. A Player outside the manager's club shows Attribute Range values by Scouting Progress — Transfer Value and Overall Rating included — never an exact figure, until Fully Scouted. The manager's own Players are unaffected. The fix goes in the **read**, not the screens, so the market, BidComposer, Player Search (119) and Transfer Target Comparison (129) cannot disagree. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-19-knowledge-limits-every-player-read.md).

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Searching returns Players from the whole save, with the manager's own squad and rivals/Free Agents the same result pool
- [ ] An unscouted or mid-progress rival's result shows every figure as a range that narrows with Scouting Progress and never widens; a Fully Scouted rival and an own-squad Player show exact figures
- [ ] The search response carries no exact figure for a Player below Fully Scouted (contract roundtrip, main test)
- [ ] Opening a result navigates to that Player's Profile and reads the figures the result just published
- [ ] The `playerSearch` WIP placeholder is gone, with its route and screen-scope entries
- [ ] `pnpm check:all` green, and e2e since the search entry point changes