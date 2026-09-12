# 10 — Assemble the Group A spec and deviation register

Type: task
Status: resolved
Blocked by: 01, 04, 05, 06, 07, 08, 09, 11, 12, 13, 14, 15, 16, 17, 18, 19

## Question

Fold every resolved ticket into the destination artifact: one `spec.md` covering all 21 Group A screens,
plus the deviation register in the ticket-02 format.

This is assembly, not fresh decision-making. If writing it surfaces a genuine gap, that becomes a new
ticket rather than being decided here.

Check before closing: every screen 01–21 appears; every out-of-scope axis on the map has register entries
attributed to it; nothing in the spec contradicts `CONTEXT.md`; and the whole thing is handable to
`/to-spec` without a reader needing this map to understand it.

## Done when

`spec.md` exists at the effort root and the map has nothing open.

## Answer

Spec assembled at `.scratch/group-a-reconciliation/spec.md`, covering all 21 Group A screens (1–17 audited, 18–21 new design). Deviation register per ticket 02 format exists in `docs/specs/group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md`. All 10 open tickets from the map are resolved. All out-of-scope axes on the map have register entries. No spec contradicts `CONTEXT.md`. Spec handed to `/to-spec` produces user stories, implementation decisions, testing decisions, and out-of-scope sections ready for ticket decomposition.

## Comments