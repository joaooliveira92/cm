import { randomUUID } from "node:crypto";
import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { InvalidPillarDistributionError, SaveId, SaveNotFoundError, SaveSummary, type ClubId } from "@cm-clone/contracts";
import type { PillarDistribution } from "@cm-clone/shared";
import { Effect, Random, Schema } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { createSchema } from "./schema.js";
import { startSeason } from "./season.js";
import { deriveSeed } from "@cm-clone/game-engine";
import { generateWorld } from "./worldGeneration.js";
import { initializeSeasonEconomy } from "./transfers.js";
import { validatePillarDistribution } from "@cm-clone/shared";

const dbPath = (savesDir: string, id: SaveId) => path.join(savesDir, `${id}.sqlite`);

const ensureSavesDir = (savesDir: string) =>
  Effect.promise(() => mkdir(savesDir, { recursive: true }));

export interface WorldGenerationOptions {
  /** Omit to draw a fresh world; supply one to regenerate a known world exactly. */
  readonly worldSeed?: number;
  /** Omit to use the current year. */
  readonly referenceYear?: number;
}

/** The single point where a new world's entropy enters the system. */
const drawWorldSeed = Effect.map(Random.nextIntBetween(0, 0xffffffff), (seed) => seed >>> 0);

const currentYear = Effect.clockWith((clock) =>
  Effect.map(clock.currentTimeMillis, (millis) => new Date(millis).getUTCFullYear()),
);

/** All clubs in a save, ordered by insertion order (used by `createSave` compat shim). */
const loadAllClubs = Effect.gen(function* () {
  const sql = yield* SqlClient;
  return yield* sql<{ id: ClubId; name: string }>`SELECT id, name FROM clubs ORDER BY rowid`;
});

/** The Save List's row for one save file. `archivedCause` comes from `manager_status` rather than
 * `save_meta` because archiving is career state, not file metadata; the cross join is safe because
 * both tables hold exactly one row per save. It is read here so the Save List can mark an archived
 * save without opening the career (ticket 02). */
const readSaveSummary = (filename: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql`SELECT save_meta.id, save_meta.name, save_meta.created_at as "createdAt",
             manager_status.archived_cause as "archivedCause"
      FROM save_meta LEFT JOIN manager_status ON manager_status.id = 1 LIMIT 1`;
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
    // Each item opens its own SQLite connection and reads one row — genuinely IO-bound per file,
    // so overlapping them is a real win. Bounded rather than unbounded: a saves directory is
    // user-controlled and unbounded fan-out would open one file descriptor per save at once.
    const summaries = yield* Effect.forEach(
      files,
      (file) => readSaveSummary(path.join(savesDir, file)).pipe(Effect.option),
      { concurrency: 4 },
    );
    return summaries.flatMap((summary) => (summary._tag === "Some" ? [summary.value] : []));
  });

/**
 * `beginCareer` — creates a provisional career world without committing a playable save.
 * Creates the schema, generates the complete neutral world (20 clubs, 500 players), and
 * initializes the season economy for all clubs. No `save_meta` row is written, so the
 * provisional save is invisible to `listSaves`. Returns the provisional save identifier.
 *
 * This is the one place a world's entropy is drawn. Everything downstream — squads, opening
 * contracts, Season 1's fixtures — derives from the world seed recorded in `generation_manifest`,
 * so a save is reproducible from that single number. Pass an explicit `worldSeed` to regenerate a
 * known world (a bug report, a test fixture).
 */
export const beginCareer = (savesDir: string, options: WorldGenerationOptions = {}) =>
  Effect.gen(function* () {
    yield* ensureSavesDir(savesDir);
    const id = SaveId.make(randomUUID());
    const filename = dbPath(savesDir, id);

    const worldSeed = options.worldSeed ?? (yield* drawWorldSeed);
    const referenceYear = options.referenceYear ?? (yield* currentYear);

    yield* Effect.gen(function* () {
      yield* createSchema;
      yield* generateWorld({ worldSeed, referenceYear });
      yield* initializeSeasonEconomy(1, deriveSeed(worldSeed, "economy", 1));
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped);

    return { id };
  });

export interface ManagerProfileParams {
  readonly managerName: string;
  readonly archetypeOrigin: string;
  readonly pillars: PillarDistribution;
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
  id: SaveId,
  name: string,
  selectedClubId: ClubId,
  managerProfile: ManagerProfileParams,
) =>
  Effect.gen(function* () {
    const filename = dbPath(savesDir, id);
    const createdAt = new Date().toISOString();

    const pillarErrors = validatePillarDistribution(managerProfile.pillars);
    if (pillarErrors.length > 0) {
      return yield* new InvalidPillarDistributionError({ errors: pillarErrors });
    }

    yield* Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql`UPDATE clubs SET is_user_club = 1 WHERE id = ${selectedClubId}`;
      yield* sql`INSERT INTO manager_profile (id, manager_name, archetype_origin, tactical_acumen, influence, regimen, technical_coaching)
        VALUES (1, ${managerProfile.managerName}, ${managerProfile.archetypeOrigin},
          ${managerProfile.pillars.tacticalAcumen}, ${managerProfile.pillars.influence}, ${managerProfile.pillars.regimen}, ${managerProfile.pillars.technicalCoaching})`;
      yield* startSeason(id);
      yield* sql`INSERT INTO save_meta (id, name, created_at) VALUES (${id}, ${name}, ${createdAt})`;
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped);

    // A freshly committed career is never archived — `startSeason` writes `archived_cause` NULL.
    return new SaveSummary({ id, name, createdAt, archivedCause: null });
  });

/**
 * `discardCareer` — idempotently deletes a provisional or committed career file.
 * Safe to call more than once; a missing file is not an error.
 */
export const discardCareer = (savesDir: string, id: SaveId) =>
  Effect.promise(() => rm(dbPath(savesDir, id)).catch(() => void 0));

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
      pillars: { tacticalAcumen: 3, influence: 3, regimen: 3, technicalCoaching: 3 },
    });
  });

export const loadSave = (savesDir: string, id: SaveId) =>
  Effect.gen(function* () {
    const filename = dbPath(savesDir, id);
    const entries = yield* Effect.promise(() => readdir(savesDir));
    const exists = entries.includes(`${id}.sqlite`);
    if (!exists) {
      return yield* new SaveNotFoundError({ id });
    }
    return yield* readSaveSummary(filename);
  });