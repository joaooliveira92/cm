# Agent Note: Group J v1 scope — own-club contract and budget screens only

Status: proposed

## Problem

Group J (Transfers, Contracts and Negotiations) has 15 screen specs, 132 to 146. All working transfer UI
sits on one Transfers screen: a market table, Bid tables, a Bid composer and a counter-offer modal. The
specs assume models the game does not have (loans, clauses, installments, multi-round negotiation,
registration, Staff contracts, Bosman and pre-contract rules), and several contradict CONTEXT.md as
written: a Bid is single-round, a Contract is never renegotiated mid-term, a Free Agent signs with no
negotiation. Separately, every screen that shows another club's Player shows an exact Overall Rating
and Transfer Value, which Group I's decision request 01 questions.

## Proposal

Group J v1 will build four screens, each about the manager's own club, on existing tables and commands:

- **140 Contract Renewal**: a renew action with a length choice on the existing Player Contract screen,
  over the `renewContract` command that has no consumer today.
- **141 Contract Expiry**, without Bosman or pre-contract rules: the manager's Players in their last
  contracted year, read from `contracts.years_remaining`, linking to renewal.
- **145 Transfer and Wage Budget Review**: Transfer Budget remaining, Wage Budget, and wages committed by
  the squad's Contracts. No projection.
- **146 Transfer History**: the manager's club's transfers from `player_transfers`: date, Player, from and
  to Club, fee.

Deferred:

| Screens | Why |
|---|---|
| 132 Transfer Centre, 134 Make Transfer Offer, 137 Player Contract Offer | show other clubs' Players with exact figures; wait for Group I decision request 01 |
| 135, 136, 138, 139, 144, and 141's Bosman part | contradict CONTEXT.md (single-round Bid, no loans, never-renegotiated Contract, no Staff wages); a human must change the domain first |
| 133 Incoming Transfer Offer, 142 Completion and Registration, 143 Cancellation and Withdrawal | served today by the Transfers screen's Bid tables; a dedicated screen needs clause, registration or cancellation models |

## Alternatives considered

- **Redesign the Transfer Centre (132) now.** It is the group's main screen, but any rework would cement
  or remove the exact market figures before decision request 01 is answered. Rejected until then.
- **Model multi-round negotiation to unlock 135 and 138.** Rejected: CONTEXT.md makes the Bid
  single-round and the Contract non-negotiable on purpose, and overturning a recorded domain rule is a
  human's call, not a scoping step.
- **Defer all of Group J.** Rejected: `renewContract` already exists with no way to reach it, so Players
  currently expire with no renewal path in the UI.

## Acceptance criteria

- The Group J spec covers only 140, 141 (without Bosman), 145 and 146 for v1.
- No v1 screen shows an exact figure for a Player outside the manager's club.
- Implementation tickets exist only for those four screens, and none changes a CONTEXT.md rule.

## Risks

- The Transfer Centre stays as it is, so Group J v1 leaves the market's exact-figure question open.
- Renewal uses the formula wage with no negotiation, which may read as thin beside the specs.
