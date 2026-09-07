# 07 — Assemble the Group B spec and register

Type: grilling

Blocked by: 01, 02, 03, 04, 05, 06

## Question

Assemble the map's destination: a `spec.md` beside this map, covering all
eleven Group B screens, and a completed
[reconciliation ledger](../../../docs/specs/group_b_global_navigation_and_inbox/RECONCILIATION.md)
with no screen left at `Not yet audited`.

Specific obligations this ticket carries that no earlier ticket does:

- **Verify the blanket disposals landed, rather than writing them.** The charting-time whole-file
  rulings (screens 29 and 32), the non-normative import scaffolding, and the multiplayer axis are
  owned by [group-b-blanket-disposals](../../group-b-blanket-disposals/README.md), a prefactor that
  runs before the audits. This ticket confirms those rows exist and are anchored; it does not write
  them. If that effort has not run, it is a blocker on this ticket, not work to absorb.
- **Record the inherited axes that the prefactor did not cover.** Worker pools and memory budgets,
  off-device telemetry, and resignation with the job market still need rows on every screen they
  consume, pointing at the Group A decision rather than restating it.
- **Carry screen 23 by citation.** It is already `Reviewed`; the spec states its requirements from the
  two implemented Agent Notes and does not re-open it.
- **Update the Coverage table** so every status line is accurate and every `Reviewed` versus `Audited`
  distinction means what the ledger's own legend says it means.

The spec states what the implementation must do, per screen. It is not the import reorganized: where a
screen was disposed of, the spec says so in one line and points at the ledger.

Ready to hand to `/to-spec` → `/to-tickets` when done.

## Done when

- `spec.md` exists and covers all eleven screens.
- The ledger's Coverage table has no `Not yet audited` row.
- Screens 29 and 32 have their whole-file disposal rows with anchors, written by the prefactor and verified here.
- The map's Not-yet-specified section is empty or its remaining patches have become tickets.
