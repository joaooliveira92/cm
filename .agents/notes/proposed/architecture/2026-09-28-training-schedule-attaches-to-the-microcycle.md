# Agent Note: The training schedule attaches to the microcycle, not to a clock

Status: proposed

## Problem

A training schedule plans sessions across a stretch of time. The Calendar has no stretch to offer:
it jumps from one scheduled event to the next (a Matchday, or a Transfer Window boundary), and
`CONTEXT.md` says "there is no training or press content to occupy a date with no Fixture". A
schedule is exactly that content, so either the clock grows finer or the schedule attaches to
something the clock already has.

## Proposal

The schedule attaches to the **microcycle**: the interval from the club's last played Matchday to its
next Fixture. The microcycle is derived from the Fixture list whenever it is needed and is never
stored as dates. The schedule is a fixed number of session slots per microcycle, so a short gap and a
long gap are planned the same way.

The Calendar is unchanged. It still advances only by jumping to the next event. `CONTEXT.md`'s
Calendar entry is amended, when the schedule ships, from "no training content" to "training content
attaches to the microcycle between Matchdays, not to a date".

Ruled by the human on 2026-09-28.

## Alternatives considered

- **A weekly clock.** Seven-day weeks with sessions per day. Rejected: it needs the Calendar to stop
  or tick between Matchdays, which is the calendar re-engineering the jump-to-event model exists to
  avoid, and a week with no Fixture has nothing to show.
- **A per-Season schedule.** One plan for the whole Season. Rejected: it cannot respond to a
  congested run or a free week, which is the decision the feature exists to offer.

## Acceptance criteria

- No day or week counter is added to the Season or the Calendar.
- The schedule's slot count does not depend on the microcycle's length.

## Risks

- A long gap (an international break, a winter pause) and a three-day gap get the same number of
  slots, so the plan reads the same for both. Between-match recovery is a fixed seven-day step per
  Matchday today, whatever the real gap, and the schedule's modifier multiplies that step. Making
  recovery follow the real gap would change every existing career's Condition, so it is a separate
  decision, not part of this one.
