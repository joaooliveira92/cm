# 12: Transfer Target Comparison reads by Scouting Progress

Sliced 2026-09-23 from [decision request 01](../decision-request-01-knowledge-limited-player-reads.md) by the orchestrator. Screen 129 was one of the note's named dependents; the shared rule it needs now exists (tickets 09/10).

**What to build:** the manager puts two or more Players side by side — searched or shortlisted targets — and compares them across position/role fit, visible Attributes, Overall Rating, Transfer Value, wage, contract and availability, each figure read exactly the way the market and Player screens do: the manager's own Players exact, every other Player an **Attribute Range** by the human club's **Scouting Progress** on him, exact only at **Fully Scouted**. The comparison never invents an exact figure the reads withhold, and a Player below Fully Scouted stays a range in every column on the same wire the search and profile use. Opening a candidate navigates to that Player's Profile.

**Decisions:**

- Knowledge-limit the market, and every Player read outside the manager's club, on one shared read. A Player outside the manager's club shows Attribute Range values by Scouting Progress — Transfer Value and Overall Rating included — never an exact figure, until Fully Scouted. The manager's own Players are unaffected. The fix goes in the **read**, not the screens, so the market, BidComposer, Player Search (119) and Transfer Target Comparison (129) cannot disagree. See [Agent Note](../../../.agents/notes/implemented/architecture/2026-09-19-knowledge-limits-every-player-read.md).

**Blocked by:** [11](11-player-search-reads-by-scouting-progress.md) provides the shared search read and the result figures this screen composes; start comparison rows from that pool. **11 shipped 2026-09-23 (`58eab5d4`), so this ticket is unblocked.**

**Status:** claimed

- [ ] Two or more Players compare side by side on position/role fit, Attributes, Overall Rating, Transfer Value, wage, contract and availability
- [ ] Figures read by Scouting Progress: own-squad exact, rivals/Free Agents ranged below Fully Scouted, exact at it, matching the search results and Player Profile for the same Player
- [ ] The comparison response carries no exact figure for a Player below Fully Scouted (contract roundtrip, main test)
- [ ] Opening a candidate navigates to that Player's Profile
- [ ] `pnpm check:all` green, and e2e since the comparison entry point changes