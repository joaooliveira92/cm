# Agent Note: A career destination is top-level when the navbar reaches it

Status: proposed

Settles `desktop-suite-red` decision request 01.

## Problem

`CAREER_SCREEN_TYPES` (`renderer/navigation/destinations.ts:132`) holds 22 of the `CareerDestination`
union's 45 members, and **no written criterion matches the actual contents**.

`desktop-suite-red` ticket 06 made the classification compulsory — every union member must be listed
either in `CAREER_SCREEN_TYPES` or in the sub-surface record, or `typecheck` fails. That closed a real
gap, where a forgotten screen silently weakened four tests. But a compiler can only force a *choice*; it
cannot check the choice is right. Someone adding a screen has no rule to apply, so they copy whichever
neighbour looks similar, and the list drifts exactly as the frozen literals it replaced drifted.

Both obvious criteria are false:

- **"It has a `g <key>` binding."** Seven `g` nav actions resolve to six destinations. Sixteen of the 22
  have no binding, so the criterion does not separate the list from its complement.
- **"It is a navbar item."** Six sub-surfaces are first-class `NavItem`s sitting beside entries that
  *are* top-level — `transferHistory`, `contractExpiry`, `budgetReview`, `scoutingAssignment`,
  `scoutingKnowledge` and `trainingCoaching`.

## Decision

**A career destination is top-level when the navbar can reach it from anywhere with a save loaded.**
*(Option A.)*

The six contested screens move into `CAREER_SCREEN_TYPES`, 22 → 28. Sub-surfaces become exactly: the
things needing a second entity (`playerId`, `clubId`, `matchId`), the match-context screens, and the
ones reached only from another screen.

The reason is that the six behave identically to their top-level siblings from a manager's point of
view — same navbar, same single action, same persistence across a career. Classing them as sub-surfaces
is a statement about how they were *built* (added later, hung off an existing hub) rather than about what
they *are*, and that distinction decays the moment the person who made it moves on.

**It also turns ticket 06's guard from "forces a choice" into "checks the choice"**, which is the only
version that stops the list drifting again: a test can derive the expected set from `nav-config.ts`.

The array's doc comment about `g <key>` bindings is rewritten, since it describes a criterion this note
rejects.

Decided by the agent on 2026-09-19 under the human's standing delegation ("i need you to solve the
decisions"), adopting the request's recommendation.

## Alternatives considered

**Option B — top-level means "has, or is eligible for, a `g` binding."** Rejected: "eligible" is
judgement unless enumerated, which is the same problem wearing a different hat, and it makes
`CAREER_SCREEN_TYPES` a keyboard concept while three of its consumers use it as a navigation one.

**Option C — split the concept into two derived lists** (navbar-reachable from `nav-config.ts`, `g`-bound
from `ALL_ACTIONS`), deleting `CAREER_SCREEN_TYPES` and ticket 06's guard as redundant. Strictly better
and strictly more expensive.

**C is now cheaper than this request assumed, and that is worth recording.** The request was written
before `navbar-keyboard-intent` shipped. Tickets 02–04 since made section `g <n>` keys derive from
`NAV_SECTIONS`, deleted `CAREER_G_BINDINGS`, and established that a section's `g <n>` may only sit on that
section's own action. So `nav-config.ts` is already the derivation source for the keyboard spine — half of
C's work is done. Take C the next time someone is in `nav-config.ts` for other reasons.

## Consequences

- Six destinations move into `CAREER_SCREEN_TYPES`; the sub-surface record loses them.
- A test derives the expected set from `nav-config.ts`, so ticket 06's guard checks rather than merely
  forces. That is the change that makes this decision durable rather than another hand-kept list.
- The doc comment at `destinations.ts:130` is rewritten.
- Option C is the end state, and its remaining half is smaller than when the question was asked.
