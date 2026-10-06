# 05 — Screen 18: what a local Game Status screen contains

Type: grilling
Status: resolved
Blocked by: 03

## Question

Spec 18 is a technical overview of the active career. After the trim removes multiplayer, cloud sync,
worker counts, and memory budgets, what is actually left worth showing — and is a screen still warranted?

Candidates that survive on their face: career date and season, save identity, world entity counts
(clubs, players, staff, competitions), application version, save schema version, and whether the save is
sacked-and-archived.

The open questions are whether any of that is information a player wants, or only information a
developer wants; whether the `GameStatusSnapshot` shape survives at all given there is no async refresh
race to defend against once the data is a synchronous read of the save; and whether the safe-diagnostic
copy action has a purpose in a local app with no support channel to paste into.

A defensible answer here is "this screen does not survive the trim" — it lands in Out of scope with a
reason rather than being built thin.

## Answer

**Screen 18 is out of scope; survivors redistributed.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-30-game-status-screen-removed.md).

## Done when

Either the screen's content and data source are specified, or it is ruled out of scope with the
reasoning recorded.