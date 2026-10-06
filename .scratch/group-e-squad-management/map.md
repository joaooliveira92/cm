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
- [03 — Attribute filters](issues/03-attribute-filters.md): owned Squad only; one attribute from `ALL_ATTRIBUTES` at a time, at a minimum `N` from the 1–20 scale; a non-exact figure never matches. Built as [04](issues/04-attribute-threshold-filter.md).
- [04 — Attribute threshold filter](issues/04-attribute-threshold-filter.md): shipped 2026-09-28. `matchesAttribute` matches exact figures only, the URL form is `attr:pace:15`, and there are no palette rows (740 would be noise).

## Not yet specified

Screen 71's status and attribute halves have shipped (02, 04). Its other axes (team, availability, registration, selection, age, morale, contract, transfer, presets) are recorded in the ledger as not yet audited. Existing squad features are otherwise shipping.

## Out of scope

- **Multiplayer, network sessions, multiple human managers** — inherited from Group A.
- **Worker pools, memory budgets, resource tuning** — inherited from Group A.
- **Off-device telemetry, crash reporting** — inherited from Group A.
- **Non-normative import scaffolding** — inherited from Group A.