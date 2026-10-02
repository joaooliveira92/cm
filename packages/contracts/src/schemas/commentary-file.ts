import { Schema } from "effect";

/**
 * The player-editable commentary file (CONTEXT.md, Commentary File), as Preferences shows it. The file
 * lives in the user data folder and is owned by main; the renderer never touches the filesystem. Not
 * save-scoped: commentary belongs to whoever sits at this machine.
 */
export class CommentaryFileStatusView extends Schema.Class<CommentaryFileStatusView>("CommentaryFileStatusView")({
  /** Absolute path of the file the game reads. */
  file: Schema.String,
  /** One sentence per line the game skipped or section it replaced, with its line number. */
  problems: Schema.Array(Schema.String),
}) {}
