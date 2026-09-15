# 05: Contract Expiry screen (Screen 141, without Bosman)

**What to build:** A read-only screen listing the manager's Players in their last contracted year (from `contracts.years_remaining`, the same rule `expireContractsForSeason` applies), with wage and years remaining, each linking to that Player's Contract screen where ticket 04's renewal lives. New read-only RPC. No Bosman, pre-contract or approach rules.

**Decisions:**

- Group J v1 scope: see [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-15-group-j-v1-scope.md).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] New read returns the manager's Players in their last contracted year, with an RPC roundtrip test and an empty case
- [ ] Screen lists them with wage and years remaining and links to each Player's Contract screen
- [ ] The "last contracted year" rule is the one `expireContractsForSeason` uses, proven by a test
