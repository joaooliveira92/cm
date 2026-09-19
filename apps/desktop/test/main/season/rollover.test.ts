/**
 * The rollover on worlds small enough to play in seconds (ticket 13): the frozen table survives
 * into the next season, and a division fed by two parallel regional divisions exchanges with both.
 *
 * The two whole-pyramid rollover assertions live in `rollover-exchange.test.ts` and
 * `rollover-closed-world.test.ts`, one per file — see `rollover-exchange.test.ts` for why.
 */

import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../../../src/main/world/index.js";
import { createRegionalSnapshot } from "../snapshot-helpers.js";
import { advanceThroughBoundary } from "../boundary-helpers.js";
import { seasonHelpers } from "./helpers.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-season-rollover-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const { createCareerFrom, withSaveWrite, playUntilSeason, loadFields } = seasonHelpers(() => savesDir);

it.effect("the frozen table survives into the next season unchanged", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Rollover");
    ok(yield* playUntilSeason(save.id, 2));

    const frozen = yield* loadFields(save.id, 1);
    const league = frozen.get("comp_eng_1")!;
    // Every club has a final position, and they are exactly 1..20 with no gaps or repeats.
    deepStrictEqual(
      league.map((row) => row.finalPosition),
      Array.from({ length: league.length }, (_, index) => index + 1),
    );
    ok(league.every((row) => row.points !== null));

    // Season 2's football does not touch it: the previous season's table is readable without
    // recomputing anything from fixtures that have since been replaced.
    yield* advanceThroughBoundary(savesDir, save.id);
    deepStrictEqual(yield* loadFields(save.id, 1), frozen);
  }),
  240_000,
);

it.effect("a division fed by two parallel regional divisions exchanges with both", () =>
  Effect.gen(function* () {
    const snapshotId = yield* createRegionalSnapshot(savesDir);
    const save = yield* createCareerFrom(snapshotId, 5150, "Regional");
    ok(yield* playUntilSeason(save.id, 2));

    const links = yield* withSaveWrite(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        return yield* sql<{ higher: string; lower: string; slots: number }>`
          SELECT higher_competition_id as "higher", lower_competition_id as "lower", slots
          FROM competition_links ORDER BY lower_competition_id ASC`;
      }),
    );
    const parallel = links.filter((link) => link.higher === links[0]!.higher);
    ok(parallel.length >= 2, "the regional scope should have two divisions feeding one");

    const first = yield* loadFields(save.id, 1);
    const second = yield* loadFields(save.id, 2);
    for (const link of parallel) {
      const before = new Set((first.get(link.lower) ?? []).map((row) => row.clubId));
      const after = new Set((second.get(link.lower) ?? []).map((row) => row.clubId));
      strictEqual(before.size, after.size, `${link.lower} changed size`);
      ok(
        [...before].some((clubId) => !after.has(clubId)),
        `${link.lower} promoted nobody into the division above`,
      );
    }
  }),
  900_000,
);
