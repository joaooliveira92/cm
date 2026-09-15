/**
 * Retention at the rollover (ticket 18) on worlds small enough to play in seconds: a past season's
 * summary reads from the frozen rows, and nothing but match streams is pruned.
 *
 * The two whole-pyramid retention assertions live in `retention-participation.test.ts` and
 * `retention-match-streams.test.ts`, one per file — see `rollover-exchange.test.ts` for why.
 */

import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { ok, strictEqual } from "node:assert";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../../../src/main/world/index.js";
import { getSeasonSummary } from "../../../src/main/season/index.js";
import { seasonHelpers } from "./helpers.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-season-retention-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const { withSaveWrite, playUntilSeason } = seasonHelpers(() => savesDir);


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
