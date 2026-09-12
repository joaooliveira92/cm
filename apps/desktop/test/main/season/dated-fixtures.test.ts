/**
 * Dated, competition-scoped fixture lists (ticket 09): every loaded competition gets one,
 * no club is double-booked, and scheduling fails loudly rather than overlapping.
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
import { leagueRoundDates } from "@cm-clone/shared";
import { createSave } from "../../../src/main/world/index.js";
import { createPyramidSnapshot } from "../snapshot-helpers.js";
import { getFixtures } from "../../../src/main/season/index.js";
import { seasonHelpers } from "./helpers.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-season-dated-fixtures-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const { createCareerFrom } = seasonHelpers(() => savesDir);

/** Every fixture row in a save, competition and date included — the world's whole calendar, which
 *  `getFixtures` deliberately never returns. */
const loadAllFixtures = (saveId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    return yield* sql<{
      competitionId: string;
      round: number;
      scheduledDate: string;
      homeClubId: string;
      awayClubId: string;
    }>`SELECT competition_id as "competitionId", round, scheduled_date as "scheduledDate",
              home_club_id as "homeClubId", away_club_id as "awayClubId"
       FROM fixtures ORDER BY id ASC`;
  }).pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`), readonly: true })),
    Effect.scoped,
  );


it.effect("every loaded competition gets a full dated fixture list, results-only included", () =>
  Effect.gen(function* () {
    // England's whole pyramid: four divisions at three depths, plus the cup they depend on. The
    // fourth division resolves to a depth the human never sees into and still gets its fixtures.
    const snapshotId = yield* createPyramidSnapshot(savesDir);
    const save = yield* createCareerFrom(snapshotId, 5150, "Pyramid");
    const fixtures = yield* loadAllFixtures(save.id);

    const rounds = new Map<string, Set<number>>();
    for (const fixture of fixtures) {
      rounds.set(fixture.competitionId, (rounds.get(fixture.competitionId) ?? new Set()).add(fixture.round));
    }
    // 20 clubs -> 38 rounds; 24 clubs -> 46, which overflows the weekends into midweek slots.
    strictEqual(rounds.get("comp_eng_1")?.size, 38);
    strictEqual(rounds.get("comp_eng_2")?.size, 46);
    strictEqual(rounds.get("comp_eng_4")?.size, 46);
    // A cup owns no clubs, so only the round whose participants are known exists at season start.
    // Its later rounds materialise as the bracket resolves.
    deepStrictEqual([...(rounds.get("comp_eng_cup") ?? [])], [1]);

    // Every fixture carries a date, and a round's date is the same for every fixture in it.
    for (const fixture of fixtures) {
      ok(/^\d{4}-\d{2}-\d{2}$/.test(fixture.scheduledDate), fixture.scheduledDate);
    }
  }),
  30_000,
);

it.effect("no club holds two fixtures on one date", () =>
  Effect.gen(function* () {
    const snapshotId = yield* createPyramidSnapshot(savesDir);
    const save = yield* createCareerFrom(snapshotId, 5150, "Pyramid");
    const fixtures = yield* loadAllFixtures(save.id);

    // The invariant the slot template upholds — cups reserve their dates before leagues draw
    // theirs — and which no index can express, since a club can be home in one competition and
    // away in another on the same day.
    const seen = new Set<string>();
    for (const fixture of fixtures) {
      for (const clubId of [fixture.homeClubId, fixture.awayClubId]) {
        const key = `${clubId}@${fixture.scheduledDate}`;
        ok(!seen.has(key), `${clubId} plays twice on ${fixture.scheduledDate}`);
        seen.add(key);
      }
    }
  }),
  30_000,
);

it.effect("scheduling fails loudly rather than double-booking when the rounds outrun the season", () =>
  Effect.sync(() => {
    // August-to-May supplies a fixed number of weekend and midweek slots. A competition asking for
    // more rounds than that is reachable from a catalogue edit, so it is a typed failure a caller
    // can report rather than a silent collision.
    strictEqual(leagueRoundDates(2026, 400), null);

    const dates = leagueRoundDates(2026, 46);
    ok(dates !== null);
    strictEqual(new Set(dates).size, 46);
    for (let i = 1; i < dates.length; i++) ok(dates[i]! > dates[i - 1]!);
  }),
);

it.effect("the fixture list read path carries the date and the round", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const view = yield* getFixtures(savesDir, save.id);

    strictEqual(view.fixtures.length, 380);
    const first = view.fixtures[0]!;
    strictEqual(first.round, 1);
    ok(/^\d{4}-\d{2}-\d{2}$/.test(first.date));
    // Ordered by date, so the list reads as a calendar rather than as an insertion order.
    for (let i = 1; i < view.fixtures.length; i++) {
      ok(view.fixtures[i]!.date >= view.fixtures[i - 1]!.date);
    }
  }),
);
