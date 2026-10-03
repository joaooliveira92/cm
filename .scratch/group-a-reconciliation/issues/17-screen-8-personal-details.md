# 17 — Screen 8: Manager Personal Details

Type: task
Status: resolved
Blocked by: 03

## Question

Screen 8 (`08_manager_personal_details.md`, 43 sections, 1,642 lines) describes a personal-details form: name input, validation, hot-seat privacy controls, name policy. The implementation is thin: a free-text manager-name `<input>` (with 1-char placeholder) inside `CreationStep1.tsx` (lines 82–104). The archetype/pillar controls in the rest of `CreationStep1.tsx` map to Manager Archetype (`CONTEXT.md`), a different concept — they are not Screen 8's content.

The blanket-trim rows (ticket 03) removed the hot-seat privacy and multiplayer policy sections. This ticket performs the `Reviewed` pass: read the implementation, write ledger rows for every section the implementation does not follow. No `unscheduled` rows.

**Distinguish**: the archetype picker and pillar sliders belong to Manager Archetype, a concept already decided in earlier tickets and recorded in `CONTEXT.md`. Do not re-audit them as Screen 8 content.

## Answer

Screen 8 is `contradicted` across its surviving content: the implementation (`CreationStep1.tsx`) provides only a single Manager name `<input>` with a 1-char placeholder and a "Save name" field. Date of birth, place of birth, portrait functionality (initials, built-in, generated, user image), local hot-seat privacy, name normalization/validation, structured name components, duplicate-name detection, dirty-state model, autosave, Save Draft/Continue/Back behavior, accessibility, keyboard interaction, localization, responsive behavior, security, and state-model transitions are all absent. The archetype picker and pillar sliders belong to Manager Archetype (`CONTEXT.md`) and are not Screen 8 content. Ledger updated at `docs/specs/group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md` — Screen 8 status changed from `Not yet audited` to `Reviewed`.