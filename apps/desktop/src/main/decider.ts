import { readdir } from "node:fs/promises";
import path from "node:path";
import { SaveNotFoundError, type SaveId } from "@cm-clone/contracts";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";

/** Resolves a save's `.sqlite` filename and calls `onFound`, or `SaveNotFoundError` if the save
 * doesn't exist under `savesDir`. Shared by every command/query handler module (`tactics.ts`,
 * `match.ts`, `season.ts`, `transfers.ts`) rather than each defining its own copy. */
export const withExistingSave = <A, E>(
  savesDir: string,
  saveId: SaveId,
  onFound: (filename: string) => Effect.Effect<A, E>,
) =>
  Effect.gen(function* () {
    const filename = path.join(savesDir, `${saveId}.sqlite`);
    const entries = yield* Effect.promise(() => readdir(savesDir));
    const exists = entries.includes(`${saveId}.sqlite`);
    if (!exists) {
      return yield* new SaveNotFoundError({ id: saveId });
    }
    return yield* onFound(filename);
  });

/** One row of a domain-bounded event stream (ADR-0007) before/after JSON (de)serialization. */
export interface StreamEvent {
  readonly seq: number;
  readonly tag: string;
  readonly payload: unknown;
}

/** The next `seq` to append for a stream — 1 for a brand-new stream. Assumes a `SqlClient` in context. */
export const nextStreamSeq = (streamType: string, streamId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{
      maxSeq: number | null;
    }>`SELECT MAX(seq) as maxSeq FROM events WHERE stream_type = ${streamType} AND stream_id = ${streamId}`;
    return (rows[0]?.maxSeq ?? 0) + 1;
  });

/**
 * Appends events to a stream starting at `startSeq`, in the caller's SQL transaction.
 *
 * Every row carries the save's own in-world date, read here rather than passed in by each of the
 * dozen call sites — a date that had to be threaded through every appender would eventually be
 * forgotten at one of them, and an event with no date is one a career chronology cannot place.
 * It is NULL only before a calendar exists, which is career creation and nothing else.
 *
 * Assumes a `SqlClient` in context.
 */
export const appendStreamEvents = (
  streamType: string,
  streamId: string,
  startSeq: number,
  events: ReadonlyArray<{ readonly tag: string; readonly payload: unknown }>,
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const gameDate = yield* currentGameDate;
    for (const [offset, event] of events.entries()) {
      const seq = startSeq + offset;
      yield* sql`INSERT INTO events (stream_type, stream_id, seq, tag, payload, game_date)
        VALUES (${streamType}, ${streamId}, ${seq}, ${event.tag}, ${JSON.stringify(event.payload)}, ${gameDate})`;
    }
  });

/** The save's current in-world date, or NULL before a season exists. Never the wall clock. */
const currentGameDate = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const rows = yield* sql<{ gameDate: string | null }>`
    SELECT game_date as "gameDate" FROM season ORDER BY season_number DESC LIMIT 1`;
  return rows[0]?.gameDate ?? null;
});

/** Loads a stream's full event history in `seq` order. Assumes a `SqlClient` in context. */
export const loadStreamEvents = (streamType: string, streamId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{
      seq: number;
      tag: string;
      payload: string;
    }>`SELECT seq, tag, payload FROM events WHERE stream_type = ${streamType} AND stream_id = ${streamId} ORDER BY seq ASC`;
    return rows.map(
      (row): StreamEvent => ({ seq: row.seq, tag: row.tag, payload: JSON.parse(row.payload) as unknown }),
    );
  });
