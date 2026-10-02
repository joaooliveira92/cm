import { Schema } from "effect";

/**
 * The player-editable commentary file (CONTEXT.md, Commentary File), as Preferences shows it. The file
 * lives in the user data folder and is owned by main. The renderer never touches the filesystem and is
 * never told a path. It names files, and asks main to open them.
 */
export class CommentaryFileStatusView extends Schema.Class<CommentaryFileStatusView>("CommentaryFileStatusView")({
  /** Every `.cfg` in the commentary folder, by name, sorted. A player adds a translation or a community
   *  file by putting it there. */
  files: Schema.Array(Schema.String),
  /** The name of the file the game reads, one of `files`. */
  active: Schema.String,
  /** One sentence per line or setting the game skipped, with its line number. */
  problems: Schema.Array(Schema.String),
  /** The sections the game ships that the file lacks, when the file started from an older release of
   *  the game's lines; empty otherwise. */
  newSections: Schema.Array(Schema.String),
}) {}

/** What the player asked for when a commentary-file command failed. */
export const CommentaryFileAction = Schema.Literals(["open", "reset", "choose", "update"]);

/**
 * A commentary-file command that didn't happen. `reason` is a short code, never an operating-system
 * message, because those carry paths. It is one of:
 * - a system error code, such as `EACCES` or `ENOSPC`
 * - `not-in-folder`, for a file chosen after it was removed
 * - `no-application`, when nothing opens the file
 * - `unknown`
 */
export class CommentaryFileError extends Schema.TaggedError<CommentaryFileError>()("CommentaryFileError", {
  action: CommentaryFileAction,
  reason: Schema.String,
}) {}
