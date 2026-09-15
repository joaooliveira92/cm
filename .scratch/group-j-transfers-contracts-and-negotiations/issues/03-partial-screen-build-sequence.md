# 03: Build sequence

Type: grilling
Status: resolved
Blocked by: 01, 02

## Question

Given the inventory (01) and scope decisions (02), what is the dependency-ordered build sequence for the
in-scope screens? Prefer screens on existing domain logic, and name shared components.

## Answer

| Priority | Screen | Rationale |
|---|---|---|
| 1 | 140 Contract Renewal | The command exists with no consumer. Add a renew action with a length choice to the existing Player Contract screen, for a player on the manager's club, with typed refusals inline. |
| 2 | 141 Contract Expiry | One read over the manager's squad and `contracts.years_remaining`: who is in their last contracted year, linking to renewal. No Bosman or pre-contract rule. |
| 3 | 145 Transfer and Wage Budget Review | One read: Transfer Budget remaining, Wage Budget and the wages committed by the squad's Contracts. No projection. |
| 4 | 146 Transfer History | New read over `player_transfers` for the manager's club: date, Player, from and to Club, fee. |

### Shared components

- **Contract line**: wage and years remaining, used by 140 and 141.
- **Credits formatting**: the existing `formatCredits`.

