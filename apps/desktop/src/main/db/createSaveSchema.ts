import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { MIGRATION_STATEMENTS } from "./migrations.generated.js";
import { stampSchemaVersion } from "./schemaVersion.js";

/**
 * DDL for a freshly created save's SQLite file. Run once, inside the same transaction as
 * generation.
 *
 * The statements come from `schema.ts` by way of drizzle-kit. To change a save's shape, edit the
 * Drizzle schema and run
 * `pnpm db:generate`; editing the generated statements directly would put the two out of step,
 * which `db-migrations-drift.test.ts` fails on.
 *
 * Statements run sequentially and in the order generated: each `CREATE TABLE` depends on nothing
 * that runs after it, and SQLite resolves foreign-key targets lazily, so forward references
 * between tables are safe.
 *
 * The file is then stamped with `SAVE_SCHEMA_VERSION`, which `loadSave` checks before reading
 * anything: a save only ever opens under the schema that created it.
 */
export const createSchema = Effect.forEach(
  MIGRATION_STATEMENTS,
  (statement) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      return yield* sql.unsafe(statement);
    }),
  { concurrency: 1, discard: true },
).pipe(Effect.andThen(stampSchemaVersion));
