# 16: Transfers & contracts: budgets, bidding, signing, market/inbox screen

**What to build:** Transfer Budget (spend-down, per season) and Wage Budget (running cap), both
derived from a club's Stature Tier at season start. Transfer commands are legal only inside an open
Transfer Window (pre-season until Matchday 1; mid-season from after Matchday 19 to Matchday 20). Any
player can receive a Bid regardless of Listed status; a Bid is single-round (accept / reject / one
counter-offer, then accept or withdraw). Signing sets a 1–5 year Contract at a formula-derived wage;
expiry produces a Free Agent, signable for Credits 0 via the same flow. A Transfer market/inbox screen
drives all of this.

**Blocked by:** 10, 15

**Status:** ready-for-agent

- [ ] Transfer Budget and Wage Budget are derived from Stature Tier at season start and visible in
      the UI at all times
- [ ] Transfer Budget spends down within a season with no replenishment between the two windows;
      Wage Budget is enforced as a running cap on active Contracts' wages
- [ ] Transfer commands raised outside an open window are rejected
- [ ] Player can bid for any player (Listed or not) during an open window
- [ ] Bid flow: selling club/side can accept, reject, or make exactly one counter-offer; bidder can
      then accept or withdraw
- [ ] Signing sets a 1–5 year Contract with a formula-derived wage (no wage negotiation UI)
- [ ] Contract expiry at season start produces a Free Agent, signable for Credits 0 via the normal
      flow with no Bid step
- [ ] Renewal reuses the signing flow against the player's current club during an open window
- [ ] Transfer market/inbox screen surfaces incoming bids, outgoing bids, and Free Agents
- [ ] `CompleteTransfer` writes to both clubs' streams atomically in one SQL transaction
