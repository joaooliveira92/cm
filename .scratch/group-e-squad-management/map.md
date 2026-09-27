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

- [01 — Screen inventory](issues/01-screen-inventory.md): All 11 screens surveyed. 4 satisfied (69, 70, 72, partially 71), 2 partial (71, 77), 6 out-of-scope (73-76, 78-79).
- [02 — Status filter](issues/02-status-filter.md): Squad gets a Status filter beside Position, offering only modelled statuses (Tired) and matching via `statusesOf`. Each dropdown clears only its own clause; URL form `status:Tir`.

## Not yet specified

Screen 71's attribute half is [ticket 03](issues/03-attribute-filters.md) (`needs-triage`): it needs a knowledge-boundary ruling before it can be built. The status half shipped as ticket 02. Existing squad features are otherwise shipping.

## Out of scope

- **Multiplayer, network sessions, multiple human managers** — inherited from Group A.
- **Worker pools, memory budgets, resource tuning** — inherited from Group A.
- **Off-device telemetry, crash reporting** — inherited from Group A.
- **Non-normative import scaffolding** — inherited from Group A.