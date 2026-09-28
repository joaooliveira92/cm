# Agent Note: Delegated scheduling is a fixed rule; the Assistant Manager stays Presence Staff

Status: proposed

## Problem

Delegating the schedule to the Assistant Manager asks what makes a delegated schedule good or bad.
If the assistant's quality should matter, the assistant has to become Bound Staff: a stored row, a
quality, and `assistant` added to the `staff_role` CHECK, which is a DB schema change. Today the
assistant is Presence Staff, derived from the world seed with a name and a role and nothing else.

## Proposal

The assistant stays Presence Staff. No row, no quality, no schema change. A delegated schedule comes
from one uniform **Best Practice rule**: a pure, deterministic function in `packages/shared` from the
next Fixture's context (the length of the microcycle, whether another Fixture follows close behind,
and the squad's mean stored Condition) to one of the named templates. Every assistant in the world
applies the same rule, so which club you take does not change how well your assistant plans.

`CONTEXT.md`'s Presence Staff entry, which lists only the President and the Physio, gains the
Assistant Manager when delegation ships. The Staff Profile becomes the surface that reads the
assistant for delegation.

Ruled by the human on 2026-09-28.

## Alternatives considered

- **Promote the assistant to Bound Staff with a quality.** Quality would decide how often the
  assistant picks the template the rule rates best. Rejected for now: it needs a schema change and
  state persistence for a first version that works without them. A later ticket can add it on top of
  the same rule.

## Acceptance criteria

- No migration, table or CHECK changes for the assistant.
- The same inputs always give the same template.

## Risks

- Every club's delegated plan is equally good, so delegation is a convenience, not a trade-off. That
  is accepted for the first version.
