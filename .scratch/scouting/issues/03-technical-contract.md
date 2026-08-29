# Scouting technical contract: events, Club Decider extension, RPC surface

Type: grilling
Status: resolved

## Question

With the resource/assignment model (ticket 01) and the progress/range computation (ticket 02) settled,
design the technical contract:

- Confirmed during charting: Scouting Assignments and Scouting Progress live on the existing Club
  Decider (club-scoped stream, alongside Contracts/Budgets) — no new Decider. What events does it
  emit (e.g. `ScoutAssigned`, `ScoutUnassigned`, `ScoutingProgressed`)? Does Progress advance via an
  event emitted once per elapsed Matchday (reacting to the Calendar/Season Decider the way
  Player Development already reacts to `SeasonConcluded`), or is it computed on read from
  "Matchdays elapsed since assignment start minus paused spans" with no per-Matchday event at all?
- What new read model surface does `squad_view`-equivalent or a new `scouting_view` need to serve the
  Scouting screen (ticket 04) and the Attribute-Range-aware rendering on the Transfers screen?
- What new RpcGroup methods does the renderer need (e.g. `assignScout`, `unassignScout`,
  `getScoutingStatus`)? Does the existing Transfers-screen query (player list/detail) need to change
  shape to carry Attribute Range instead of/alongside exact Attributes for unscouted players, or is
  that a separate query?
- Confirm the Wage/Transfer Budget precedent doesn't apply here (Scouts aren't a spend-down Credits
  pool, per ticket 01) — are there any invariants the Club Decider needs to enforce (e.g. assignment
  count never exceeds the club's Scout count)?

Blocked by: 01-scout-resource-and-assignment-model, 02-progress-accrual-and-attribute-range

## Answer

**Progress advances via a batched `ScoutingProgressed` event per club, hooked into the existing per-Matchday `MatchdayResolved` branch of `advanceCalendar` (stored/incremented, not computed-on-read, since Matchday numbering resets every Season with no rollover yet); two new tables (`scouting_assignments`, `scouting_progress`) with different lifecycles; `AssignScout`/`UnassignScout` mirror `setTrainingFocus`'s command shape with app-level invariant checks (Scout-count cap, no own-squad target, no duplicate assignment); `MarketPlayerView` gains nullable `overallRatingRange`/`transferValueRange`, no per-attribute range exposed this milestone; new `ScoutingScreenView`/`getScoutingStatus` RPC for the Scouting screen.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-28-scouting-technical-contract.md).
