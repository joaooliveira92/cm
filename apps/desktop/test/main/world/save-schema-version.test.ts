import { copyFileSync, mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { it } from "@effect/vitest";
import { ok, strictEqual } from "node:assert";
import { Effect } from "effect";
import { afterEach, beforeEach } from "vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { SaveId, SaveSchemaMismatchError } from "@cm-clone/contracts";
import { listSaves, loadSave } from "../../../src/main/world/index.js";
import { readSchemaVersion, SAVE_SCHEMA_VERSION } from "../../../src/main/db/schemaVersion.js";
import { createSave } from "../../seeded-save.js";

/**
 * Saves are disposable during development (Agent Note): a save only opens under the schema that
 * made it. The fixture is a real save written on 2026-09-02, rows stripped, schema untouched — it
 * lacks 67 columns the current schema has, and its `user_version` is 0. A save this test created
 * itself would carry the current schema and could not catch the defect this guards against.
 */
const FIXTURE = fileURLToPath(
  new URL("../../fixtures/saves/older-schema-2026-09-02.sqlite", import.meta.url),
);
const FIXTURE_ID = SaveId.make("58338e1c-ee8a-4d51-860d-11a211cb4819");

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-schema-version-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

it.effect("a save made under an older schema is listed, and refused on open with a typed error", () =>
  Effect.gen(function* () {
    // Copied, never opened in place: SQLite would leave -shm files beside the committed fixture.
    copyFileSync(FIXTURE, path.join(savesDir, `${FIXTURE_ID}.sqlite`));

    const saves = yield* listSaves(savesDir);
    strictEqual(saves.length, 1);
    strictEqual(saves[0]?.id, FIXTURE_ID);

    const error = yield* Effect.flip(loadSave(savesDir, FIXTURE_ID));
    ok(error instanceof SaveSchemaMismatchError, `expected SaveSchemaMismatchError, got ${String(error)}`);
    strictEqual(error.id, FIXTURE_ID);
  }),
);

it.effect("a save made now is stamped with the current schema version and opens", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Current Career");

    const version = yield* readSchemaVersion.pipe(
      Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${save.id}.sqlite`) })),
      Effect.scoped,
    );
    strictEqual(version, SAVE_SCHEMA_VERSION);

    const summary = yield* loadSave(savesDir, save.id);
    strictEqual(summary.id, save.id);
  }),
);
