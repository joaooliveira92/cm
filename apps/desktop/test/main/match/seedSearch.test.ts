/**
 * Proves the repin helper finds seeds with a named property, so a future engine change can repin a
 * constant by importing it rather than re-deriving the enumeration by hand.
 */
import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { ok, strictEqual } from "node:assert";
import { Effect } from "effect";
import { afterEach, beforeEach } from "vitest";
import { findMatchSeeds } from "./seedSearch.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-seed-search-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

it.effect("finds seeds whose derived match satisfies the predicate", () =>
  Effect.gen(function* () {
    const seeds = yield* findMatchSeeds(
      savesDir,
      (events) => events.some((event) => event._tag === "Injury"),
      { maxSeed: 60, limit: 3 },
    );

    ok(seeds.length > 0, "some early seed injures somebody");
    for (const { seed, events } of seeds) {
      ok(seed >= 1 && seed <= 60, `seed ${seed} is in range`);
      ok(events.some((event) => event._tag === "Injury"), `seed ${seed} has an Injury`);
    }
    strictEqual(new Set(seeds.map((s) => s.seed)).size, seeds.length, "seeds are distinct");
  }),
);