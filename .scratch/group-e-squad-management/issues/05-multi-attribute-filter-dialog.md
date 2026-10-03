# 05 — Several attribute thresholds at once, set from a dialog

**What to build:** The owned Squad's attribute filter holds any number of thresholds at once, for
example "Pace 15+, Finishing 14+, Composure 12+". A row shows when it meets every one. The control
is a modal dialog, which lists every Attribute by Category and shows how many players the draft
would leave before it is applied.

**Supersedes:** two rulings in [ticket 04](04-attribute-threshold-filter.md): "one attribute clause
at a time" and "the control reuses the Position/Status Popover pattern". Requested 2026-09-29.

**Blocked by:** None.

**Status:** claimed

## Decisions

- One attribute clause per Attribute, not one per kind. Position and status stay one per kind.
- The dialog edits a draft. Apply replaces the whole attribute set in one step, so a change reads as
  one notice and one history entry. Cancel and Escape discard the draft. Clear all removes every
  attribute clause at once, and leaves Position and Status alone.
- The dialog shows a live count of the players the draft would leave, with the other filters
  applied.
- The URL keeps `attr:<key>:<min>`, one part per Attribute. A repeated key keeps the last part.
- Owned Squad only, exact figures only, 1–20 minimums, every key in `ALL_ATTRIBUTES`: all unchanged
  from ticket 04.

## Acceptance criteria

- [x] Pace 15+ and Strength 12+ together show only players meeting both.
- [x] Apply replaces the attribute set; Clear all removes it; neither touches Position or Status.
- [x] Two attribute parts in the URL restore both. A repeated key keeps the last one.
- [x] The dialog's count matches the rows Apply would leave.
- [x] The bar notice names the new attribute set, or says the attribute filter was cleared.
- [x] Ticket 04 and the Group E ledger say what changed.
- [ ] `pnpm check:all` is green, and the Squad e2e specs pass.

## Answer

Implemented 2026-09-29; not yet committed.

- **Model.** `upsertFilter` and `removeFilter` key on a slot: the kind, or `attribute:<key>` for a
  threshold. `replaceAttributeFilters` swaps the whole attribute set and leaves the other kinds.
- **Notice.** `filterChangeNotice` compares the attribute set as one phrase, so an Apply reads
  "Filtered by Attributes: Pace 15+, Strength 12+" or "Cleared the Attribute filter".
- **URL.** The decoder de-duplicates per Attribute, not per kind.
- **Screen.** `squad/AttributeFilterDialog.tsx`: attributes by Category, a 1–20 grid plus Any for
  the picked one, a live count (`countWithAttributeFilters`), then Clear all, Cancel and Apply. The
  draft applies in Category order, so the URL and the trigger read the same however it was built.
- **Records.** Ticket 04 carries a superseded-in-part block; the Group E ledger's attribute row
  describes the set.

Evidence so far: typecheck, lint, effect-lint, md links and db schema all pass. The squad, table,
navigation and clubSquad renderer tests pass apart from one `grid-navigation.test.tsx` refresh case.
It fails deterministically, and it sits in a file a parallel session is editing, on a path this
change does not touch. The full `pnpm check:all` and the Squad e2e specs are still owed, once that
session lands.
