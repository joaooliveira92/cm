/**
 * Promotion, relegation and the rollover (ticket 13): clubs exchange along every link, the
 * frozen table survives, and the pyramid's ends stay closed.
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
import { createPyramidSnapshot, createRegionalSnapshot } from "../snapshot-helpers.js";
import { advanceCalendar } from "../../../src/main/season/index.js";
import { seasonHelpers } from "./helpers.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-season-rollover-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const { createCareerFrom, withSaveWrite, playUntilSeason } = seasonHelpers(() => savesDir);

/** Every competition's field for one season, keyed by competition, in frozen order where frozen. */
const loadFields = (saveId: string, seasonNumber: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{
      competitionId: string;
      clubId: string;
      finalPosition: number | null;
      points: number | null;
    }>`SELECT competition_id as "competitionId", club_id as "clubId",
              final_position as "finalPosition", points
       FROM competition_participants WHERE season_number = ${seasonNumber}
       ORDER BY competition_id ASC, final_position ASC, club_id ASC`;
    const fields = new Map<string, Array<(typeof rows)[number]>>();
    for (const row of rows) fields.set(row.competitionId, [...(fields.get(row.competitionId) ?? []), row]);
    return fields;
  }).pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`), readonly: true })),
    Effect.scoped,
  );


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
  600_000,
);

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
    yield* advanceCalendar(savesDir, save.id);
    deepStrictEqual(yield* loadFields(save.id, 1), frozen);
  }),
  240_000,
);

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
  600_000,
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
  600_000,
);
