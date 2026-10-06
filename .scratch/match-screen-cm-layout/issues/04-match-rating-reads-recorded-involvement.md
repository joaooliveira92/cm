# The Match Rating reads the recorded involvement

Type: grilling
Status: resolved
Blocked by: 02

## Question

The Rat column is the CM table's anchor. The current Match Rating (`packages/shared/src/rules/matchRating.ts`)
was built when "no event names a save, a tackle or an assist", and its note set the follow-up: adopt
per-player involvement "when the engine is next opened". The engine now names assists, key passes,
saves, fouls and offsides. Does the rating take them in, with which weights, and what happens to
ratings of matches already committed?

## Answer

**Yes: the rating adds assists, key passes, saves, fouls and offsides as event weights, read from the
same Match Player Line fold; committed matches re-rate on read, by design.** See [Agent Note](../../../.agents/notes/proposed/feature/2026-10-03-the-match-rating-reads-recorded-involvement.md).
