import { randomUUID } from "node:crypto";
import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { SaveNotFoundError, SaveSummary } from "@cm-clone/contracts";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { createSchema } from "./schema.js";
import { startSeason } from "./season.js";
import { generateWorld } from "./worldGeneration.js";
import { initializeSeasonEconomy } from "./transfers.js";

const dbPath = (savesDir: string, id: string) => path.join(savesDir, `${id}.sqlite`);

const ensureSavesDir = (savesDir: string) =>
  Effect.promise(() => mkdir(savesDir, { recursive: true }));

/** All clubs in a save, ordered by insertion order (used by `createSave` compat shim). */
const loadAllClubs = Effect.gen(function* () {
  const sql = yield* SqlClient;
  return yield* sql<{ id: string; name: string }>`SELECT id, name FROM clubs ORDER BY rowid`;
});

const readSaveSummary = (filename: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql`SELECT id, name, created_at as "createdAt" FROM save_meta LIMIT 1`;
    return yield* Schema.decodeUnknownEffect(SaveSummary)(rows[0]);
  }).pipe(
    Effect.provide(SqliteClient.layer({ filename, readonly: true })),
    Effect.scoped,
  );

export const listSaves = (savesDir: string) =>
  Effect.gen(function* () {
    yield* ensureSavesDir(savesDir);
    const entries = yield* Effect.promise(() => readdir(savesDir));
    const files = entries.filter((entry) => entry.endsWith(".sqlite"));
    const summaries = yield* Effect.all(
      files.map((file) => readSaveSummary(path.join(savesDir, file)).pipe(Effect.option)),
    );
    return summaries.flatMap((summary) => (summary._tag === "Some" ? [summary.value] : []));
  });

/**
 * `beginCareer` — creates a provisional career world without committing a playable save.
 * Creates the schema, generates the complete neutral world (20 clubs, 500 players), and
 * initializes the season economy for all clubs. No `save_meta` row is written, so the
 * provisional save is invisible to `listSaves`. Returns the provisional save identifier.
 */
export const beginCareer = (savesDir: string) =>
  Effect.gen(function* () {
    yield* ensureSavesDir(savesDir);
    const id = randomUUID();
    const filename = dbPath(savesDir, id);

    yield* Effect.gen(function* () {
      yield* createSchema;
      yield* generateWorld;
      yield* initializeSeasonEconomy(1);
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped);

    return { id };
  });

export interface ManagerProfileParams {
  readonly managerName: string;
  readonly archetypeOrigin: string;
  readonly tacticalAcumen: number;
  readonly influence: number;
  readonly regimen: number;
  readonly technicalCoaching: number;
}

/**
 * `commitCareer` — atomically turns a provisional world into a playable career.
 * Marks the selected club as the user's, writes the manager profile, starts the season
 * (fixtures, fitness, Board Objective, manager status, AI tactics), and writes `save_meta`
 * last — so the career is only discoverable after a fully successful commitment.
 * Must be preceded by `beginCareer`.
 */
export const commitCareer = (
  savesDir: string,
  id: string,
  name: string,
  selectedClubId: string,
  managerProfile: ManagerProfileParams,
) =>
  Effect.gen(function* () {
    const filename = dbPath(savesDir, id);
    const createdAt = new Date().toISOString();

    yield* Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql`UPDATE clubs SET is_user_club = 1 WHERE id = ${selectedClubId}`;
      yield* sql`INSERT INTO manager_profile (id, manager_name, archetype_origin, tactical_acumen, influence, regimen, technical_coaching)
        VALUES (1, ${managerProfile.managerName}, ${managerProfile.archetypeOrigin},
          ${managerProfile.tacticalAcumen}, ${managerProfile.influence}, ${managerProfile.regimen}, ${managerProfile.technicalCoaching})`;
      yield* startSeason(id);
      yield* sql`INSERT INTO save_meta (id, name, created_at) VALUES (${id}, ${name}, ${createdAt})`;
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped);

    return new SaveSummary({ id, name, createdAt });
  });

/**
 * `discardCareer` — idempotently deletes a provisional or committed career file.
 * Safe to call more than once; a missing file is not an error.
 */
export const discardCareer = (savesDir: string, id: string) =>
  Effect.gen(function* () {
    yield* Effect.promise(() => rm(dbPath(savesDir, id)).catch(() => void 0));
  });

/**
 * Compat shim: old `createSave` behaviour as `beginCareer` + `commitCareer` in one call.
 * Selects the first club (by insertion order) as the user's club to replicate the historical
 * `is_user_club = index === 0` behaviour. Uses a default manager profile (Competent 3/3/3/3)
 * for backward compatibility with existing tests and the current renderer.
 */
export const createSave = (savesDir: string, name: string) =>
  Effect.gen(function* () {
    const { id } = yield* beginCareer(savesDir);
    const clubs = yield* loadAllClubs.pipe(
      Effect.provide(SqliteClient.layer({ filename: dbPath(savesDir, id) })),
      Effect.scoped,
    );
    const selectedClubId = clubs[0]?.id;
    if (!selectedClubId) {
      return yield* Effect.die(new Error("beginCareer produced no clubs — invariant violation"));
    }
    return yield* commitCareer(savesDir, id, name, selectedClubId, {
      managerName: name,
      archetypeOrigin: "custom",
      tacticalAcumen: 3,
      influence: 3,
      regimen: 3,
      technicalCoaching: 3,
    });
  });

export const loadSave = (savesDir: string, id: string) =>
  Effect.gen(function* () {
    const filename = dbPath(savesDir, id);
    const entries = yield* Effect.promise(() => readdir(savesDir));
    const exists = entries.includes(`${id}.sqlite`);
    if (!exists) {
      return yield* new SaveNotFoundError({ id });
    }
    return yield* readSaveSummary(filename);
  });