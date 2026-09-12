# 02: Retire Manager

**What to build:** A "Retire Manager" action on the Manager Profile screen that opens a dialog with an Irreversibility Disclosure and a destructive confirm button; confirming appends a `ManagerRetired` event, sets `archived_cause = 'retired'` on the save, and returns to the Save List where the save shows as archived. Season Summary shows a retirement line for retired saves.

**Decisions:**
- Retirement is a second cause of an Archived Save: a `ManagerRetired { seasonNumber }` event and a nullable `archived_cause` column replacing the `sacked` boolean, guard renamed to `assertSaveNotArchived`, confirmed by an Irreversibility Disclosure in a dialog on Manager Profile (source: `.agents/notes/implemented/feature/2026-08-30-retire-manager.md`).
- `manager_status.sacked` is removed; replaced by `archived_cause TEXT CHECK (archived_cause IS NULL OR archived_cause IN ('sacked','retired'))` — `NULL` means the save is active (source: `.agents/notes/implemented/feature/2026-08-30-retire-manager.md`).
- `last_outcome` is never written by the retirement command; retirement line on Season Summary reads `Career ended — you retired at the end of Season N` (source: `.agents/notes/implemented/feature/2026-08-30-retire-manager.md`).
- `assertSaveNotSacked` → `assertSaveNotArchived`, reading `archived_cause IS NOT NULL`; `SaveSackedError` → `SaveArchivedError`, carrying the cause, renamed at all thirteen call sites (source: `.agents/notes/implemented/feature/2026-08-30-retire-manager.md`).
- Retirement confirmed by an Irreversibility Disclosure — existing `CONTEXT.md` concept — plus a distinct destructive confirm button labelled `Retire Manager`; `Cancel` has default focus (source: `.agents/notes/implemented/feature/2026-08-30-retire-manager.md`).
- Two preconditions: save is not already archived (`assertSaveNotArchived`), and save is not mid-match (checked through the same phase test the calendar uses) (source: `.agents/notes/implemented/feature/2026-08-30-retire-manager.md`).
- Retirement is rejected when the save is already archived, and when the save is mid-match (source: `.agents/notes/implemented/feature/2026-08-30-retire-manager.md`).
- Confirming returns to the Save List; the save shows as archived; no success screen (source: `.agents/notes/implemented/feature/2026-08-30-retire-manager.md`).
- No route, navigation entry, or keyboard tier is added for Screen 20 (source: `.agents/notes/implemented/feature/2026-08-30-retire-manager.md`).

**Blocked by:** 01 (the retire dialog lives on Manager Profile, so the screen must exist first)

**Status:** resolved

- [x] Acceptance criterion 1: Manager Profile screen has a "Retire Manager" action that opens a dialog with Irreversibility Disclosure and destructive confirm button
- [x] Acceptance criterion 2: Dialog confirms retirement with cause; on confirm, `archived_cause` is set to `'retired'` and `ManagerRetired` event is appended
- [x] Acceptance criterion 3: Save List shows the save as archived after retirement; Season Summary shows retirement line for retired saves