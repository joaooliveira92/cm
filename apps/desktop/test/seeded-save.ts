/**
 * `createSave`, with the world pinned.
 *
 * Every spec imports `createSave` from here rather than from `src/main/world`, because the real one
 * draws its world seed at random and takes its reference year from the clock — correct for a career
 * the player starts, wrong for a test. A spec built on the unseeded shim plays a *different world
 * on every run*, so any defect reachable on only some worlds surfaces as a flake that moves between
 * files and passes on re-run: ticket 05 chased exactly that, and the answer was that nothing leaked
 * between tests at all. See `.scratch/gate-red-on-dev/issues/05-match-not-ready-flake.md`.
 *
 * A spec that needs a specific world passes its own seed — `youth-intake-sweep.test.ts` plays the
 * worlds whose human club used to fall below eleven. A spec that only needs *a* world takes the default and
 * gets the same one every run, on every machine.
 */
import { createSave as createUnseededSave } from "../src/main/world/index.js";

/** The world every spec plays unless it names another. Arbitrary, and deliberately fixed. */
export const TEST_WORLD_SEED = 1;

/**
 * Pinned too, and for the same reason: the shim's reference year defaults to the system clock, so
 * an unpinned suite quietly regenerates every player's age on 1 January.
 */
export const TEST_REFERENCE_YEAR = 2026;

export const createSave = (
  savesDir: string,
  name: string,
  userDataDir?: string,
  generation?: { readonly worldSeed?: number; readonly referenceYear?: number },
) =>
  createUnseededSave(savesDir, name, userDataDir, {
    worldSeed: generation?.worldSeed ?? TEST_WORLD_SEED,
    referenceYear: generation?.referenceYear ?? TEST_REFERENCE_YEAR,
  });
