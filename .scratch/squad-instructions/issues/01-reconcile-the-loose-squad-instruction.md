# 01: Reconcile the loose Squad instruction against the shipped Squad screen

**Status:** resolved

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

1. **E 71 Selection Filters — the one concrete in-v1 gap.** Only the position filter is wired.
   `FilterClause` models `nameSearch` and `position` only; the status and attribute clauses Screen 71
   wants do not exist (the earlier "already modelled" reading was wrong). Status filtering is now
   ticketed as [group-e issue 02](../../group-e-squad-management/issues/02-status-filter.md)
   (`ready-for-agent`); attribute filters as issue 03 (`needs-triage`). The group-e `map.md` called
   for an extension ticket and none was filed until now; the [Group E
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

- [x] A recorded ruling on `.scratch/squad-instructions.md`: close as satisfied-inline, or scope a
      remainder.
- [x] If a remainder, a scoped ticket naming the exact E sections (71 filters, and any
      instruction-specific gaps confirmed by a reconciliation pass).
- [x] No proposed work re-does the shipped `renderer/squad/` screen, and nothing reopens a
      `deferred` model.

## Comments

- Filed 2026-09-27 while picking the next effort after Group H. The finding that cleared the scope
  question: Group D owes no in-v1 screen, and Group E's only modelled-but-unwired remainder is
  Screen 71.
- **2026-09-27:** the formal ruling this ticket asks for was skipped. The concrete E 71 remainder was
  chartered directly instead: [group-e issue 02](../../group-e-squad-management/issues/02-status-filter.md)
  (status filter, `ready-for-agent`) and issue 03 (attribute filters, `needs-triage`). This ticket
  stays `needs-triage` for the remaining question — whether the instruction demands anything *beyond*
  E 71 (contract columns, lineup-slot buttons, URL state) or closes as satisfied-inline.

## Answer

Ruled 2026-09-28 by the human: **charter a remainder.** The reconciliation below compares every
section of the instruction with the shipped `renderer/squad/` screen and the decisions made after it.
Only the rows marked **build** become tickets.

| Instruction section | Disposition | Why |
|---|---|---|
| §1–2, §14–16, §21 visual target: 1024×768, chrome-blue bevels, Trebuchet, textures | **superseded** | The [shadcn palette note](../../../.agents/notes/implemented/architecture/2026-09-27-shadcn-palette-with-user-chosen-colors.md) dropped the chrome-blue frame. Reconcile against later decisions, never the reverse. |
| §3–6, §12–13 shell: left rail, club header, club tabs, bottom tabs, ticker | **superseded** | The app shell owns these: [primary navigation is a sidebar](../../../.agents/notes/implemented/architecture/2026-09-26-primary-navigation-is-a-sidebar.md), the career header, and the shell bottom bar. Squad does not draw its own. |
| §7.1/§19.1, §10, §18 View selector, two-column position list, one screen with switchable views | **satisfied** | `SQUAD_VIEWS`, `SquadPositionList`, [squad view selector note](../../../.agents/notes/proposed/feature/2026-09-07-squad-view-selector-and-position-list.md). The view persists as a standing preference in storage, not `?view=`, by that note. Filters and sort already persist. |
| §9 Contract view: Basic Wage, Contract, Asking Price | **build: [02](02-contract-view.md)** | Contract (wage, expiry) and Transfer Value exist in the domain, but `SquadPlayerView` does not carry them, which is why `visibility.ts` has no such columns. "Asking Price" is shown as **Transfer Value** (CONTEXT: avoid "price"). |
| §9 Squad Status, Offer Options | **deferred** | No squad-status or offer-options model. |
| §9.4 / §10.1 Pkd slot | **satisfied in the list, build in the table: [03](03-match-day-column-in-the-table.md)** | The position list's leading match-day indicator is the Pkd slot. The table layouts have none. |
| §9.5 Inf badges | **satisfied, partly deferred** | The status slot shows modelled statuses (injured, suspended, away, Tired, Fgn). Listed, wanted and loan have no model. |
| §7.2 / §10.3 Sort control for the position view | **build: [04](04-sort-control-for-the-position-list.md)** | The list sorts through the shared table state, but only the palette can change it; the list has no header to click. |
| §7.1 / §19.3 Team: first team, reserves, youth | **deferred** | No reserves or youth-squad model (Group E ledger). |
| §7.4 Show Filters | **satisfied** | Filters sit in the toolbar and are always shown. There is no extended filter panel to toggle. |
| §11 Position selector: lineup slots GK…SB | **satisfied** | `MatchDayBar` is the shared team-sheet editor ([the team-sheet is the Tactic](../../../.agents/notes/proposed/architecture/2026-09-13-the-team-sheet-is-the-tactic.md)): the formation's eleven plus a seven-slot bench, not SB1–SB12. Whether a slot should also filter the roster is left as an open question below, not a ticket. |
| §20 accessibility, §22 quality | **standing** | Already the repo's level-1 contract. |
| Screen 71 attribute filter | **group-e** | Ruled in [group-e 03](../../group-e-squad-management/issues/03-attribute-filters.md), built as group-e 04. |

**Open question, answered by the human 2026-09-28.** Should selecting an empty lineup slot filter the
roster to players who can fill it (§11.2)? Yes, but additively: it reorders and marks the players
rather than hiding any, and it leaves the keyboard carry alone. Ticketed as
[05](05-empty-slot-prioritises-fitting-players.md).
