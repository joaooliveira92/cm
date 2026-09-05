/**
 * Retention at the rollover (ticket 18): what survives of a concluded season on disk, and
 * what is pruned with it.
 */

import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../../../src/main/world/index.js";
import { createPyramidSnapshot } from "../snapshot-helpers.js";
import { getSeasonSummary } from "../../../src/main/season/index.js";
import { seasonHelpers } from "./helpers.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-season-retention-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const { createCareerFrom, withSaveWrite, playUntilSeason } = seasonHelpers(() => savesDir);

/** What survives of a season on disk: its fixtures by competition, and its match streams. */
const survivingSeason = (saveId: string, seasonNumber: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const fixtures = yield* sql<{ competitionId: string; id: number }>`
      SELECT competition_id as "competitionId", id FROM fixtures
      WHERE season_number = ${seasonNumber} ORDER BY id ASC`;
    const streams = yield* sql<{ streamId: string }>`
      SELECT DISTINCT stream_id as "streamId" FROM events WHERE stream_type = 'match'`;
    return { fixtures, streamIds: streams.map((row) => row.streamId) };
  }).pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`), readonly: true })),
    Effect.scoped,
  );

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

it.effect("prunes a match stream exactly when its fixture goes", () =>
  Effect.gen(function* () {
    const snapshotId = yield* createPyramidSnapshot(savesDir);
    const save = yield* createCareerFrom(snapshotId, 5150, "Retention");
    ok(yield* playUntilSeason(save.id, 2));

    const after = yield* survivingSeason(save.id, 1);
    const surviving = new Set(after.fixtures.map((row) => String(row.id)));

    // A match stream is keyed on its fixture, so the log never outlives the thing it describes.
    for (const streamId of after.streamIds) {
      ok(surviving.has(streamId), `a match stream survived its deleted fixture: ${streamId}`);
    }
  }),
  900_000,
);

it.effect("reads a past season's summary from the frozen rows, not from its fixtures", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Retention");
    ok(yield* playUntilSeason(save.id, 2));

    // Delete every fixture of season 1, which is what the rollover does to a competition the human
    // did not play in. The summary is sourced from the frozen participant rows, so it still reads.
    yield* withSaveWrite(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        yield* sql`DELETE FROM events WHERE stream_type = 'match'`;
        yield* sql`DELETE FROM fixtures WHERE season_number = 1`;
      }),
    );

    const summary = yield* getSeasonSummary(savesDir, save.id);
    strictEqual(summary.boardObjective?.seasonNumber, 1);
    strictEqual(summary.standings.length, 20);
    // The four frozen columns are the ones that decide a table, and they are all still here.
    ok(summary.standings.every((row) => row.clubName.length > 0));
    ok(summary.standings[0]!.points >= summary.standings.at(-1)!.points);
    strictEqual(
      summary.standings[0]!.goalsAgainst,
      summary.standings[0]!.goalsFor - summary.standings[0]!.goalDifference,
    );
  }),
  240_000,
);

it.effect("prunes nothing else from the log", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Retention");

    const seasonEventsBefore = yield* withSaveWrite(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        const rows = yield* sql<{ count: number }>`
          SELECT COUNT(*) as "count" FROM events WHERE stream_type <> 'match'`;
        return rows[0]!.count;
      }),
    );

    ok(yield* playUntilSeason(save.id, 2));

    const seasonEventsAfter = yield* withSaveWrite(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        const rows = yield* sql<{ count: number }>`
          SELECT COUNT(*) as "count" FROM events WHERE stream_type <> 'match'`;
        return rows[0]!.count;
      }),
    );

    // The career's own narrative is never pruned — only match streams follow their fixtures.
    ok(seasonEventsAfter >= seasonEventsBefore, `${seasonEventsBefore} -> ${seasonEventsAfter}`);
  }),
  240_000,
);
