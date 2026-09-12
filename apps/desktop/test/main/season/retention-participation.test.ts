/**
 * Retention at the rollover (ticket 18): the human's own competitions survive a concluded season
 * and the rest of the world's football is discarded.
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
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { createPyramidSnapshot } from "../snapshot-helpers.js";
import { seasonHelpers } from "./helpers.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-season-retention-participation-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const { createCareerFrom, withSaveWrite, playUntilSeason, survivingSeason } = seasonHelpers(() => savesDir);

it.effect("the rollover keeps the player's past and discards the world's", () =>
  Effect.gen(function* () {
    // A four-division pyramid, so there is a rival nation's worth of football to discard.
    const snapshotId = yield* createPyramidSnapshot(savesDir);
    const save = yield* createCareerFrom(snapshotId, 5150, "Retention");

    const before = yield* survivingSeason(save.id, 1);
    const playedIn = new Set(before.fixtures.map((row) => row.competitionId));
    ok(playedIn.size > 2, "the pyramid should schedule several competitions");

    ok(yield* playUntilSeason(save.id, 2), "the save should reach season 2");

    const after = yield* survivingSeason(save.id, 1);
    const kept = new Set(after.fixtures.map((row) => row.competitionId));

    // Participation is the rule: the human's own competitions survive, everything else is gone.
    const humanCompetitions = yield* withSaveWrite(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        const rows = yield* sql<{ competitionId: string }>`
          SELECT cp.competition_id as "competitionId" FROM competition_participants cp
          JOIN clubs c ON c.id = cp.club_id
          WHERE cp.season_number = 1 AND c.is_user_club = 1`;
        return new Set(rows.map((row) => row.competitionId));
      }),
    );

    deepStrictEqual([...kept].sort(), [...humanCompetitions].sort());
    ok(kept.size < playedIn.size, "a rival division's season should have been discarded");
  }),
  900_000,
);
