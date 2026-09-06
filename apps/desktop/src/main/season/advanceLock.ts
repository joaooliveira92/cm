/**
 * The per-Save career-mutation lock.
 *
 * Two operations move a career forward — the Calendar advance, and the commit of the human's
 * Matchday — and neither is idempotent. Two interleaved runs of either would lapse the same Bids,
 * resolve the same Matchday, recover the same squads twice, and at a Season's end roll the world
 * over twice. They share one lock rather than holding two, because taking different locks would let
 * an advance and a commit interleave, which is the same corruption by another route.
 *
 * One process owns every Save (ADR-0007's single-writer premise), so a module-level set is the whole
 * mechanism — there is no second process to coordinate with. SQLite serialises the individual
 * writes, which is exactly why this is needed anyway: serialised statements from two interleaved
 * advances are still two advances.
 */
import { AdvanceInProgressError, type SaveId } from "@cm-clone/contracts";
import { Effect } from "effect";

const advancesInFlight = new Set<SaveId>();

/**
 * Runs `body` while holding the Save's lock, refusing a second concurrent career mutation.
 *
 * `acquireUseRelease` rather than a try/finally: the release runs on success, on failure, and on
 * interruption, and it runs only if this call is the one that took the lock — a refused second
 * caller must not clear the first one's hold.
 */
export const withAdvanceLock =
  (saveId: SaveId) =>
  <A, E, R>(body: Effect.Effect<A, E, R>) =>
    Effect.acquireUseRelease(
      Effect.suspend(() =>
        advancesInFlight.has(saveId)
          ? Effect.fail(new AdvanceInProgressError({ saveId }))
          : Effect.sync(() => advancesInFlight.add(saveId)),
      ),
      () => body,
      () => Effect.sync(() => advancesInFlight.delete(saveId)),
    );
