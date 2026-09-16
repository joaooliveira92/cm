# 06: Transfer and Wage Budget Review screen (Screen 145)

**What to build:** A read-only screen showing the manager's club's Transfer Budget remaining, Wage Budget, and wages committed by the squad's Contracts, with the headroom left under the Wage Budget. New read-only RPC over `club_budgets` and `contracts`. No projection or history.

**Decisions:**

- Group J v1 scope: see [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-15-group-j-v1-scope.md).

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] New read returns Transfer Budget remaining, Wage Budget and committed wages, with an RPC roundtrip test
- [x] Committed wages equal the sum the wage-budget check in `renewContract` and `completeTransfer` uses, proven by a test
- [x] Screen shows the three figures and the headroom
