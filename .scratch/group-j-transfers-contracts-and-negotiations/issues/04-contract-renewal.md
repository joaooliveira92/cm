# 04: Contract Renewal on the Player Contract screen (Screen 140)

**What to build:** Add a renew action with a length choice (`MIN_CONTRACT_YEARS` to `MAX_CONTRACT_YEARS`) to the Player Contract screen (`player/$playerId/contract`) for a Player on the manager's club, through the existing `renewContract` command, which has no consumer today. The screen refreshes to the new length and wage after success. Typed refusals (`TransferWindowClosedError`, `WageBudgetExceededError`, `InvalidBidActionError`) show inline. No action for a Player on another club.

**Decisions:**

- Group J v1 scope: 4 own-club screens, 11 deferred. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-15-group-j-v1-scope.md).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Renew action with a length choice on the Player Contract screen for an own-club Player, through `renewContract`
- [ ] The contract shown refreshes after success; each typed refusal shows its sentence inline
- [ ] No renew action for a Player outside the manager's club
