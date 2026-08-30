import { Atom, type AsyncResult } from "effect/unstable/reactivity";

/** Management reads stay fresh for revalidation for 5 minutes (SWR). */
export const MANAGEMENT_SWR_STALE_TIME = "5 minutes";

/** A management atom with no subscribers is disposed after this idle time. */
export const MANAGEMENT_IDLE_TTL = "5 minutes";

/**
 * SWR policy for management reads. Active match state never goes through this
 * path — `resumeSimulation` is polled hand-rolled with no staleness, so a
 * running match can never render stale progress. `revalidateOnFocus` stays off
 * in a single-window desktop app.
 */
export const managementReadPolicy = <A, E>(
  atom: Atom.Atom<AsyncResult.AsyncResult<A, E>>,
): Atom.Atom<AsyncResult.AsyncResult<A, E>> => {
  const withIdle = Atom.setIdleTTL(atom, MANAGEMENT_IDLE_TTL);
  return Atom.swr(withIdle, {
    staleTime: MANAGEMENT_SWR_STALE_TIME,
    revalidateOnMount: false,
    revalidateOnFocus: false,
  }) as Atom.Atom<AsyncResult.AsyncResult<A, E>>;
};