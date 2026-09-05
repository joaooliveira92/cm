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
}) {}

export class SaveNotFoundError extends Schema.TaggedError<SaveNotFoundError>()(
  "SaveNotFoundError",
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
