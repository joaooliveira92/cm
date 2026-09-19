# Group J reconciliation ledger

The specs in this directory are an **import**, not a set of requirements. This ledger records, per
screen, every place the import is knowingly not followed, and why. The format is the one the
[Group A ledger](../group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md) pilots,
with the same four kinds and status vocabulary. The import files are never edited.

## Transcribed 2026-09-19, from a durable source

Milestone [M1](../../../.ai/MILESTONES.md) step 1. Like Groups H and I, this effort recorded its scope
ruling as an Agent Note —
[Group J v1 scope](../../../.agents/notes/proposed/architecture/2026-09-15-group-j-v1-scope.md) — so
the decision behind every row below already outlived its effort. This file adds the coverage table.

**One correction, and it is to my own earlier work rather than to the effort.**
[spec-ledger-kinds decision request 01](../../../.scratch/spec-ledger-kinds/decision-request-01-is-a-v1-exclusion-out-of-scope-or-deferred.md)
listed "137–140 contract and wage negotiation" as resting on the `CONTEXT.md` v1 exclusion. That is
wrong about 140: **Screen 140 Contract Renewal is in v1**, and `renewContract` ships. The exclusion at
`CONTEXT.md:753` covers *negotiation*, not contract display or renewal, so it reaches 137, 138 and 139
and stops. The rows below are scoped accordingly.

**No screen in Group J is `out-of-scope`.** The effort used `deferred` throughout, which is the kind
[the completed rule](../../../.agents/notes/proposed/process/2026-09-19-a-v1-exclusion-is-deferred-not-out-of-scope.md)
gives them.

## What each status asserts

| Status | What silence about a section asserts |
|---|---|
| `Reviewed` | Nothing. The rows are what a whole-file pass found; no section was individually checked. |
| `Deferred in full` | The screen is wanted and not built. Its one row covers every section. |

## Coverage

Four own-club screens were in v1. **Three shipped; Screen 140 is built and withheld.**

| Screen | Import file | Status |
|---|---|---|
| 132 Transfer Centre | [132_transfer_centre.md](132_transfer_centre.md) | Deferred in full |
| 133 Incoming Transfer Offer | [133_incoming_transfer_offer.md](133_incoming_transfer_offer.md) | Deferred in full |
| 134 Make Transfer Offer | [134_make_transfer_offer.md](134_make_transfer_offer.md) | Deferred in full |
| 135 Transfer Negotiation | [135_transfer_negotiation.md](135_transfer_negotiation.md) | Deferred in full |
| 136 Loan Offer and Negotiation | [136_loan_offer_and_negotiation.md](136_loan_offer_and_negotiation.md) | Deferred in full |
| 137 Player Contract Offer | [137_player_contract_offer.md](137_player_contract_offer.md) | Deferred in full — v1 exclusion |
| 138 Player Contract Negotiation | [138_player_contract_negotiation.md](138_player_contract_negotiation.md) | Deferred in full — v1 exclusion |
| 139 Staff Contract Offer and Negotiation | [139_staff_contract_offer_and_negotiation.md](139_staff_contract_offer_and_negotiation.md) | Deferred in full — v1 exclusion |
| 140 Contract Renewal | [140_contract_renewal.md](140_contract_renewal.md) | Reviewed — **v1 scope, built and withheld** |
| 141 Contract Expiry and Bosman Status | [141_contract_expiry_and_bosman_status.md](141_contract_expiry_and_bosman_status.md) | Reviewed — implemented 2026-09-15, without Bosman |
| 142 Transfer Completion and Registration | [142_transfer_completion_and_registration.md](142_transfer_completion_and_registration.md) | Deferred in full |
| 143 Transfer Cancellation and Withdrawal | [143_transfer_cancellation_and_withdrawal.md](143_transfer_cancellation_and_withdrawal.md) | Deferred in full |
| 144 Transfer Clauses and Installments | [144_transfer_clauses_and_installments.md](144_transfer_clauses_and_installments.md) | Deferred in full |
| 145 Transfer Budget and Wage Budget Review | [145_transfer_budget_and_wage_budget_review.md](145_transfer_budget_and_wage_budget_review.md) | Reviewed — implemented 2026-09-15 |
| 146 Transfer History and Audit Trail | [146_transfer_history_and_audit_trail.md](146_transfer_history_and_audit_trail.md) | Reviewed — implemented 2026-09-15 |

Ticket references below are deliberately unlinked: they live under `.scratch/`, which is cleared when
an effort is archived, and this ledger outlives the effort that produced it.

## Six screens contradict the domain, rather than merely exceeding it

Ticket 01's survey is the sharpest finding in the M1 sweep. Group J is not a group of absent models —
it is a group where **the import assumes a different game**:

> Six screens contradict `CONTEXT.md`'s single-round **Bid** and never-renegotiated **Contract**.

