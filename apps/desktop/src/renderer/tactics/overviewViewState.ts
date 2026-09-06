import type { TacticsOverviewView } from "@cm-clone/contracts";

/**
 * The Tactics Overview's distinct, observable view states, and the two pure rules that keep the
 * screen's rendering honest against an asynchronous read.
 *
 * The overview adds no failure channel of its own: every state it displays traces to the
 * snapshot's typed outcomes (each `TacticsOverviewView` declares the revision its values bind to)
 * or to the saved-state guard. `permission-limited` is that guard — the archived save's
 * read-only refusal, never a new concept. The editor-only transcription states (modified,
 * validating, submitting, completed) do not exist here: this screen changes nothing.
 *
 * The two rules:
 *
 * - `admitSnapshot` — a response carrying an older revision than the one already shown is
 *   discarded whole, never partially rendered. A response at the same or a newer revision is held,
 *   not silently adopted: adopting requires the player's Refresh, which is what makes a
 *   superseding response observable instead of an invisible data swap.
 * - `overviewViewState` — the five states, in a fixed precedence: failed (when there is no
 *   rendered data to fall back on), loading, permission-limited (a guard, applied to whatever the
 *   overview already renders), conflicted (a newer revision is known but not yet adopted), ready.
 */
export type TacticsOverviewState =
  | "loading"
  | "ready"
  | "conflicted"
  | "permission-limited"
  | "failed";

/** The outcome of deciding whether an arriving snapshot may replace the one the screen renders. */
export interface SnapshotAdmission {
  /** The snapshot the screen should now render. */
  readonly rendered: TacticsOverviewView;
  /** `false` when the arriving response carried an older revision and was discarded untouched. */
  readonly admitted: boolean;
}

export const admitSnapshot = (
  rendered: TacticsOverviewView | null,
  incoming: TacticsOverviewView,
): SnapshotAdmission => {
  if (rendered === null) return { rendered: incoming, admitted: true };
  if (incoming.revision < rendered.revision) return { rendered, admitted: false };
  return { rendered, admitted: true };
};

/** Everything `overviewViewState` needs to pick a state; callers already hold all of it. */
export interface OverviewViewStateInput {
  /** The snapshot the screen is currently rendering (the last adopted response). */
  readonly rendered: TacticsOverviewView | null;
  /** The atom's freshest arrived snapshot, when it is a `Success`. */
  readonly latest: TacticsOverviewView | null;
  /** Whether the overview read failed. `failed` only ever surfaces when there is no rendered
   *  data to keep showing — a failed revalidation never blanks a valid snapshot. */
  readonly failed: boolean;
  /** Whether the save is an Archived Save, from the saved-state guard. */
  readonly archived: boolean;
}

export const overviewViewState = (input: OverviewViewStateInput): TacticsOverviewState => {
  if (input.rendered === null) {
    return input.failed ? "failed" : "loading";
  }
  if (input.archived) return "permission-limited";
  if (
    input.latest !== null &&
    input.rendered.revision < input.latest.revision
  ) {
    return "conflicted";
  }
  return "ready";
};