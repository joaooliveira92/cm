/**
 * The Training screen's view states. Exactly four exist — `loading`, `ready`, `error`, and the
 * implicit `empty` (zero coaches is a valid view the screen checks, not a separate state tracked
 * here) — and the four a spec import might have carried are dropped for the same reasons as the
 * Club Staff screen: one manager and no permission model; one immutable read re-run on navigation
 * rather than refreshed in place; no filters.
 */
export const TRAINING_VIEW_STATES = ["loading", "ready", "error"] as const;

export type TrainingViewState = (typeof TRAINING_VIEW_STATES)[number];

/** The `_tag` shape of a read that can still be waiting or failed — AsyncResult, structurally. */
export type ReadTag = "Initial" | "Success" | "Failure";

/**
 * Pick the Training screen's view state from the one read it makes.
 *
 * - `error` — the read produced a typed failure (missing save, transport, or decode failure).
 * - `loading` — the read is still in flight.
 * - `ready` — the view has arrived (may contain an empty coach list).
 */
export const trainingViewState = (result: { readonly _tag: ReadTag }): TrainingViewState => {
  if (result._tag === "Failure") return "error";
  if (result._tag === "Initial") return "loading";
  return "ready";
};