The import assumes multi-round haggling: an offer, a counter, a negotiation that converges. This game
settles a Bid in one round, and a Contract, once signed, is not renegotiated. Those are not gaps to
fill later; they are different rules. Screens 133, 134, 135, 136, 137 and 138 all rest on them.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| [133_incoming_transfer_offer.md](133_incoming_transfer_offer.md), [134_make_transfer_offer.md](134_make_transfer_offer.md), [135_transfer_negotiation.md](135_transfer_negotiation.md), [136_loan_offer_and_negotiation.md](136_loan_offer_and_negotiation.md), whole files | `contradicted` | A multi-round negotiation: offer, counter-offer, revision, agreement. | A **Bid** is single-round. `placeBid`, `respondToBid` and `respondAsBidder` resolve it in one exchange, and the existing Transfers screen carries all of it. | **Bid** in [CONTEXT.md](../../../CONTEXT.md), and the `formula-driven-transfer-economy` note. Ticket 02. These are `deferred` in the coverage table because the *screens* could exist over a different negotiation model; the negotiation model itself is contradicted. |
| [137_player_contract_offer.md](137_player_contract_offer.md), [138_player_contract_negotiation.md](138_player_contract_negotiation.md), [139_staff_contract_offer_and_negotiation.md](139_staff_contract_offer_and_negotiation.md), whole files | `deferred` | Offering and negotiating contract terms with a player or staff member. | Not built. Wage negotiation and promised playing time are excluded from v1. Screen 139 additionally rests on the closed staff role set — staff hold no **Contract** at all. | `v1 exclusion — CONTEXT.md:753`. [A v1 exclusion is `deferred`]( ../../../.agents/notes/proposed/process/2026-09-19-a-v1-exclusion-is-deferred-not-out-of-scope.md). Ticket 02. |

**And the same knowledge defect Group I found applies here**: the market shows exact figures for other
clubs' Players. Screens 132, 134 and 137 are gated by
[group-i decision request 01](../group_i_scouting_and_recruitment/RECONCILIATION.md) for that reason.

## Divergences in what shipped

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| [141_contract_expiry_and_bosman_status.md](141_contract_expiry_and_bosman_status.md), Bosman status | `deferred` | Expiring contracts carry Bosman status — a player free to negotiate abroad in his final six months. | Shipped **without Bosman**. The screen lists expiring Contracts; the pre-contract right is not modelled. | `unscheduled`. Ticket 02 put 141 in v1 explicitly "without Bosman". |
| [146_transfer_history_and_audit_trail.md](146_transfer_history_and_audit_trail.md), club scoping | `renamed` | The audit trail is a club's own. | Shipped on its own career route `career/$saveId/transfer-history`, leaving the club-scoped stub alone. | [Transfer History takes its own career route](../../../.agents/notes/implemented/architecture/2026-09-15-transfer-history-takes-its-own-career-route.md). Ticket 07. |

## Screen 140: in v1, built, and withheld

The one screen in the M1 sweep in this state. Ticket 04 **built Contract Renewal and kept it as a
patch** rather than shipping it, because the screen cannot be specified without answering a rule
question: *can a Contract be renewed while it still has years to run?*

That was group-j decision request 01, and it is **answered 2026-09-19: a Contract may be renewed only in
its last contracted year** —
[a Contract renews only in its last contracted year](../../../.agents/notes/proposed/feature/2026-09-19-a-contract-renews-in-its-last-year.md).
The plain reading of "never renegotiated mid-term"; it gives the Contract Expiry screen its purpose, and
it closes a one-way loophole, since a mid-term renewal at today's formula figure only appeals when the
number has fallen.

**Ticket 04 is now the cheapest screen in the backlog.** The implementation is written and reviewed; it
needs the last-year guard, a typed refusal on `renewContract`'s declared union, and one existing test
inverted — that test currently encodes the permissive reading against a freshly generated Contract.

Holding the patch rather than shipping under a guess was the right call, and is worth naming as
precedent: the work was not lost and the rule was not invented.

## Deferred in full

Beyond the six contradicted-model screens above, five more, anchored to
[Group J v1 scope](../../../.agents/notes/proposed/architecture/2026-09-15-group-j-v1-scope.md).

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| [132_transfer_centre.md](132_transfer_centre.md), whole file | `deferred` | A hub for all transfer activity. | The existing Transfers screen carries the working UI for the whole group. A dedicated centre adds a surface, not a capability — and is gated by the knowledge question. | `unscheduled`, gated by group-i decision request 01. |
| [142_transfer_completion_and_registration.md](142_transfer_completion_and_registration.md), whole file | `deferred` | Completing a transfer and registering the player. | A completed **Bid** moves the Player; there is no completion surface and no registration model. | `unscheduled`. The registration half is the same absent model as [Group E Screen 76](../group_e_squad_management/76_squad_registration.md). |
| [143_transfer_cancellation_and_withdrawal.md](143_transfer_cancellation_and_withdrawal.md), whole file | `deferred` | Withdrawing or cancelling a bid in flight. | A single-round Bid has no meaningful in-flight window to withdraw from. | `unscheduled`. Rests on the same single-round **Bid** as the contradicted rows. |
| [144_transfer_clauses_and_installments.md](144_transfer_clauses_and_installments.md), whole file | `deferred` | Sell-on clauses, appearance fees, staged payments. | Unmodelled. A **Bid** carries a single figure. | `unscheduled`. |

## What this ledger leaves owed

- ~~**group-j decision request 01**~~ **answered 2026-09-19.** Ticket 04 unblocks — the cheapest screen
  in the backlog, since the work is already written.
- **group-j decision request 02 (club-scoped transfer history indexes)** — answered **Option C, not
  yet**, with Option A pre-approved on one condition: the next scale-probe run includes this read, and
  the indexes ship with that measurement behind them. `db/schema.ts` requires an index to be measured
  rather than assumed, and approving on a query plan would break the rule the index-count test exists to
  enforce.
- ~~**group-i decision request 01** gates Screens 132, 134 and 137 here.~~ **Answered 2026-09-19** —
  those three unblock, and the market's exact figures for unscouted Players are the defect being fixed.
- **One stale stub.** Ticket 07 deliberately left the club-scoped transfer-history stub alone when it
  shipped Screen 146 on its own route. `renderer/clubTransfersDetail/` is a routed WIP placeholder
  that now has a shipped sibling; M1 step 5 owes it a ruling.
