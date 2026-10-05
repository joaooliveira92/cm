# 36: One operations module for tactic edits

Type: task
Status: needs-triage

Found 2026-10-05 during an architecture review of the tactics cluster (deepening candidate 4).

**What's wrong:** the same nominal edit behaves differently depending on the input device, because the
pointer path and the Action-registry path each carry their own rulebook. Two dispatch seams call into
two separate handler bodies instead of one operations module.

- `useTacticEditing.handleAssign` routes through `bringIntoSelected` and advances the selection to the
  next empty slot (`useTacticEditing.ts:41–57`).
- The Action path calls `setTactic(changeSlotPlayer(...))` directly with no selection advance
  (`useTacticsActionHandlers.ts:72–74`).
- `set-mentality` is rebuilt as a raw `new Tactic({...})` in the handler
  (`useTacticsActionHandlers.ts:64–71`) although no `tacticEdits` transform exists for it.
- `useTacticsActionHandlers` also re-derives `changeTemplate`/`clearSelection` calls already owned by
  `useTacticEditing`.
- Taker add/remove/reorder is pure list logic stranded inside `SetPrioritiesPanel`
  (`SetPrioritiesPanel.tsx:324–351`), reachable only via a component render and absent from the
  Action registry entirely.

**Suggested direction:** one operations module both dispatch seams call, owning "advance selection",
"valid edit", and "taker ordering". The pure transforms live in `tacticEdits.ts`; the operations
module composes them and the two input paths become thin adapters over it.

**Constraint:** every operation must remain a registered Action
([Agent Note](../../../.agents/notes/implemented/architecture/2026-08-29-action-model.md)); share the
handler logic, do not drop the registration.

**Blocked by:** None
