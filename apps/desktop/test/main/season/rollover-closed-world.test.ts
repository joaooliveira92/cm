/**
 * The pyramid's ends stay closed across the rollover (ticket 13): nothing drops out of the lowest
 * division and nothing climbs out of the highest.
 *
 * Its own file because it plays a four-division season — see `rollover-exchange.test.ts` for why
 * one whole-pyramid test per file is what keeps them off a shared worker.
 */

import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, ok } from "node:assert";
import { Effect } from "effect";
import { afterEach, beforeEach } from "vitest";
import { createPyramidSnapshot } from "../snapshot-helpers.js";
import { seasonHelpers } from "./helpers.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-season-rollover-closed-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const { createCareerFrom, playUntilSeason, loadFields } = seasonHelpers(() => savesDir);

it.effect("nothing drops out of the lowest division or climbs out of the highest", () =>
  Effect.gen(function* () {
    const snapshotId = yield* createPyramidSnapshot(savesDir);
    const save = yield* createCareerFrom(snapshotId, 5150, "Closed World");
    ok(yield* playUntilSeason(save.id, 2));

    const first = yield* loadFields(save.id, 1);
    const second = yield* loadFields(save.id, 2);

    // The world is closed at the edge of the chosen scope: every club in season 2 was in the world
    // in season 1, and every club in season 1 is still in it.
    const clubsIn = (fields: typeof first) =>
      new Set([...fields].filter(([id]) => !id.endsWith("_cup")).flatMap(([, field]) => field.map((row) => row.clubId)));
    deepStrictEqual([...clubsIn(second)].sort(), [...clubsIn(first)].sort());
  }),
  900_000,
);
