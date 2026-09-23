import { Schema } from "effect";
import { ARCHIVED_CAUSES } from "@cm-clone/shared";

import { SaveId } from "./ids.js";

/** The cause that archived a save (ticket 02): `"sacked"` when the board ended the career,
 * `"retired"` when the player did. `null` is the whole of "active" — there is no separate boolean,
 * so no pair of fields that must agree. */
export const ArchivedCauseSchema = Schema.Literals(ARCHIVED_CAUSES);

export class SaveSummary extends Schema.Class<SaveSummary>("SaveSummary")({
  id: SaveId,
  name: Schema.String,
  createdAt: Schema.String,
  /** `null` while the career is live. Set once the save is an Archived Save, so the Save List can
   * mark it without opening the career. */
  archivedCause: Schema.NullOr(ArchivedCauseSchema),
  /** The manager's name from `manager_profile`. */
  managerName: Schema.String,
  /** The resolved display name of the user's club. */
  userClubName: Schema.String,
  /** The current season number. */
  seasonNumber: Schema.Finite,
  /** The current in-game date (ISO YYYY-MM-DD). */
  gameDate: Schema.String,
  /** The save's last modified time (ISO string, from file mtime). */
  lastModifiedAt: Schema.String,
}) {}

export class SaveNotFoundError extends Schema.TaggedError<SaveNotFoundError>()(
  "SaveNotFoundError",
  {
    id: SaveId,
  },
) {}

/** Raised by `loadSave` for a save made under another save schema. Saves are disposable during
 *  development (Agent Note `2026-09-21-saves-are-disposable-during-development.md`): nothing upgrades an older file, so opening one is refused here rather
 *  than failing later at the first read of a table or column it lacks. */
export class SaveSchemaMismatchError extends Schema.TaggedError<SaveSchemaMismatchError>()(
  "SaveSchemaMismatchError",
  {
    id: SaveId,
  },
) {}

/** Raised by any mutating command once the save is an Archived Save — `ManagerSacked` (ADR-0006 /
 * ticket 18) or `ManagerRetired` (ticket 02). Read-only from that point on, no re-hire flow. Carries
 * the cause because the renderer turns this error into player-facing copy, and "you have been
 * sacked" is the wrong sentence for a save the player retired from. */
export class SaveArchivedError extends Schema.TaggedError<SaveArchivedError>()("SaveArchivedError", {
  saveId: SaveId,
  cause: ArchivedCauseSchema,
}) {}
