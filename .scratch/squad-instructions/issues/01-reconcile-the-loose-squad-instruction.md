# 01: Reconcile the loose Squad instruction against the shipped Squad screen

**Status:** needs-triage

**What to decide:** `.scratch/squad-instructions.md` is a loose, un-chartered instruction to
reproduce an early-2000s two-view Squad screen from scratch. It has no effort directory and no
tickets. It now overlaps a screen that already ships and a visual language already adopted, so the
Tier 1 roadmap entry ("Charter the squad work … a human call") needs a ruling before any code is
written: **satisfied-inline, or a defined remainder?**

## What already exists (so a from-scratch build would redo it)

- **A shipped Squad screen**, `apps/desktop/src/renderer/squad/`: `SquadScreen`, `SquadTable`,
  `SquadRoster`, `SquadPositionList`, `MatchDayBar`, a `positions` view id in `squadViews.ts`,
  `useSquadColumns`, and TanStack sorting.
- **Group E's spec records these as satisfied**: 69 Squad Selection, 70 Squad View Selector ("view
  picker with presets, persisted"), 71 Selection Filters (**position filter only**), 72 Player
  Sorting.
- **The visual target is already the adopted language.** `.scratch/visual-design-language/spec.md`
  chose exactly the retro chrome-blue frame, Trebuchet MS, dense 12px tables, and CM-style
  three-letter status abbreviations the instruction describes. The instruction predates it.
- **The match-day bar is a shared team-sheet editor** ([the team-sheet is the
  Tactic](../../../.agents/notes/proposed/architecture/2026-09-13-the-team-sheet-is-the-tactic.md)),
  so the instruction's lineup-slot panel is not Squad-only surface.
- **Group D owes no screen here.** 51 Attributes and 52 Positions are `renamed` onto the Squad
  table; the rest of D is `out-of-scope` or `deferred` on absent models (see the [Group D
  ledger](../../../docs/specs/group_d_player_and_staff_records/RECONCILIATION.md)). "Player metric
  sheets" is the Squad table, not a new build.

## What is genuinely open

1. **E 71 Selection Filters — the one concrete in-v1 gap.** Only the position filter is wired; the
   `FilterClause` union already models attribute/status clauses that no UI reaches. The group-e
   `map.md` called for an extension ticket and none was filed; the [Group E
   ledger](../../../docs/specs/group_e_squad_management/RECONCILIATION.md) records 71 as
   `deferred`/partial.
2. **Instruction-specific asks not yet checked against the shipped screen**: the eight-column
   contract table (Squad Status, Basic Wage, Contract, Offer Options, Asking Price), the
   position-selector lineup-slot buttons (SB1–SB12), View/Sort/Team dropdowns, and `?view=` URL
   persistence. Some may already be satisfied; none has been audited.
3. **Anything the instruction asks that contradicts the two later decisions** (the visual design
   language, the team-sheet note) — reconcile against them, never the reverse.

## Group ownership (per `.ai/SPEC-ROADMAP.md`)

| Surface | Group | State |
|---|---|---|
| Roster table, selection, views, filters, sorting | **E** (69–79) | 69/70/72 satisfied, 71 partial |
| Player metric sheets (attributes, positions) | **D** (51/52) | `renamed` onto the Squad table |
| Team-sheet / lineup editors | **E + F** | shared via the team-sheet note |

## Decisions to make

- Is `.scratch/squad-instructions.md` **satisfied-inline** (close it and record the reconciliation
  in the Group E ledger), or does it **charter a remainder**?
- If a remainder: is it exactly **E 71** (wire attribute/status filters), or does the instruction
  demand specific changes to the shipped screen (contract columns, lineup-slot buttons, URL state)?
- Does any instruction ask contradict the later visual-design-language or team-sheet decisions?

## Out of scope

- E 73/74/76/78/79, E 77's eligibility half, and D 53–55/58–63/68: `deferred` on absent models or a
  v1 exclusion. None is resurrected by this ticket.

## Acceptance criteria

- [ ] A recorded ruling on `.scratch/squad-instructions.md`: close as satisfied-inline, or scope a
      remainder.
- [ ] If a remainder, a scoped ticket naming the exact E sections (71 filters, and any
      instruction-specific gaps confirmed by a reconciliation pass).
- [ ] No proposed work re-does the shipped `renderer/squad/` screen, and nothing reopens a
      `deferred` model.

## Comments

- Filed 2026-09-27 while picking the next effort after Group H. The finding that cleared the scope
  question: Group D owes no in-v1 screen, and Group E's only modelled-but-unwired remainder is
  Screen 71.
