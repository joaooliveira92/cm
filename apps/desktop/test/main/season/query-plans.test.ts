/**
 * The two indexes (ticket 19). An index has exactly one observable effect — the query plan
 * SQLite chooses — so these specs read that plan rather than timing anything.
 */

import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, ok } from "node:assert";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../../../src/main/world/index.js";
import { getSquad } from "../../../src/main/club/index.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-season-query-plans-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

/** SQLite's own account of how it would run a query. The only observable effect an index has. */
const queryPlan = (saveId: string, query: string, params: ReadonlyArray<unknown>) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql.unsafe<{ detail: string }>(`EXPLAIN QUERY PLAN ${query}`, [...params] as never);
    return rows.map((row) => row.detail).join(" | ");
  }).pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`), readonly: true })),
    Effect.scoped,
  );

it.effect("opening a squad uses the club index rather than scanning every player in the world", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Indexes");
    const squad = yield* getSquad(savesDir, save.id);

    const plan = yield* queryPlan(
      save.id,
      `SELECT p.id FROM players p WHERE p.club_id = ?`,
      [squad.club.id],
    );

    // The scan this replaces is proportional to the whole world rather than to the eighteen rows
    // it wants: 127 ms against 0.9 ms at 400,000 players.
    ok(plan.includes("players_club_id_idx"), plan);
    ok(!plan.includes("SCAN players"), plan);
  }),
  60_000,
);

it.effect("a league table reads one competition's fixtures, through the index", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Indexes");

    const plan = yield* queryPlan(
      save.id,
      `SELECT home_club_id, away_club_id, home_goals, away_goals FROM fixtures
       WHERE season_number = ? AND competition_id = ? AND played = 1`,
      [1, "comp_eng_1"],
    );

    // The index only pays because the query names its competition. Without that predicate the
    // scan reads every played fixture in the save — 302 ms at 400,000 players.
    ok(plan.includes("fixtures_competition_season_played_idx"), plan);
    ok(!plan.includes("SCAN fixtures"), plan);
  }),
  60_000,
);

it.effect("carries exactly three indexes, each one a recorded decision", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Indexes");

    const indexes = yield* Effect.gen(function* () {
      const sql = yield* SqlClient;
      // Two exclusions, both principled. `sql IS NULL` is the automatic index SQLite builds for a
      // primary key, which nobody chose. A `UNIQUE` index is a constraint — it is there to make a
      // state unreachable, not to make a read fast — so it is not one of the two this counts.
      return yield* sql<{ name: string }>`
        SELECT name FROM sqlite_master
        WHERE type = 'index' AND sql IS NOT NULL AND sql NOT LIKE '%UNIQUE%'
        ORDER BY name`;
    }).pipe(
      Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${save.id}.sqlite`), readonly: true })),
      Effect.scoped,
    );

    // The third was added by open question 22 rather than by whoever happened to be writing the
    // migration, which is exactly what this assertion exists to force.
    deepStrictEqual(
      indexes.map((row) => row.name),
      [
        "fixtures_competition_season_played_idx",
        "player_transfers_player_date_idx",
        "players_club_id_idx",
      ],
    );
  }),
  60_000,
);
