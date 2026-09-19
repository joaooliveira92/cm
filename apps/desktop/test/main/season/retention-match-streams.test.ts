/**
 * Retention at the rollover (ticket 18): a match stream is pruned exactly when its fixture goes.
 *
 * Its own file because it plays a four-division season — see `rollover-exchange.test.ts` for why
 * one whole-pyramid test per file is what keeps them off a shared worker.
 */

import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { ok } from "node:assert";
import { Effect } from "effect";
import { afterEach, beforeEach } from "vitest";
import { createPyramidSnapshot } from "../snapshot-helpers.js";
import { seasonHelpers } from "./helpers.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-season-retention-streams-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const { createCareerFrom, playUntilSeason, survivingSeason } = seasonHelpers(() => savesDir);

it.effect("prunes a match stream exactly when its fixture goes", () =>
  Effect.gen(function* () {
    const snapshotId = yield* createPyramidSnapshot(savesDir);
    const save = yield* createCareerFrom(snapshotId, 5150, "Retention");
    ok(yield* playUntilSeason(save.id, 2));

    const after = yield* survivingSeason(save.id, 1);
    const surviving = new Set(after.allFixtureIds);

    // A match stream is keyed on its fixture, so the log never outlives the thing it describes.
    for (const streamId of after.streamIds) {
      ok(surviving.has(streamId), `a match stream survived its deleted fixture: ${streamId}`);
    }
  }),
  900_000,
);
