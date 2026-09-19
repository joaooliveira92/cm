# Decision Request: Can a Contract be renewed while it still has years to run?

## Question

May the manager renew a Player's Contract at any time the Transfer Window is open, or only once the
Contract is in its last contracted year?

## Why this is blocking

Domain ambiguity with player-visible consequences, a stop condition. CONTEXT.md (Contract) says a
Contract's terms are "set identically at first signing or at renewal. Never renegotiated mid-term." The
`renewContract` handler (`apps/desktop/src/main/transfers/commands.ts`) checks only the window, the
Player's club and the Wage Budget: it replaces wage, length and `signed_season` on any own-club Contract.
The existing test `renewContract reuses the signing flow against the player's current club`
(`apps/desktop/test/main/transfers/transfers.test.ts`) renews a freshly generated Contract, so it encodes
the permissive reading.

Ticket 04 would make renewal reachable from the Player Contract screen for the first time. Under the
permissive reading, renewing resets a Player's wage to today's formula figure mid-term, which is what
"never renegotiated mid-term" appears to forbid. Picking either reading means changing a tested rule or
shipping a UI that may contradict the glossary.

## What is already settled

- CONTEXT.md: Contract (1-5 years, formula wage, never renegotiated mid-term), Free Agent (Contract
  expired at the start of the Season after its last contracted year), Bid (single-round).
- `expireContractsForSeason` decrements `years_remaining` at Season conclusion and frees a Player at 0.
- [Group J v1 scope](../../.agents/notes/proposed/architecture/2026-09-15-group-j-v1-scope.md): no v1 ticket changes a CONTEXT.md rule.

## Options

### Option A — Renewal only in the last contracted year

- **What the player experiences**: a Renew action appears only for Players about to become Free Agents,
  which pairs with the Contract Expiry screen (ticket 05).
- **What it costs to build**: a years-remaining check in `renewContract` with a new tagged error, the
  existing test changed to renew an expiring Contract, and the UI hides or disables the action otherwise.
- **What it forecloses**: locking a rising Player into a long Contract early.
- **Save compatibility**: none needed.

### Option B — Renewal at any time; clarify the glossary

- **What the player experiences**: the manager can renew whenever the window is open; the wage resets to
  the formula figure each time.
- **What it costs to build**: nothing in code; CONTEXT.md reworded so "renegotiated" means changing terms
  without renewing.
- **What it forecloses**: nothing, but renewal becomes a way to cut a declining Player's wage.
- **Save compatibility**: none.

## Recommendation

Option A. It is the plain reading of "never renegotiated mid-term", it gives the Contract Expiry screen
its purpose, and it closes the wage-cutting loophole Option B opens.

## What is blocked, and what is not

- Blocked: ticket 04 (Contract Renewal). The implementation, reviewed and approved on standards, is kept
  as [ticket-04-contract-renewal.patch](ticket-04-contract-renewal.patch) and applies cleanly to
  `8a7c38e`; under Option A it needs the years-remaining check added.
- Proceeding meanwhile: tickets 05 (Contract Expiry), 06 (Budget Review), 07 (Transfer History).

---

## Answer — Option A, 2026-09-19

**A Contract may be renewed only in its last contracted year.** The plain reading of "never renegotiated
mid-term", and two consequences matter as much as the rule: it gives the Contract Expiry screen (141) its
purpose, and it closes the wage-cutting loophole — a mid-term renewal at today's formula figure is a wage
renegotiation by another name, and it runs one way, since a manager only takes it when the number has
fallen.

**The existing test inverts with the rule.** `renewContract reuses the signing flow against the player's
current club` currently encodes the permissive reading against a freshly generated Contract; it must
assert the refusal, and a new test must cover the permitted last-year case. A tested rule is still a rule.

Option B was rejected because it requires striking "never renegotiated mid-term" from `CONTEXT.md`, and
that sentence is load-bearing — it is why there is no contract-negotiation subsystem in v1 and why Screens
137–139 are deferred on the same clause.

**Ticket 04 unblocks and is the cheapest screen in the backlog**: the implementation is written, reviewed
and held as a patch. It needs the last-year guard, a typed refusal on `renewContract`'s declared union,
and the test change.

Recorded as
[a Contract renews only in its last contracted year](../../.agents/notes/proposed/feature/2026-09-19-a-contract-renews-in-its-last-year.md).
Decided under the human's standing delegation ("i need you to solve the decisions").
