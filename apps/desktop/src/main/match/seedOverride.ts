/**
 * The boot-time match seed override: how an e2e run pins the match a separate Electron main process
 * plays.
 *
 * `MatchSeedSource` is a `Context.Reference`, so a unit test pins a match with
 * `Effect.provideService`. Playwright cannot do that: it seeds saves in its own process, while the
 * match is started over RPC by the Electron main process it launched. The only channel into that
 * process at boot is its environment, so the override is read from `CMC_MATCH_SEED` there.
 *
 * It exists for tests alone. In a packaged build the variable is ignored, because honouring it would
 * reintroduce the re-rollable seed that deriving the match seed from the world and the Fixture was
 * introduced to remove. This module only parses and builds the layer; the `process.env` read and the
 * `app.isPackaged` gate live at the main-process entry.
 */
import { Layer } from "effect";
import { MatchSeedSource } from "./start.js";

/** Named after `CMC_LOG_LEVEL`, the main process's other boot-time override. */
export const MATCH_SEED_ENV = "CMC_MATCH_SEED";

/** The largest seed: the engine and `deriveSeed` both work in unsigned 32-bit integers. */
const MAX_SEED = 0xffff_ffff;

export type MatchSeedOverride =
  /** No variable: every match plays under its derived seed, exactly as in production. */
  | { readonly _tag: "Unset" }
  /** Every match this process starts plays under `seed`. */
  | { readonly _tag: "Pinned"; readonly seed: number }
  /** A packaged build: the variable is not a player-facing knob, whatever it holds. */
  | { readonly _tag: "IgnoredInPackagedBuild" }
  /** Not a seed. Reported rather than coerced: `Number("")` is 0 and `Number("1.5")` is not an
   *  integer, and either would quietly play a match the test never asked for. */
  | { readonly _tag: "Malformed"; readonly raw: string };

/**
 * Decides what the variable means. Pure, so the entry module stays a thin edge.
 *
 * The packaged check comes first, so a stray variable on a player's machine cannot stop the game
 * from starting.
 */
export const resolveMatchSeedOverride = (raw: string | undefined, isPackaged: boolean): MatchSeedOverride => {
  if (raw === undefined) return { _tag: "Unset" };
  if (isPackaged) return { _tag: "IgnoredInPackagedBuild" };
  if (!/^\d{1,10}$/.test(raw)) return { _tag: "Malformed", raw };
  const seed = Number(raw);
  return seed <= MAX_SEED ? { _tag: "Pinned", seed } : { _tag: "Malformed", raw };
};

/** Replaces the Fixture-derived seed with `seed` for every match started under this layer. */
export const pinnedMatchSeedLayer = (seed: number): Layer.Layer<never> =>
  Layer.succeed(MatchSeedSource, () => seed);
