# Agent Note: Screen 13 Load Saved Game — audit complement

Status: proposed

## Problem

Screen 13 (Load Saved Game) in Group A was `Not yet audited`. The shell audit (ticket 04) already read `saveList.tsx` and produced Screen 1 rows for the entry point, Actions registry gap, keyboard tier, repository failure swallowing, and stale-entry contract. A complement ticket was needed to record what Screen 13's spec demands beyond those shell findings, without duplicating Screen 1's rows.

## Proposal

Ticket 19 writes 40 ledger rows to `RECONCILIATION.md` covering every spec section the implementation does not follow. The companion note documents the key decisions rather than repeating the full audit register, which lives in `RECONCILIATION.md`.

**`contradicted` rows** — the implementation already made an incompatible decision: save-library surface absent (manifest-driven browser replaced by a flat name list), search/filter/sort absent, details panel absent, save-type presentation absent, footer actions absent, load pipeline absent (`loadSave` is a single existence check, not the spec's multi-stage pipeline), corrupt-save behavior absent, initial destination absent (`handleContinue` jumps directly to Squad), stale-entry handled as silent no-op (re-anchored to the shell audit's e2e test).

**`deferred` rows** — wanted, in scope, not built: keyboard interaction (level 2 per screen-keyboard-tiers note), accessibility, responsive layout, localization, save read lease and concurrent save changes, compatibility/integrity models, import/duplicate/delete, loading progress and cancellation, manifest treated as trusted, autosave groups.

Screen 13 status updated to `Reviewed`; no code changed.

## Alternatives considered

- **Extend the shell audit rather than cut a complement ticket.** Rejected because ticket 11's slicing decided Screen 13 earns its own complement ticket so the shell audit stays readable.
- **Produce a full `Audited` pass.** Rejected — surviving screens are large and `Reviewed` with divergence rows is the established pattern.
- **Duplicate Screen 1's stale-entry row.** Rejected — ticket 19's done-when says no duplicates; the complement re-anchors to the same note.

## Acceptance criteria

- Screen 13 status in `RECONCILIATION.md` is `Reviewed`.
- Every spec section the implementation does not follow has a ledger row.
- No row duplicates a row already in Screen 1's section of the ledger.
- `unscheduled` anchor used only where no other anchor is more specific.
- Ticket 19 status changes to `resolved` and the map's Decisions-so-far records the gist.

## Risks

- Deferred rows lack an owning spec group, so future work on those surfaces depends on a subsequent effort picking them up.
- The load-pipeline `contradicted` row re-anchors to the Save List glossary term, so future save-library work must overturn that term explicitly.
