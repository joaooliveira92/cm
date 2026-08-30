# Player ratings and Transfer Value are derived projections

## Map

ADR-0001 already establishes the core position. This effort audits and hardens the implementation
and documentation without changing the architecture (the codebase is already compliant).

## Tickets

| # | Ticket | Status |
|---|--------|--------|
| 01 | Schema verification tests | ready-for-agent |
| 02 | Integration tests for post-mutation recomputation | ready-for-agent |
| 03 | Transfer Value command-boundary tests | ready-for-agent |
| 04 | Documentation hardening | ready-for-agent |

## Agent Note

`.agents/notes/proposed/architecture/2026-08-29-player-ratings-are-derived-projections.md`

## Decisions so far

No decisions to record — the audit confirmed zero violations. These tickets add test enforcement
and documentation clarity.