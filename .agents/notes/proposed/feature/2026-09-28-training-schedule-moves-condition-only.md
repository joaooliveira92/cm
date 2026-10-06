# Agent Note: The training schedule moves Condition only, never development

Status: proposed

## Problem

A schedule could shape two things: short-term Condition between matches, or long-run Attribute
growth. Growth is Player Development, which reads the standing Training Focus once at Season
conclusion, and `CONTEXT.md` states that "no duration, history or partial credit accrues". A schedule
that fed development would need per-microcycle accrual and would overturn that rule.

## Proposal

The schedule changes between-match Condition recovery and nothing else. Training Focus, the Coach,
Technical Coaching and Player Development are untouched, and the read-once rule stands.

- Each session type and intensity carries a fixed recovery weight in `packages/shared`. A schedule's
  weights combine into one **schedule recovery modifier**, a multiplier on between-match recovery.
- The modifier is bounded to a narrower band than the Regimen Manager Pillar's recovery range
  (0.8 to 1.2), so no schedule moves recovery as far as the Pillar does.
- The generated default template, **Balanced**, has a modifier of exactly 1: a career that never
  opens the schedule recovers exactly as it does today.
- AI clubs have no schedule and recover at a modifier of 1.

Ruled by the human on 2026-09-28.

## Alternatives considered

- **Condition and development.** Each resolved microcycle adds a per-Category development weight,
  summed at Season conclusion. Rejected: reversing the read-once rule risks the progression engine
  for a first version that can be meaningful on Condition alone.

## Acceptance criteria

- Player Development's output for a Season does not depend on any schedule.
- The Balanced template leaves every player's Condition exactly as it is without a schedule.
- The schedule recovery modifier stays inside its band for every possible schedule.

## Risks

- `CONTEXT.md` says Regimen modifies between-match recovery, but at HEAD no recovery code reads it:
  the Pillar is snapshotted at kickoff and between-match recovery applies no Pillar modifier. The
  band still holds by construction; the comparison with Regimen becomes live once that gap is fixed.
