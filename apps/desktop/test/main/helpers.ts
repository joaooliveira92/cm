import { SqliteClient } from "@effect/sql-sqlite-node";
import type { SqlClient } from "effect/unstable/sql/SqlClient";
import { Effect } from "effect";

export const inMemorySqliteLayer = SqliteClient.layer({ filename: ":memory:" });

export const withInMemorySave = <A, E>(body: Effect.Effect<A, E, SqlClient>) =>
  body.pipe(
    Effect.provide(inMemorySqliteLayer),
    Effect.scoped,
  );