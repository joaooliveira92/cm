# 17 — Screen 8: Manager Personal Details

Type: task
Status: open
Blocked by: 03

## Question

Screen 8 (`08_manager_personal_details.md`, 43 sections, 1,642 lines) describes a personal-details form: name input, validation, hot-seat privacy controls, name policy. The implementation is thin: a free-text manager-name `<input>` (with 1-char placeholder) inside `CreationStep1.tsx` (lines 82–104). The archetype/pillar controls in the rest of `CreationStep1.tsx` map to Manager Archetype (`CONTEXT.md`), a different concept — they are not Screen 8's content.

The blanket-trim rows (ticket 03) removed the hot-seat privacy and multiplayer policy sections. This ticket performs the `Reviewed` pass: read the implementation, write ledger rows for every section the implementation does not follow. No `unscheduled` rows.

**Distinguish**: the archetype picker and pillar sliders belong to Manager Archetype, a concept already decided in earlier tickets and recorded in `CONTEXT.md`. Do not re-audit them as Screen 8 content.

## Done when

Screen 8 has a `Reviewed` status in `RECONCILIATION.md` with rows for every section the implementation does not follow, and no `unscheduled` rows remain.