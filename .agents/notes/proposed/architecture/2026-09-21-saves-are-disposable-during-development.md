# Agent Note: Saves are disposable during development

Status: proposed

## Problem

[Saves have no migration path](2026-09-19-saves-have-no-migration-path.md) found that a save file's
schema is written once, at career creation, and never upgraded. Every schema change so far has been an
unstated "new saves only", and an older save fails late, at the first read of a table it lacks. The note
set out three answers and left the choice to a human.

## Proposal

**Saves are disposable during development.** Until the game ships to players, a save is valid only
under the schema it was created with:

- `save_meta` carries a `schema_version`, written at career creation from one constant in the main
  process.
- Opening a save whose version is missing or differs from the current one is refused with a typed
  error whose sentence names what happened ("this save was made by an older version of the game").
  The save list shows such a save as unopenable rather than hiding it.
- The constant is bumped by any change to `db/schema.ts` that adds, drops or alters a table or column.
  `verify-db-schema` is the natural place to insist on it.
- Additive JSON inside an existing column is not a schema change and needs no bump.

Decided under the human's standing delegation (2026-09-21: "solve all the ready-for-human tasks").

## Alternatives considered

- **Durable saves with ordered upgrade steps.** The right answer once anyone has a career worth
  keeping; premature now, and each step would need an old-save fixture to prove it. Revisit at the
  first release to players. `schema_version` is the column that path starts from, so nothing here is
  wasted.
- **Status quo.** Rejected: it is the silent, deferred failure the finding describes.

## Consequences

- Group-g ticket 31's backfill is unnecessary: no committed match predates the timeline storage in any
  save that can be opened. 31 is rescoped to new saves only.
- The provisional migration clauses in the timeline and revealed-play notes resolve the same way:
  storage is added for new saves, and no backfill is written.
- `/gate` step 4 names the version bump as the migration when a change touches persistence.

## Acceptance criteria

- A save created before the version constant existed, or under a different version, is refused on
  open with the typed error's sentence, proved by a test fixture file written under an older schema.
- A save created under the current version opens and continues as before.
- `/gate` step 4 says a persistence change bumps the schema version.
