import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { MIGRATION_STATEMENTS } from "./migrations.generated.js";

/** FNV-1a, 32-bit. Only needs to change when its input does; it is not a security boundary. */
const fnv1a = (text: string): number => {
  let hash = 0x81_1c_9d_c5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01_00_01_93);
  }
  return hash >>> 0;
};

/**
 * The save schema version: a hash of the DDL a fresh save runs, folded into SQLite's signed 32-bit
 * `user_version`. Saves are disposable during development (Agent Note), so there is no upgrade path
 * to number steps for — the version only has to differ whenever the DDL does, and deriving it from
 * the DDL means no change to `db/schema.ts` can forget to bump it. Never `0`, which is what every
 * save made before the version existed reads.
 */
export const SAVE_SCHEMA_VERSION = (fnv1a(MIGRATION_STATEMENTS.join("\n")) & 0x7f_ff_ff_ff) || 1;

/** Stamp the open save with the current schema version. `PRAGMA` takes no bound parameters; the
 *  value is a module constant, never input. */
export const stampSchemaVersion = Effect.gen(function* () {
  const sql = yield* SqlClient;
  yield* sql.unsafe(`PRAGMA user_version = ${SAVE_SCHEMA_VERSION}`);
});

/** The schema version the open save was made under; `0` for a save older than the version. */
export const readSchemaVersion = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const rows = yield* sql<{ readonly user_version: number }>`PRAGMA user_version`;
  return rows[0]?.user_version ?? 0;
});
