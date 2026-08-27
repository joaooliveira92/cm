import { randomUUID } from "node:crypto";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { SaveNotFoundError, SaveSummary } from "@cm-clone/contracts";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { createSchema } from "./schema.js";
import { startSeason } from "./season.js";
import { generateWorld } from "./worldGeneration.js";

const dbPath = (savesDir: string, id: string) => path.join(savesDir, `${id}.sqlite`);

const ensureSavesDir = (savesDir: string) =>
  Effect.promise(() => mkdir(savesDir, { recursive: true }));

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

export const createSave = (savesDir: string, name: string) =>
  Effect.gen(function* () {
    yield* ensureSavesDir(savesDir);
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const filename = dbPath(savesDir, id);

    yield* Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* createSchema;
      yield* sql`INSERT INTO save_meta (id, name, created_at) VALUES (${id}, ${name}, ${createdAt})`;
      yield* generateWorld;
      yield* startSeason(id);
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped);

    return new SaveSummary({ id, name, createdAt });
  });

export const loadSave = (savesDir: string, id: string) =>
  Effect.gen(function* () {
    const filename = dbPath(savesDir, id);
    const exists = yield* Effect.promise(() =>
      readdir(savesDir).then((entries) => entries.includes(`${id}.sqlite`)),
    );
    if (!exists) {
      return yield* new SaveNotFoundError({ id });
    }
    return yield* readSaveSummary(filename);
  });
