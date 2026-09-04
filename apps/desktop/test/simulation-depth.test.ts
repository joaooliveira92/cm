import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { it } from "@effect/vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach, describe } from "vitest";
import { NationId, NationSelectionIntentPayload, ScopeOptionId } from "@cm-clone/contracts";
import { beginCareer, commitCareer } from "../src/main/saves.js";
import { advanceCalendar } from "../src/main/season.js";
import { createSnapshotFor } from "./snapshot-helpers.js";

/**
 * Simulation Depth's whole footprint on disk.
 *
 * Depth is not a column anywhere below `competitions`. It shows up as whether the five tables
 * beneath a club have rows in them, and nothing else — which is what lets a club change Depth
 * without its own row being converted, and what lets every sweep read the rows rather than branch
 * on a Depth value.
 */

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-depth-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

const intent = (nationId: string, scopeOptionId: string, mode: string) =>
  new NationSelectionIntentPayload({
    nationId: NationId.make(nationId),
    mode: mode as "playable" | "background" | "view_only",
    scopeOptionId: ScopeOptionId.make(scopeOptionId),
    source: "user",
  });

/** England playable, Germany at the depth under test — so one save holds both sides of the line. */
const careerWithGermanyAt = (mode: string, worldSeed: number) =>
  Effect.gen(function* () {
    const snapshotId = yield* createSnapshotFor(savesDir, [
      intent("nation_eng", "scope_eng_top", "playable"),
      intent("nation_deu", "scope_deu_top", mode),
    ]);
    const { id } = yield* beginCareer(savesDir, {
      worldSeed,
      referenceYear: 2026,
      userDataDir: savesDir,
      snapshotId,
    });
    return id;
  });

/** The same career, committed to a club — which is what starts the season and its fixture list. */
const committedCareerWithGermanyAt = (mode: string, worldSeed: number) =>
  Effect.gen(function* () {
    const saveId = yield* careerWithGermanyAt(mode, worldSeed);
    const clubId = yield* withSave(
      saveId,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        const rows = yield* sql<{ id: string }>`SELECT id FROM clubs WHERE id LIKE 'club_eng_1_%' ORDER BY id LIMIT 1`;
        return rows[0]!.id;
      }),
    );
    yield* commitCareer(savesDir, saveId, "Depth Career", clubId, {
      managerName: "Depth Career",
      archetypeOrigin: "custom",
      pillars: { tacticalAcumen: 3, influence: 3, regimen: 3, technicalCoaching: 3 },
    });
    return saveId;
  });

/** The five tables beneath a club, and how many rows each holds for one club. */
const rowCountsFor = (clubId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const count = (query: ReadonlyArray<{ readonly n: number }>) => query[0]?.n ?? 0;
    return {
      players: count(yield* sql<{ n: number }>`SELECT COUNT(*) as "n" FROM players WHERE club_id = ${clubId}`),
      positions: count(
        yield* sql<{ n: number }>`SELECT COUNT(*) as "n" FROM player_positions pp
          JOIN players p ON p.id = pp.player_id WHERE p.club_id = ${clubId}`,
      ),
      contracts: count(
        yield* sql<{ n: number }>`SELECT COUNT(*) as "n" FROM contracts c
          JOIN players p ON p.id = c.player_id WHERE p.club_id = ${clubId}`,
      ),
      fitness: count(
        yield* sql<{ n: number }>`SELECT COUNT(*) as "n" FROM player_fitness f
          JOIN players p ON p.id = f.player_id WHERE p.club_id = ${clubId}`,
      ),
      tactics: count(yield* sql<{ n: number }>`SELECT COUNT(*) as "n" FROM tactics WHERE club_id = ${clubId}`),
    };
  });

const clubRow = (clubId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<Record<string, unknown>>`SELECT * FROM clubs WHERE id = ${clubId}`;
    return rows[0];
  });

const GERMAN_CLUB = "club_deu_1_01";

describe("a results-only club", () => {
  it.effect("holds no rows in the five tables beneath it", () =>
    Effect.gen(function* () {
      const saveId = yield* careerWithGermanyAt("view_only", 5150);
      const counts = yield* withSave(saveId, rowCountsFor(GERMAN_CLUB));

      deepStrictEqual(counts, { players: 0, positions: 0, contracts: 0, fitness: 0, tactics: 0 });
    }),
    60_000,
  );

  it.effect("has the same club row — hometown included — as the same club with a squad", () =>
    Effect.gen(function* () {
      // The same world seed and the same selection but for Germany's depth, so any difference in
      // the club row is Depth conditioning something it must not condition.
      const shallow = yield* careerWithGermanyAt("view_only", 5150);
      const deep = yield* careerWithGermanyAt("background", 5150);

      const shallowRow = yield* withSave(shallow, clubRow(GERMAN_CLUB));
      const deepRow = yield* withSave(deep, clubRow(GERMAN_CLUB));

      ok(shallowRow !== undefined, "the results-only club should still exist as a row");
      deepStrictEqual(shallowRow, deepRow);
      ok(shallowRow!["city_id"] !== null, "a results-only club still has a hometown");
    }),
    60_000,
  );
});

describe("full and standard are byte-identical on disk", () => {
  it.effect("writes no table for a playable club that it does not write for a background one", () =>
    Effect.gen(function* () {
      const saveId = yield* careerWithGermanyAt("background", 5150);

      const english = yield* withSave(saveId, rowCountsFor("club_eng_1_01"));
      const german = yield* withSave(saveId, rowCountsFor(GERMAN_CLUB));

      for (const table of Object.keys(english) as Array<keyof typeof english>) {
        ok(
          english[table] > 0 === german[table] > 0,
          `${table}: playable wrote ${english[table]} rows, background wrote ${german[table]}`,
        );
      }
    }),
    60_000,
  );
});

describe("a results-only competition still plays its season", () => {
  it.effect("resolves its fixtures without the match engine touching a player", () =>
    Effect.gen(function* () {
      const saveId = yield* committedCareerWithGermanyAt("view_only", 5150);

      for (let advance = 0; advance < 4; advance += 1) {
        yield* advanceCalendar(savesDir, saveId);
      }

      const resolved = yield* withSave(
        saveId,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          const fixtures = yield* sql<{ n: number; goals: number }>`
            SELECT COUNT(*) as "n", COALESCE(SUM(home_goals + away_goals), 0) as "goals"
            FROM fixtures WHERE competition_id = 'comp_deu_1' AND played = 1`;
          // The engine's only lasting trace is what it writes about players. A results-only
          // competition has none to write about, so a row here would mean the engine ran.
          const fitness = yield* sql<{ n: number }>`
            SELECT COUNT(*) as "n" FROM player_fitness f
            JOIN players p ON p.id = f.player_id
            JOIN competition_participants cp ON cp.club_id = p.club_id
            WHERE cp.competition_id = 'comp_deu_1'`;
          return { fixtures: fixtures[0]!, fitness: fitness[0]!.n };
        }),
      );

      ok(resolved.fixtures.n > 0, "the results-only league should have played fixtures");
      ok(resolved.fixtures.goals > 0, "and they should have produced real scorelines");
      strictEqual(resolved.fitness, 0);
    }),
    120_000,
  );
});
