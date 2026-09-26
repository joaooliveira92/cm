# group-g tickets 31 and 32 — saves refuse other schemas; committed matches keep their timelines

**Outcome:** both resolved, 2026-09-21. Every engine-rule fix in Group G (26, 29, and whatever
decision requests 01, 04 and 06 change) is now unblocked.

## 32 — saves need a migration path

Decided under the human's delegation: **saves are disposable during development**
([note](../../.agents/notes/implemented/architecture/2026-09-21-saves-are-disposable-during-development.md)).

- A new save is stamped with `SAVE_SCHEMA_VERSION` in `PRAGMA user_version`: a hash of the DDL it ran
  (`main/db/schemaVersion.ts`), so no change to `db/schema.ts` can forget to move it. A header field,
  so a save older than the stamp reads `0` without any column having to exist.
- `loadSave` checks it before any table read and refuses a mismatch with `SaveSchemaMismatchError`.
  Load Career used to ignore a failed open silently; it now shows the sentence.
- Proved against a **real** save from 2026-09-02, rows stripped and schema intact (67 columns short of
  today's), committed under a `.gitignore` exception. A second case covers a non-zero other version.
- **Consequence for the human:** every save made before `b330fd1e` is refused on open.

## 31 — a committed match stores its timeline

- Stored as one `MatchTimelineRecorded` event on the match's own stream, in the commit transaction.
  Additive JSON in an existing column, so no DDL and no refusal of saves made since 32. The ticket
  first said "a table in `db/schema.ts`"; every reader already loads the stream, so the event is one
  less query and one less migration-shaped change.
- `matchEventsOf(stream)` (`main/match/timeline.ts`) returns the stored events for a committed match and
  re-derives for a live one. A `Schema` mirrors the engine's `MatchEvent` union, with a compile-time
  check in both directions — shown to fail typecheck when a member is removed.
- The proving test mocks the engine so every event lands a minute later, flips it after commit, and
  asserts the fresh derivation moved while report, summary and statistics did not. Shown to fail with
  the reads reverted to re-derivation.
- "A restarted live match says so" was split out as ticket 33: it is a renderer message that belongs
  with the revealed-position work.

## Also this session

- dev's gate was red on arrival (7 tests, 7 links) from the Squad toolbar move and the player-screen
  redesign; repaired in `22272415`.
- `g b` was dead on the player Development tab: `playerDevelopment` was missing from
  `PLAYER_SCOPED_SCREENS`. Fixed with a route-scope guard test (`ded5c7fe`).
- A two-axis review of 32 found two spec gaps and three judgement calls; closed in `2d5ad50f`.

## Evidence

`pnpm check:all` green after each commit; `pnpm test:e2e` 56 passed after 32.
