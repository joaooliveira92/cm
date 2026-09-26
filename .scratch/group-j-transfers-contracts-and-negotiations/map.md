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
- [04 — Contract Renewal](issues/04-contract-renewal.md): resolved 2026-09-21 (`f60a3093`). The Player Contract screen renews an own-club Player's Contract for a chosen length; a Contract renews only in its last contracted year, per [decision request 01](decision-request-01-when-a-contract-can-be-renewed.md), and a mid-term press gets `ContractRenewalNotDueError`'s sentence.
- [05 — Contract Expiry](issues/05-contract-expiry.md): resolved. Screen 141 shipped 2026-09-15.
- [06 — Budget Review](issues/06-budget-review.md): resolved. Screen 145 shipped 2026-09-15.
- [07 — Transfer History](issues/07-transfer-history.md): resolved. Screen 146 shipped 2026-09-15 on
  its own route `career/$saveId/transfer-history`, leaving the club-scoped stub alone. See
  [Agent Note](../../.agents/notes/implemented/architecture/2026-09-15-transfer-history-takes-its-own-career-route.md).
- [08 — Navbar entries for 141 and 145](issues/08-navbar-entries-for-141-and-145.md): resolved
  2026-09-16. All three v1 screens are in the Recruitment submenu with `g 4 <key>` bindings; the
  submenu strip now scrolls, since ten entries overflow the default window.
- [Decision request 02](decision-request-02-club-scoped-transfer-history-index.md): open. Whether the
  save takes two more indexes for the club-scoped `player_transfers` read. Raised by 07, which ships
  without them.
- [09 — The Player Contract Offer reads by Scouting Progress](issues/09-player-contract-offer-reads-by-scouting-progress.md): sliced 2026-09-23 from [Group I decision request 01](../group-i-scouting-and-recruitment/decision-request-01-knowledge-limited-player-reads.md), now answered and shipped (group-i 09/10). 137 was out of scope only pending that decision; it is now buildable. See the ticket.
- [09 — The Player Contract Offer reads by Scouting Progress](issues/09-player-contract-offer-reads-by-scouting-progress.md): resolved 2026-09-26. Screen 137's offer terms are a read, not a form's guesswork: the shared `progressForReading` rule now has one loader (`club/scoutingProgress.ts`) behind all seven Player reads, and `knowledge-agreement.test.ts` holds them to equal *values* for one Player rather than to equal shapes. `signFreeAgent` takes role, length and wage and the signing lands the Player in the squad. Two things the ticket could not settle, both escalated rather than decided here: the wage band contradicts ADR-0005's wage clause and CONTEXT.md (see [decision request 03](decision-request-03-is-a-wage-offered-inside-a-knowledge-band.md)), and the signed Role rides the event payload with no projection to read it, because persisting it needs a column and there is no save migration path ([ticket 32](../group-g-match-day/issues/32-saves-need-a-migration-path.md)).
- [Decision request 03](decision-request-03-is-a-wage-offered-inside-a-knowledge-band.md): open, raised by 09. Whether an offered wage is a formula figure the manager confirms or a band he picks inside. Blocks the prose (ADR-0005, two CONTEXT.md entries), not the queue.

## Not yet specified

None for v1.

## Out of scope

- Screens 132 (Transfer Centre) and 134 (Make Transfer Offer): served by the shipped Transfers screen's market and Bid composer, which read by Scouting Progress since group-i ticket 09. Screen 137 is [ticket 09](issues/09-player-contract-offer-reads-by-scouting-progress.md), not out of scope.
- Screens 135 (Transfer Negotiation), 136 (Loan Offer), 138 (Player Contract Negotiation), 139 (Staff Contract Offer), 144 (Clauses and Installments), and 141's Bosman and pre-contract part: contradict CONTEXT.md (single-round Bid, no loans, never-renegotiated Contract, no Staff wages). Need a domain change a human makes.
- Screens 133 (Incoming Transfer Offer), 142 (Completion and Registration), 143 (Cancellation and Withdrawal): already served by the Transfers screen's Bid tables; a dedicated screen needs clause, registration or cancellation models.
