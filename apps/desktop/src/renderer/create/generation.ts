import type { SaveId } from "@cm-clone/contracts";

/**
 * The generation phase of the creation flow — Screen 2's subject matter as this
 * repo decided it. There is no Database Initialization screen and nothing to
 * discover, validate, or index; what survives from the spec is the part that
 * has a referent here: the wait for `beginCareer` must be visible, honest about
 * what it can and cannot measure, cancellable, and retryable, and it must never
 * leave a provisional save behind.
 *
 * The lifecycle lives here rather than in the component because its hard part
 * is a race, not a render: a cancel can arrive while `beginCareer` is still in
 * flight, and the save id it has to discard does not exist yet at the moment
 * the player asks. Modelling abandonment as a state the late arrival lands in
 * — rather than a flag the component reads — makes the discard fall out of the
 * transition instead of depending on the order two callbacks happen to run in.
 */
export type GenerationState =
  /** No job has been started. */
  | { readonly _tag: "Pending" }
  /** A `beginCareer` call is in flight. */
  | { readonly _tag: "Running" }
  /** A provisional world exists and is complete enough to select a club from. */
  | { readonly _tag: "Ready"; readonly provisionalId: SaveId }
  /** The job failed; the player is offered Retry. */
  | { readonly _tag: "Failed"; readonly message: string }
  /** The provisional world became a playable career and is no longer ours to discard. */
  | { readonly _tag: "Committed" }
  /** The player left creation. Any provisional world, present or still arriving, is discarded. */
  | { readonly _tag: "Abandoned" };

/**
 * The result of a transition: the next state, plus the provisional save this
 * step made the flow's responsibility to delete. `discard` is the whole reason
 * transitions return a record rather than a bare state — the caller cannot
 * derive it from the states alone, because the id being discarded is often one
 * that never appears in either.
 */
export interface GenerationTransition {
  readonly state: GenerationState;
  readonly discard: SaveId | null;
}

const PENDING: GenerationState = { _tag: "Pending" };
const RUNNING: GenerationState = { _tag: "Running" };
const ABANDONED: GenerationState = { _tag: "Abandoned" };
const COMMITTED: GenerationState = { _tag: "Committed" };

export const initialGeneration: GenerationState = PENDING;

const stay = (state: GenerationState): GenerationTransition => ({ state, discard: null });

/**
 * Whether a `beginCareer` call may be issued now. This is the duplicate-job
 * guard: a second entry while one is in flight, or after one succeeded, is a
 * no-op rather than a second world on disk.
 */
export const canStartGeneration = (state: GenerationState): boolean =>
  state._tag === "Pending" || state._tag === "Failed";

/** Enter the running state. A caller that has not checked `canStartGeneration` changes nothing. */
export const startGeneration = (state: GenerationState): GenerationTransition =>
  canStartGeneration(state) ? stay(RUNNING) : stay(state);

/**
 * A `beginCareer` call returned a provisional save. If the player has since
 * left, the arriving world is discarded here — this is the branch that keeps a
 * cancelled generation from orphaning a `.sqlite` file. Any state other than
 * `Running` means this result belongs to a job the flow no longer owns, so the
 * id is discarded rather than adopted.
 */
export const generationSucceeded = (
  state: GenerationState,
  provisionalId: SaveId,
): GenerationTransition =>
  state._tag === "Running"
    ? { state: { _tag: "Ready", provisionalId }, discard: null }
    : { state, discard: provisionalId };

/** A `beginCareer` call failed. A player who already left is not shown a failure. */
export const generationFailed = (
  state: GenerationState,
  message: string,
): GenerationTransition =>
  state._tag === "Running" ? stay({ _tag: "Failed", message }) : stay(state);

/**
 * The player left creation — cancelled, navigated away, or unmounted the flow.
 * Idempotent: abandoning twice discards once, because the second call has no id
 * left to hand back. A world still in flight is caught by `generationSucceeded`.
 */
export const abandon = (state: GenerationState): GenerationTransition =>
  state._tag === "Ready"
    ? { state: ABANDONED, discard: state.provisionalId }
    : state._tag === "Committed"
      ? stay(state)
      : stay(ABANDONED);

/** The provisional world became a playable career. It must never be discarded after this. */
export const commit = (state: GenerationState): GenerationTransition =>
  state._tag === "Ready" ? stay(COMMITTED) : stay(state);

/** The provisional save id, when one exists and is still ours. */
export const provisionalIdOf = (state: GenerationState): SaveId | null =>
  state._tag === "Ready" ? state.provisionalId : null;

/** Club selection opens on a complete comparison set or not at all. */
export const isSelectionReady = (state: GenerationState): boolean => state._tag === "Ready";

/**
 * Why the transition into club selection is unavailable, in the player's words,
 * or `null` when it is available or when a Retry affordance is speaking instead.
 * A disabled control that does not say why is not acceptable, so every blocking
 * state here has a sentence.
 */
export const blockedReason = (state: GenerationState): string | null => {
  switch (state._tag) {
    case "Pending":
    case "Running":
      return "Building the league first…";
    case "Failed":
    case "Ready":
    case "Committed":
    case "Abandoned":
      return null;
  }
};

/**
 * What a screen reader is told when the state changes, or `null` when the
 * change is not worth an announcement. Deliberately one line per state rather
 * than per progress tick: there is no honest measure of how far along
 * `beginCareer` is, so there is nothing to count out loud.
 */
export const announcement = (state: GenerationState): string | null => {
  switch (state._tag) {
    case "Running":
      return "Building the league.";
    case "Ready":
      return "The league is ready. Choose a club.";
    case "Failed":
      return `Building the league failed. ${state.message}`;
    case "Pending":
    case "Committed":
    case "Abandoned":
      return null;
  }
};
