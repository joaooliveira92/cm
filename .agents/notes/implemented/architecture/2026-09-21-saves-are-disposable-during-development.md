# Agent Note: Saves are disposable during development

Status: implemented

## Problem

[Saves have no migration path](../../proposed/architecture/2026-09-19-saves-have-no-migration-path.md) found that a save file's
schema is written once, at career creation, and never upgraded. Every schema change so far has been an
unstated "new saves only", and an older save fails late, at the first read of a table it lacks. The note
set out three answers and left the choice to a human.

## Proposal

**Saves are disposable during development.** Until the game ships to players, a save is valid only
under the schema it was created with:

- A save is stamped at creation with `SAVE_SCHEMA_VERSION` in SQLite's `PRAGMA user_version`, a
  header field every file already has. A save made before the stamp existed reads `0`, so no column
  has to exist for the check to work.
- The version is a hash of the DDL a fresh save runs (`MIGRATION_STATEMENTS`), not a hand-bumped
  counter, so no change to `db/schema.ts` can forget to move it.
- `loadSave` reads the version before anything reads a table. A missing or different version is
  refused with `SaveSchemaMismatchError`, whose sentence says the save was made by a different version
  of the game. The Save List still lists such a save; the refusal comes when the player opens it.
- Additive JSON inside an existing column is not a schema change and does not move the version.

Decided under the human's standing delegation (2026-09-21: "solve all the ready-for-human tasks").

## Alternatives considered

- **Durable saves with ordered upgrade steps.** The right answer once anyone has a career worth
  keeping; premature now, and each step would need an old-save fixture to prove it. Revisit at the
  first release to players. The stamped version is where that path would start, so nothing here is
  wasted.
- **Status quo.** Rejected: it is the silent, deferred failure the finding describes.

## Consequences

- Group-g ticket 31's backfill is unnecessary: no committed match predates the timeline storage in any
  save that can be opened. 31 is rescoped to new saves only.
- The provisional migration clauses in the timeline and revealed-play notes resolve the same way:
  storage is added for new saves, and no backfill is written.
- `/gate` step 4 says a DDL change refuses older saves by itself, and asks the commit to say so.

## Acceptance criteria

- A save created before the version existed, or under a different version, is refused on open with
  the typed error's sentence, proved by a test fixture file written under an older schema.
- A save created under the current version opens and continues as before.
- `/gate` step 4 says a DDL change refuses older saves, and a commit touching persistence says which kind of change it is.
