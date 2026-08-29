# Season calendar & fixture generation

Type: grilling

Status: resolved

## Question

Decide the season/calendar structure for v1: number of clubs in the single fictional league, how many
fixtures each club plays (round-robin home/away?), how the calendar advances (day-by-day, week-by-
week, or jump-to-next-fixture), whether any mid-week cup competition exists in v1, and how fixture
scheduling interacts with the transfer window(s). This defines the season/calendar commands and
events the event-sourced engine needs.

## Answer

- 20 clubs, fixed membership (no promotion/relegation).
- Double round-robin: 38 fixtures per club per season (home & away vs every other club).
- No cup competition in v1 (out of scope).
- Calendar advances by "jump to next fixture" — no day-by-day clock, since v1 has no
  training/scouting/press content to fill non-match days. Atomic unit of advance is the next
  scheduled event: a Matchday's fixtures, or a Transfer Window open/close.
- Two transfer windows per season: pre-season (open until Matchday 1) and mid-season (opens after
  Matchday 19, closes when Matchday 20 is due — exact halfway point). Transfer commands illegal
  outside an open window. No deadline-day mechanic.
- Each new season's fixture list is a freshly shuffled double round-robin among the same 20 clubs —
  no seeding by prior-season standings.
- League table tie-break order: points → goal difference → goals scored. Head-to-head is not used.

Vocabulary recorded in [CONTEXT.md](../../../CONTEXT.md) under "Season & calendar"; architecture
rationale in [ADR-0004](../../../docs/adr/0004-fixture-driven-calendar-no-day-clock.md).
