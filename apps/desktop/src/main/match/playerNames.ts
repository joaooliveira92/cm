/**
 * Player names for the players a match read mentions, in one query. An id with no player row renders
 * as "Unknown player" rather than failing the whole read.
 */
import type { PlayerId } from "@cm-clone/contracts";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";

export const playerNames = (ids: ReadonlyArray<PlayerId>) =>
  Effect.gen(function* () {
    const unique = [...new Set(ids)];
    const sql = yield* SqlClient;
    const rows =
      unique.length === 0
        ? []
        : yield* sql.unsafe<{ id: string; firstName: string; lastName: string }>(
            `SELECT id, first_name as "firstName", last_name as "lastName" FROM players WHERE id IN (${unique.map(() => "?").join(",")})`,
            unique,
          );
    const byId = new Map(rows.map((row) => [row.id, `${row.firstName} ${row.lastName}`]));
    return (id: PlayerId): string => byId.get(id) ?? "Unknown player";
  });
