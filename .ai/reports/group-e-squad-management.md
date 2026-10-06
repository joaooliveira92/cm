# Validation Report: group-e-squad-management

## Ticket 04 — the attribute threshold filter, 2026-09-28

- Ticket closed: [04](../../.scratch/group-e-squad-management/issues/04-attribute-threshold-filter.md), built from the ruling in [03](../../.scratch/group-e-squad-management/issues/03-attribute-filters.md)
- What shipped: an Attribute filter on the owned Squad, one Attribute at a minimum from 1–20. Only exact figures match, and it round-trips through the URL as `attr:<key>:<min>`.

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` | exit 0. Six gates green; desktop 2349 of 2349. |
| e2e | `pnpm test:e2e` over the Squad-related specs | 27 passed (1.2m) |
| after the gate | `vitest run` list-state-storage + attribute-filter specs; `pnpm -C apps/desktop typecheck` | 37 of 37; clean. Covers the last-attribute-wins decode added after the gate run. |

Implemented and reviewed inline by the orchestrator. The review caught two things: the decoder could
yield two attribute clauses, and it restated the 1–20 bounds instead of using `ATTRIBUTE_MINIMUMS`.
Both were fixed before commit.
