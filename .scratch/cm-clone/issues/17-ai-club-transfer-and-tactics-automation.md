# 17: AI-club transfer & tactics automation

**What to build:** AI clubs autonomously manage their own transfer activity and tactics, using the
same Commands as ticket 16, self-issued internally rather than through the RpcGroup. At each window's
open, an AI club checks each Position for a squad gap and targets/bids on the best affordable player;
it accepts, counters, or rejects incoming bids on its own players by fixed thresholds. At season
start, an AI club is assigned one fixed Tactic for the season, chosen by best-fit against its squad.

**Blocked by:** 16

**Status:** ready-for-agent

- [ ] At each window's open, an AI club identifies Positions where its best Position Rating falls
      below a fixed threshold relative to the league average for that slot
- [ ] For each gap, the AI club targets the highest-Transfer-Value affordable player (Natural/
      Competent at that Position, within remaining Transfer Budget and Wage Budget headroom) and
      bids Transfer Value exactly; one target per weak slot per window
- [ ] If countered, the AI club accepts up to 1.15x Transfer Value if still affordable, otherwise
      withdraws
- [ ] An AI club selling a player accepts bids ≥1.0x Transfer Value outright, counters bids between
      0.85x–1.0x up to exactly Transfer Value, and rejects bids below 0.85x, with no squad-need veto
- [ ] At season start, each AI club is assigned one fixed Tactic: formation chosen to maximize
      summed best-XI Position Rating across the 10 outfield slots, roles defaulted to each slot's v1
      Role, instructions fixed at balanced/normal/medium
- [ ] AI club Tactics never change mid-season or react to opponent/in-match state
- [ ] All AI-club activity is invoked in-process and never touches the RpcGroup
