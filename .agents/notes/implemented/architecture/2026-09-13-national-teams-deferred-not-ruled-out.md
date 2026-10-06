# Agent Note: National teams are deferred, not ruled out

Status: implemented

## Problem

**Nationality** in CONTEXT.md said "work permits and national teams do not exist". Group A's Club
Selection ledger ruled the National Teams mode out of that effort's scope. Neither says whether the
exclusion is permanent, so Group O (National Team Management, 208–221) and Group L's national-team
screens (176–178) could not be reconciled: `out-of-scope` and `deferred` mean opposite things in a
ledger.

## Decision

**Deferred, unscheduled.** National teams are not modelled and nothing plans them. They are not ruled
out of the game. When Group O and Group L 176–178 are reconciled, their rows are `deferred` with the
anchor `unscheduled`, not `out-of-scope`.

CONTEXT.md's **Nationality** entry now reads "are not modelled", so nobody takes an MVP clause for a
permanent ruling.

The decision was made by the agent on 2026-09-13 under the human's explicit delegation ("i authorize
you to decide").

## Alternatives considered

- **Out of scope for this game, disposed in full like Group R.** Rejected. Unlike the multiplayer
  axis, nothing in shipped code or recorded decisions conflicts with national teams, so a permanent
  ruling would be a product call made without a reason.

## Consequences

- No work is scheduled. The roadmap keeps Group O in its last tier.
- Building national teams later needs international fixtures in the Calendar, eligibility (a second
  Nationality per player), and club-release rules, which is a new effort with its own map. A second
  Nationality would need a save migration.
