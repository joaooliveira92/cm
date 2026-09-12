# 05 — Screen 28: is the Calendar a screen?

Type: grilling

Status: claimed

Status: resolved

## Answer

**Fixtures already is the Calendar screen under another name.**

The "Calendar" concept in `CONTEXT.md` is the time-advance mechanism, not a screen surface. The
player-facing surface for date-grouped events is `FixturesScreen.tsx`, which groups fixtures by date
under date headers (line 51-52: "the fixture list *is* a calendar"). It is the natural home for the
import's Calendar content.

Screen 28 is therefore the Fixtures screen under a different name. The import's richer features —
month/week/agenda views, reminders, transfer-window overlays, event-type filters, linked-entity event
detail — would enhance the existing Fixtures screen rather than create a new one. They are classified
as `deferred` (`unscheduled`): the seam exists (Fixtures is a career screen with a route, a tab, a
keybinding, and an existing RPC contract), but the import's view modes, event taxonomy, and reminder
system have no implementation.

No `CONTEXT.md` change is needed — the existing **Calendar** entry already defines it as the time
mechanism rather than a screen, and **Fixture** already defines the scheduled event. The cross-reference
("the player-facing calendar surface is Fixtures") would add precision but does not correct an error.

## Ledger rows

The ledger's Screen 28 section (RECONCILIATION.md) gets:
- Status: **Reviewed** (this ticket settles the "is it a screen" question; a thin audit of its
  content against the Fixtures implementation follows from this answer).
- §1 Purpose, §4 Layout, §6 Model, §7 Interactions, §8 States, §20 criteria — `contradicted`:
  Fixtures shows match events grouped by date date; no month grid, no day detail, no reminders, no
  event-type taxonomy, no view switching.
- §2 Goals, §20 criterion 1 (authoritative fixture dates) — `renamed`: reviewing upcoming fixtures
  and navigating by date is what Fixtures already does under "fixtures" vocabulary.
- §12-15, §20 criterion 8, §21 remaining tests — `deferred` as `unscheduled`, matching other screens.
- §10/§16/§3 multi-manager clauses — blanket sweep, as below.

Navigation placement for any new surface (the map's fog) is unaffected: no new surface was warranted.
