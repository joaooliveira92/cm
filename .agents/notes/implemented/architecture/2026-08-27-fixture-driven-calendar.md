# Agent Note: The calendar advances by Matchday, not by calendar date

Status: implemented

> Migrated from ADR-0004 when the numbered ADR layer was retired.

## Problem

The Calendar could have been a day-by-day clock, as in real-world football sims, with the player
advancing one simulated day at a time and Fixtures and Transfer Window boundaries falling on specific
dates. Choosing between that and an event-driven calendar determines the entire event vocabulary, so it
had to be settled before any calendar event was named.

## Decision

The Calendar's only unit of advance is the next scheduled event: a Matchday's Fixtures, or a Transfer
Window opening or closing. Matchday (1–38) is a League-wide round number, not a date. Transfer Window
boundaries are defined against Matchday number — pre-season until Matchday 1, mid-season after Matchday
19 until Matchday 20 — rather than a calendar date.

A day-by-day clock was rejected for v1 because training, scouting, and press are all out of scope, so a
day with no Fixture has no player-facing content. The clock would produce empty "next day" clicks with
nothing to show. The event-driven calendar is a smaller surface to build and keeps the event-sourced
vocabulary — `MatchdayReached`, `TransferWindowOpened`, `TransferWindowClosed`, `SeasonEnded` — free of
a real-calendar concept the game never needs.

### Fixture generation and tie-breaks

Each Season's Fixture list is regenerated from scratch as a shuffled double round-robin, with no seeding
by the prior Season's League Table, because there is no promotion, relegation, or qualification bracket
to seed against — the League's 20 clubs are a fixed set.

League Table tie-breaks stop at points, then goal difference, then goals scored. Head-to-head is
deliberately omitted as a rare edge case not worth a separate per-pair-result derivation for v1.

## Alternatives considered

- **A day-by-day calendar clock.** Rejected for v1: with training, scouting, and press out of scope,
  most days have no content, so advancing a day at a time is empty interaction.
- **Head-to-head as a League Table tie-break.** Rejected: it requires deriving per-pair results for a
  situation that rarely decides anything.

## Consequences

- No event in the system carries a real-world date.
- Reintroducing calendar dates later — if training or press are added — means retrofitting a date onto
  every existing Matchday-keyed event. That is a real but bounded cost, accepted as a deferral rather
  than built speculatively.
- Transfer Window logic is expressed in Matchday arithmetic, which is exact and needs no date library.
