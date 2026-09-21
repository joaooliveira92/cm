# Agent Note: A Contract renews only in its last contracted year

Status: implemented

Settles group-j decision request 01, which blocks a screen that is already built.

## Problem

`CONTEXT.md` (**Contract**) says a Contract's terms are "set identically at first signing or at renewal.
Never renegotiated mid-term."

The `renewContract` handler (`main/transfers/commands.ts`) checks only that the Transfer Window is open,
that the Player is at the manager's club, and that the Wage Budget allows it. It then replaces wage,
length and `signed_season` on **any** own-club Contract. The existing test `renewContract reuses the
signing flow against the player's current club` renews a freshly generated Contract, so the permissive
reading is not merely possible — it is encoded in a passing test.

Group J ticket 04 would put this behind a button on the Player Contract screen for the first time. Under
the permissive reading, renewing resets a Player's wage to today's formula figure mid-term, which is
what "never renegotiated mid-term" appears to forbid — and which is exploitable in one direction: a
manager can cut a declining player's wage years early.

## Decision

**A Contract may be renewed only in its last contracted year.** *(Option A.)*

It is the plain reading of "never renegotiated mid-term", and the other two consequences matter as much
as the rule:

- **It gives the Contract Expiry screen (141) its purpose.** A screen listing expiring Contracts is only
  useful if expiry is the moment something must be done. Under the permissive reading it is a list of
  things you could have done at any time.
- **It closes the wage-cutting loophole.** A mid-term renewal at today's formula figure is a wage
  renegotiation by another name, and it runs one way, since a manager only takes it when the number has
  fallen.

**The existing test changes with the rule.** It currently encodes the permissive reading against a
freshly generated Contract; it must assert the refusal instead, and a new test must cover the permitted
last-year case. A tested rule is still a rule, and changing one means changing its test deliberately
rather than discovering it broke.

Decided by the agent on 2026-09-19 under the human's standing delegation ("i need you to solve the
decisions"), adopting the request's recommendation.

## Alternatives considered

**Renewal at any time; amend the glossary (Option B).** Rejected. It requires striking "never
renegotiated mid-term" from `CONTEXT.md`, which is a load-bearing sentence — it is why there is no
contract-negotiation subsystem in v1 at all, and Group J's screens 137–139 are deferred on the same
clause. Changing it to permit renewal would reopen that. And it keeps the wage-cutting loophole, for
which nobody offered a reason.

**Permit renewal at any time but freeze the wage at the existing figure.** Considered and rejected as
worse than both: it satisfies the letter of "never renegotiated" while making renewal pointless, since
the only thing renewal would change is length.

## Consequences

- **Group J ticket 04 unblocks.** Its implementation was reviewed and approved on standards and is held
  as a patch; it needs the last-year guard added and the test changed, then it ships. This is the
  cheapest screen in the backlog — the work is done.
- `renewContract` gains a refusal, which needs a typed error on its declared union rather than a bare
  failure — see [infrastructure failures are defects](../../proposed/architecture/2026-09-19-infrastructure-failures-are-defects-domain-failures-are-typed.md)
  for why the union matters.
- One existing test inverts; one is added.
- The **Contract** entry in `CONTEXT.md` needs no change, which is the point: the code was wrong, not the
  glossary.
