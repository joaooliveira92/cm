# Map: Group E — Squad Management

Label: `wayfinder:map`

## Destination

A reconciled spec covering all 11 Group E screens (69-79) — squad selection, view selector, filters, sorting, shirt numbers, captaincy, set-piece takers, registration, availability/eligibility, player interaction, team meeting/discipline — stating per screen what to build or dispose.

## Notes

**Several screens may already be satisfied or out of scope:**

- **Squad screen** is partially built (table, columns, positions, condition, training focus column). Selection, filters, sorting exist inline.
- **Captain/Set-pieces** — no system exists.
- **Player interaction/grievances, team meeting/discipline** — no morale, discipline, or meeting system exists.
- **Shirt numbers** — no squad number model.
- **Squad registration, eligibility** — no system exists.

Inherited from Group A: multiplayer axis out of scope, worker pools out of scope, telemetry out of scope.

## Decisions so far

<!-- one line per closed ticket -->

## Not yet specified

- Which screens are satisfied by existing Squad screen (selection, filters, sorting views).
- Which screens are out of scope (captain, set-pieces, grievances, discipline, meetings, shirt numbers, registration, eligibility).
- Whether any screens need new surfaces beyond the existing Squad screen.

## Out of scope

- **Multiplayer, network sessions, multiple human managers** — inherited from Group A.
- **Worker pools, memory budgets, resource tuning** — inherited from Group A.
- **Off-device telemetry, crash reporting** — inherited from Group A.
- **Non-normative import scaffolding** — inherited from Group A.