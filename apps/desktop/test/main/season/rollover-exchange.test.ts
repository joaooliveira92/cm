/**
 * Promotion and relegation across a whole pyramid season (ticket 13): clubs exchange along every
 * link and no division changes size.
 *
 * Its own file because it plays a four-division season, which costs ~6 minutes. vitest parallelises
 * across files but never within one, so a whole-pyramid test sharing a file with another one puts
 * both on a single worker and makes their sum the suite's critical path. One per file is what keeps
 * them concurrent — see `helpers.ts`.
 */

import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { ok, strictEqual } from "node:assert";
import { Effect } from "effect";
import { afterEach, beforeEach } from "vitest";
import { createPyramidSnapshot } from "../snapshot-helpers.js";
import { seasonHelpers } from "./helpers.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-season-rollover-exchange-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const { createCareerFrom, playUntilSeason, loadFields } = seasonHelpers(() => savesDir);

it.effect("the rollover exchanges clubs along every link and keeps each division the same size", () =>
  Effect.gen(function* () {
    const snapshotId = yield* createPyramidSnapshot(savesDir);
    const save = yield* createCareerFrom(snapshotId, 5150, "Rollover");
    ok(yield* playUntilSeason(save.id, 2), "the save should reach season 2");

    const first = yield* loadFields(save.id, 1);
    const second = yield* loadFields(save.id, 2);

    for (const [competitionId, field] of first) {
      if (competitionId.endsWith("_cup")) continue;
      strictEqual(
        second.get(competitionId)?.length,
        field.length,
        `${competitionId} changed size across the rollover`,
      );
    }

    // Somebody actually moved: a rollover that exchanged nobody would satisfy the count check.
    const movers = [...first].filter(([competitionId, field]) => {
      if (competitionId.endsWith("_cup")) return false;
      const next = new Set((second.get(competitionId) ?? []).map((row) => row.clubId));
      return field.some((row) => !next.has(row.clubId));
    });
    ok(movers.length > 0, "at least one division should have exchanged clubs");
  }),
  // A whole pyramid season, and a season is now ~38 presses of Continue that each reach a boundary,
  // play the human's Fixture and commit the Matchday, where one press used to resolve it headlessly.
  900_000,
);
