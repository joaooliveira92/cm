import { describe, expect, it } from "vitest";
import { deriveId, deriveSeed } from "../src/seed.js";

describe("deriveSeed", () => {
  it("is a pure function of its parent seed and parts", () => {
    expect(deriveSeed(184726, "club", "Castlemere United")).toBe(
      deriveSeed(184726, "club", "Castlemere United"),
    );
  });

  it("separates a change of parent seed from a change of parts", () => {
    expect(deriveSeed(1, "club", "Castlemere United")).not.toBe(
      deriveSeed(2, "club", "Castlemere United"),
    );
    expect(deriveSeed(1, "club", "Castlemere United")).not.toBe(
      deriveSeed(1, "club", "Northgate Athletic"),
    );
  });

  it("does not collide across a shifted part boundary", () => {
    // Length-prefixed parts: "ab"+"c" and "a"+"bc" must not hash to the same stream, or a club
    // named for a concatenation of its neighbours' names would share their squad.
    expect(deriveSeed(1, "ab", "c")).not.toBe(deriveSeed(1, "a", "bc"));
  });

  it("distinguishes part order", () => {
    expect(deriveSeed(1, "club", "player")).not.toBe(deriveSeed(1, "player", "club"));
  });

  it("accepts numeric parts, so a squad slot index can seed a player", () => {
    expect(deriveSeed(1, "slot", 0)).not.toBe(deriveSeed(1, "slot", 1));
  });

  it("yields an unsigned 32-bit integer", () => {
    for (let i = 0; i < 200; i++) {
      const seed = deriveSeed(i, "club", `club-${i}`);
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it("holds its value across releases", () => {
    // Golden values. A change here changes every existing save's world for the same seed, so it is
    // a ruleset-version bump, not an incidental refactor.
    expect(deriveSeed(184726, "club", "Castlemere United")).toBe(1_586_330_877);
    expect(deriveId(184726, "club", "Castlemere United")).toBe("06e28791-6f03-4f07-8c41-f0861716df9d");
  });
});

describe("deriveId", () => {
  it("is stable for the same inputs", () => {
    expect(deriveId(184726, "club", "Castlemere United")).toBe(
      deriveId(184726, "club", "Castlemere United"),
    );
  });

  it("has the shape of a UUID, so branded id columns are unchanged", () => {
    expect(deriveId(184726, "club", "Castlemere United")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("does not collide across a realistic world's worth of entities", () => {
    const ids = new Set<string>();
    for (let club = 0; club < 20; club++) {
      ids.add(deriveId(184726, "club", `club-${club}`));
      for (let slot = 0; slot < 25; slot++) {
        ids.add(deriveId(184726, "player", `club-${club}`, slot));
      }
    }
    expect(ids.size).toBe(20 + 20 * 25);
  });
});
