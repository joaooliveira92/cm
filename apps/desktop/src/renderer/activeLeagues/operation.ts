/**
 * The Active Leagues screen's operations as explicit lifecycles.
 *
 * The spec's "Interactions as typed intents; operations as explicit lifecycles" decision rules out
 * the usual `submitting`/`error`/`done` triple: one value, four states, so "pending *and* failed"
 * is unrepresentable rather than merely unlikely. Continue (submit the selection) is the operation
 * this module names; anything else the screen grows takes the same shape.
 *
 * Duplicate submission is prevented *in the model*, not on a button's `disabled`: `begin` refuses
 * while a run is in flight and says so by returning `null`, so a keyboard repeat that outruns a
 * re-render still cannot start a second write.
 */

export type Operation<A> =
  | { readonly _tag: "Idle" }
  | { readonly _tag: "Pending" }
  | { readonly _tag: "Success"; readonly value: A }
  | { readonly _tag: "Failure"; readonly message: string };

export const idleOperation = <A>(): Operation<A> => ({ _tag: "Idle" });

export const isPending = <A>(operation: Operation<A>): boolean => operation._tag === "Pending";

/**
 * Move into `Pending`, or refuse. `null` means "a run is already in flight" — the caller must not
 * start a second one, and there is nothing to report to the user, because the first run's pending
 * state is already on screen.
 */
export const begin = <A>(operation: Operation<A>): Operation<A> | null =>
  operation._tag === "Pending" ? null : { _tag: "Pending" };

export const succeed = <A>(value: A): Operation<A> => ({ _tag: "Success", value });

/** Failure restores an actionable state: the message is rendered and the controls come back, so
 *  the player can change the setup and try again rather than being stranded. */
export const fail = <A>(message: string): Operation<A> => ({ _tag: "Failure", message });

/** The message to render, or `null`. Nothing else in the union has anything to say. */
export const failureMessage = <A>(operation: Operation<A>): string | null =>
  operation._tag === "Failure" ? operation.message : null;
