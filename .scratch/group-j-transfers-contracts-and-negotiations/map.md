# Map: Group J — Transfers, Contracts and Negotiations

Label: `wayfinder:map`

## Destination

A reconciled spec covering all 15 Group J screens (132-146): transfer centre, incoming transfer offer,
make transfer offer, transfer negotiation, loan offer and negotiation, player contract offer, player
contract negotiation, staff contract offer and negotiation, contract renewal, contract expiry and Bosman
status, transfer completion and registration, transfer cancellation and withdrawal, transfer clauses and
installments, transfer budget and wage budget review, transfer history and audit trail. It states per
screen what is already built, what is in scope for v1, and in what order the in-scope screens get built.

## Notes

- Screen specs are copied into this directory (`00_group_j_index.md`, `132_*.md` to `146_*.md`).
- CONTEXT.md § Transfers & contracts (around line 502) is binding vocabulary.
- The transfer market already exists (`renderer/transfers/`, RPCs `getTransfersScreen`, `placeBid`,
  `respondToBid`, `respondAsBidder`, `signFreeAgent`, `renewContract`). Inventory before assuming absence.
- Group I's [decision request 01](../group-i-scouting-and-recruitment/decision-request-01-knowledge-limited-player-reads.md)
  (knowledge-limited Player reads) bears directly on any Group J screen that shows another club's Player.
- Follow the [Group I](../group-i-scouting-and-recruitment/map.md) precedent: inventory, scope, build
  sequence, then spec and tickets.

## Decisions so far

- [01 — Group J screen inventory survey](issues/01-screen-inventory.md): 0 built, 6 partial, 9 absent, all working UI on one Transfers screen. Six screens contradict CONTEXT.md's single-round Bid and never-renegotiated Contract, and the market shows exact figures for other clubs' Players.
- [02 — Scope decision for missing systems](issues/02-scope-absent-screens.md): 4 own-club screens in v1 (140, 141 without Bosman, 145, 146), 11 deferred. See [Agent Note: Group J v1 scope](../../.agents/notes/proposed/architecture/2026-09-15-group-j-v1-scope.md).
- [03 — Build sequence](issues/03-partial-screen-build-sequence.md): 1=Contract Renewal, 2=Contract Expiry, 3=Budget Review, 4=Transfer History.
- [Spec published](spec.md): reconciled spec, handoff from charting to slicing.
- [Implementation tickets](issues/): 4 vertical slices (04-07), all unblocked.

## Not yet specified

None for v1.

## Out of scope

- Screens 132 (Transfer Centre), 134 (Make Transfer Offer), 137 (Player Contract Offer): show other clubs' Players; wait for Group I's decision request 01.
- Screens 135 (Transfer Negotiation), 136 (Loan Offer), 138 (Player Contract Negotiation), 139 (Staff Contract Offer), 144 (Clauses and Installments), and 141's Bosman and pre-contract part: contradict CONTEXT.md (single-round Bid, no loans, never-renegotiated Contract, no Staff wages). Need a domain change a human makes.
- Screens 133 (Incoming Transfer Offer), 142 (Completion and Registration), 143 (Cancellation and Withdrawal): already served by the Transfers screen's Bid tables; a dedicated screen needs clause, registration or cancellation models.
