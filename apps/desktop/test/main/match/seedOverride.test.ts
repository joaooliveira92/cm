import { describe, expect, it } from "vitest";
import { FixtureId } from "@cm-clone/contracts";
import { Effect } from "effect";
import {
  MatchSeedSource,
  deriveFixtureMatchSeed,
  pinnedMatchSeedLayer,
  resolveMatchSeedOverride,
} from "../../../src/main/match/index.js";

const WORLD_SEED = 20260906;
const FIXTURE = FixtureId.make(7);

/** The seed `startMatch` would draw for `FIXTURE` under whatever `MatchSeedSource` is in scope. */
const seedInScope = Effect.gen(function* () {
  const seedFor = yield* MatchSeedSource;
  return seedFor(WORLD_SEED, FIXTURE);
});

describe("resolveMatchSeedOverride", () => {
  it("leaves the derived seed in charge when the variable is absent", () => {
    expect(resolveMatchSeedOverride(undefined, false)).toEqual({ _tag: "Unset" });
    expect(resolveMatchSeedOverride(undefined, true)).toEqual({ _tag: "Unset" });
  });

  it("pins a decimal integer inside the engine's unsigned 32-bit seed range", () => {
    expect(resolveMatchSeedOverride("1", false)).toEqual({ _tag: "Pinned", seed: 1 });
    expect(resolveMatchSeedOverride("0", false)).toEqual({ _tag: "Pinned", seed: 0 });
    expect(resolveMatchSeedOverride("4294967295", false)).toEqual({ _tag: "Pinned", seed: 4294967295 });
  });

  it.each(["", " 1", "1 ", "-1", "1.5", "1e3", "0x10", "abc", "NaN", "4294967296", "99999999999999999999"])(
    "reports %j as malformed rather than coercing it",
    (raw) => {
      expect(resolveMatchSeedOverride(raw, false)).toEqual({ _tag: "Malformed", raw });
    },
  );

  it("ignores the variable in a packaged build, well-formed or not", () => {
    expect(resolveMatchSeedOverride("1", true)).toEqual({ _tag: "IgnoredInPackagedBuild" });
    expect(resolveMatchSeedOverride("abc", true)).toEqual({ _tag: "IgnoredInPackagedBuild" });
  });
});

describe("pinnedMatchSeedLayer", () => {
  it("replaces the derivation for every Fixture while it is provided", async () => {
    const pinned = await Effect.runPromise(seedInScope.pipe(Effect.provide(pinnedMatchSeedLayer(1))));
    expect(pinned).toBe(1);
  });

  it("is the only way the seed moves: without it the Fixture's derived seed stands", async () => {
    const derived = await Effect.runPromise(seedInScope);
    expect(derived).toBe(deriveFixtureMatchSeed(WORLD_SEED, FIXTURE));
  });
});
