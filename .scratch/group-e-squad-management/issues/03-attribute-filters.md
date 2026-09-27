# 03 — Attribute filters for the Squad table (Screen 71, attribute half)

**What to build:** Let a manager filter the owned Squad table by **attribute values** — e.g. "Pace
15 or better" — as a clause folded alongside Position and (per [ticket 02](02-status-filter.md))
Status. This is the second half of Group E Screen 71.

**Status:** needs-triage

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

- [ ] A recorded ruling on all four decisions above.
- [ ] The ruled design is turned into an implementation ticket (or folded back into 02 if it stays
      trivially small).
