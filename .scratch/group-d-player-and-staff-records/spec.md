# Group D: Player and Staff Records — Implementation Spec

Status: ready-for-slicing

## Scope

This spec covers Group D (Player and Staff Records) from the import at
[../../docs/specs/group_d_player_and_staff_records/](../../docs/specs/group_d_player_and_staff_records/).

19 screens charted and disposed. 11 out-of-scope, 3 satisfied-inline, 2 deferred,
3 needs-design. See [map.md](map.md) for full decision record and
[issues/](issues/) for individual ticket answers.

## Screens in scope (needs-design)

### Screen 50 — Player Profile

A dedicated player profile screen accessible from the Squad screen or any
player row. Needs:
- `getPlayerProfile(saveId, playerId)` RPC returning identity, attributes summary,
  positions, current contract, current club, injury status
- Route `player/$playerId/profile` replacing the current WIP placeholder
- Screen showing the player's core data at a glance

### Screen 56 — Player Contract

A contract detail panel or screen for a player. Needs:
- `getPlayerContract(saveId, playerId)` RPC returning wage, length, expiry,
  signing date
- Accessible from squad/player rows or dedicated route `player/$playerId/contract`

### Screen 61 — Player Development / Training Effects

A view of a player's development trajectory. Needs:
- Development progress display (attributes changing season to season)
- Training Focus display and management surface (setTrainingFocus RPC exists)
- Accessible from player context or dedicated route

## Screens satisfied-inline

- Screen 51 (Player Attributes): shown as toggleable squad table columns
- Screen 52 (Player Positions): shown in squad position list and table column
- Screen 53 (Player Form): out-of-scope (no match rating history model)

## Screens deferred

- Screen 55 (Player History): career timeline, related to Season Summary
- Screen 62 (Player Action Menu): unified context menu, deferred until action
  set stabilizes
- Screen 68 (Scout Report - Player): Team Scout Report exists; player scouting
  inline via Attribute Ranges

## Screens out-of-scope

See [map.md](map.md) Out of scope section for complete list of 11 disposed
screens.

## Charting completion

All 19 screens charted and disposed per decision tickets 01-04. Ready for
slicing into implementation tickets.

## Inherited axes

Same as Group A: multiplayer, worker pools, telemetry, non-normative scaffolding.