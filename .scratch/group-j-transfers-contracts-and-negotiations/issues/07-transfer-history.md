# 07: Transfer History screen (Screen 146)

**What to build:** A read-only screen of transfers into and out of the manager's club from `player_transfers`: date, Player name, from Club, to Club, fee, newest first. New read-only RPC. Decide whether it fills the `club/$clubId/transfers` stub for the manager's club or takes its own route, and record the choice.

**Decisions:**

- Group J v1 scope: see [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-15-group-j-v1-scope.md).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] New read returns the manager's club's transfers newest first, with an RPC roundtrip test and an empty case
- [ ] Screen lists date, Player, from Club, to Club and fee
- [ ] A Free Agent signing (no from Club) reads correctly
