import type { Tactic, SquadPlayerView } from "@cm-clone/contracts";

/** Which editor the screen is showing: the pitch, the team/player instructions or the set-piece
 *  priorities. */
export type Mode = "positions" | "instructions" | "priorities";

/** Which of the Team Selection table's optional columns are shown. */
export interface ColumnVisibility {
  readonly pos: boolean;
  readonly fit: boolean;
  readonly condition: boolean;
}

/** Configuration for in-match mode. When provided, the Tactics screen renders as a standalone
 *  editor inside a `LiveCommandFrame`, receiving all data from the match context instead of loading
 *  it from the server. The outer `<main>` tag is left to `LiveCommandFrame`. */
export interface InMatchTactics {
  /** The current tactic to display and edit. */
  readonly tactic: Tactic;
  /** The squad from the match context, used for player names and selection. */
  readonly squad: ReadonlyArray<SquadPlayerView>;
  /** The controlled club's display name. */
  readonly clubName: string;
  /** Called when the user edits the tactic (seeding an undo stack entry). */
  readonly setTactic: (tactic: Tactic) => void;
  /** Called when Confirm is triggered. */
  readonly onConfirm: () => void;
  /** Called when Undo Last is triggered. */
  readonly onUndoLast: () => void;
  /** Called when Cancel is triggered. */
  readonly onCancel: () => void;
  /** Number of pending (undoable) changes. */
  readonly pendingCount: number;
  /** Validation error to display, or null. */
  readonly validationError: string | null;
  /** True while a command is being submitted. */
  readonly isPending: boolean;
}
