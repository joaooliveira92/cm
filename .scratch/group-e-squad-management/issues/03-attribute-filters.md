# 03 — Attribute filters for the Squad table (Screen 71, attribute half)

**What to build:** Let a manager filter the owned Squad table by **attribute values** — e.g. "Pace
15 or better" — as a clause folded alongside Position and (per [ticket 02](02-status-filter.md))
Status. This is the second half of Group E Screen 71.

**Status:** resolved

**Why not ready:** the status half is a modelled vocabulary the renderer already owns; the attribute
half runs into the knowledge boundary and needs decisions before it can be built. Four questions
below, then this is implementable.

**Blocked by:** 02 — shares `FilterClause`, `applyFilters`, URL encode/decode, param classification,
and the Squad toolbar Popover pattern.

## Decisions to make

1. **Knowledge boundary.** The owned Squad carries exact figures; the any-club roster reads
   `KnownFigure` bands (Attribute Range under Scouting Progress). Screen 71 §9 forbids hidden values
   leaking through filtering. Is attribute filtering **owned-Squad only** (recommended — exact
   figures, no leak), or must the any-club roster offer band-overlap filtering too?
2. **Threshold vs range.** `value ≥ N` only, or `min ≤ value ≤ max`? And is the number user-typed
   or picked from a stepped scale?
3. **Which attributes.** The Squad table already exposes every attribute as a column
   (`ALL_ATTRIBUTES` via `table/features/visibility.ts`). Filter on any attribute currently visible,
   or a curated set?
4. **One clause per kind — or per attribute?** `upsertFilter`/`removeFilter` key on `_tag`, so at
   most one clause of each kind. An attribute filter is naturally "one attribute at a time"
   (`{ _tag: "attribute"; key; min?; max? }`); confirm that, rather than a set of per-attribute
   clauses that the current helper model cannot express.

## Notes for whoever triages

- The generic `applyFilters` folds clauses over `TableRowShape`, which carries no attributes. An
  attribute matcher likely needs a squad-level extension (a `SquadRow` predicate composed at the
  Squad screen) rather than a wider shared base type — same shape as the Condition guard proposed in
  [ticket 02](02-status-filter.md), but reading `SquadRow.attributes` (`KnownFigure`s).
- Sorting already resolves bands through `figureMid` (`table/squad/squadColumns.tsx`); filtering
  should say explicitly whether it reuses `figureMid`, the exact value, or band overlap.
- The visual control is new work: the shipped Popover pattern is a list of enumerated rows, which
  fits "one attribute + a stepped threshold" but not a free numeric range. That control is part of
  the cost this half adds.

## Out of scope (unless triage widens it)

- Team, registration, selection and age filters, and filter presets — deferred on absent models or
  the v1 exclusion, per the Group E ledger.

## Acceptance criteria

- [x] A recorded ruling on all four decisions above.
- [x] The ruled design is turned into an implementation ticket (or folded back into 02 if it stays
      trivially small).

## Answer

Ruled 2026-09-28. The human approved the ticket's recommended answers. Q1 and Q4 are the ticket's
own recommendations. Q2 follows the ticket's lean, and Q3 had no recommendation, so its ruling is
the orchestrator's; both are called out in case the human wants to revisit them.

1. **Knowledge boundary: owned Squad only.** The owned Squad reads exact figures by rule
   (`figureRecord` in `squadColumns.tsx`). The any-club roster, transfer tables and Player Search do
   not offer the filter, so no band or hidden value can leak through it (Screen 71 §9;
   [knowledge limits every Player read](../../../.agents/notes/implemented/architecture/2026-09-19-knowledge-limits-every-player-read.md)).
2. **A minimum threshold, `value ≥ N`, with `N` picked from the 1–20 scale.** It's one enumerated
   list, which the shipped Popover pattern already draws. It has no upper bound and no typed number.
   A `min ≤ value ≤ max` range would need a new control, so it's deferred until a use asks for it.
3. **Any attribute in `ALL_ATTRIBUTES`**, whether or not its column is currently visible. It's the
   set the Squad table can already show as columns, so a filter never names something the table
   cannot display. `injuryProneness` is hidden and absent from `ALL_ATTRIBUTES`, so it's excluded
   without a special case. Tying the list to the visible columns would make hiding a column silently
   drop an active filter, which is worse than filtering on a hidden column whose chip names it.
4. **One attribute clause at a time**, `{ _tag: "attribute"; attribute; min }`, keyed on `_tag`
   like position and status. Choosing another attribute replaces the clause, and the three kinds
   coexist.

A figure that is not `exact` never matches, even though the owned Squad cannot produce one. That
keeps the rule safe if the filter is ever offered somewhere banded, rather than quietly matching on a
band's midpoint.

Built as [ticket 04](04-attribute-threshold-filter.md).
