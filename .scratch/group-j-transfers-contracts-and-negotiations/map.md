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

## Not yet specified

- Which in-scope screens show other clubs' Players, and so wait on Group I's decision request 01.

## Out of scope
