# 01 - The Calendar's unit, and what Transfer Windows are defined against

Type: grilling
Status: claimed

## Question

`CONTEXT.md` defines Matchday as "the League-wide round number (1–38)", "the unit the calendar
advances by and the unit Transfer Window boundaries are defined against — never a calendar date". With
concurrent competitions of different lengths, a single global Matchday number no longer identifies a
point in time.

Charting settled that the Calendar becomes **date-bearing**. This ticket decides what that means
concretely, and what it costs:

- What a Fixture carries: a real date, or a date plus a competition-local round number? What calendar
  does a season run on — a fixed August-to-May shape per nation, or one shape for all nations in MVP?
- What Continue advances to: the next date carrying any fixture in any *playable* competition, or any
  fixture at all including background ones? What happens to a date with fixtures the human's club is
  not in?
- What Matchday means afterward, in the glossary and in the schema. It survives as a round number
  within one competition, but `season.current_matchday` and `fixtures.matchday` both currently mean
  the global thing.
- What Transfer Windows become: date ranges per nation (which is how they really work) or one global
  pair of dates. `CONTEXT.md` currently defines them against Matchday 1 and Matchday 19/20.
- Whether the `season` table stays a per-save singleton or becomes per-competition.

This is the largest ripple in the effort: it touches `season`, `fixtures`, `transfers.ts`, the
Continue loop, and the Board Objective's season boundary. Resolving it does not require knowing the
competition graph's shape, which is why it goes first.

Overturns recorded decisions in `CONTEXT.md` (Matchday, Calendar, Transfer Window). Reconcile the
glossary in the same change.
