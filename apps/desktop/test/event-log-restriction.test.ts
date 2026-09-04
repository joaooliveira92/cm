import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ok, strictEqual } from "node:assert";
import { it } from "@effect/vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach, describe } from "vitest";
import { MIGRATION_STATEMENTS } from "../src/main/db/migrations.generated.js";
import { advanceCalendar } from "../src/main/season.js";
import { getSquad } from "../src/main/squad.js";
import { createPyramidSnapshot } from "./snapshot-helpers.js";
import { beginCareer, commitCareer, createSave } from "../src/main/saves.js";

/**
 * The log records only facts no table holds.
 *
 * What is asserted here is a size property, not a feature: the log has to grow with the player's
 * own career rather than with the size of the world, and the only way to keep that true is to check
 * that the world-scaled writers stay gone.
 */

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-log-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

const events = (saveId: string) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      return yield* sql<{
        streamType: string;
        streamId: string;
        tag: string;
        payload: string;
        gameDate: string | null;
      }>`SELECT stream_type as "streamType", stream_id as "streamId", tag, payload,
                game_date as "gameDate" FROM events ORDER BY rowid ASC`;
    }),
  );

describe("what reaches the log", () => {
  it.effect("dates every event with the save's own date, never the wall clock", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Log");
      const advance = yield* advanceCalendar(savesDir, save.id);

      const dated = (yield* events(save.id)).filter((event) => event.gameDate !== null);
      ok(dated.length > 0, "the advance should have appended dated events");
      // A career reads as a chronology because of this column. `created_at` says only when the
      // save file was written.
      for (const event of dated) {
        ok(/^\d{4}-\d{2}-\d{2}$/.test(event.gameDate!), event.gameDate!);
      }
      ok(dated.some((event) => event.gameDate === advance.season.currentDate));
    }),
    120_000,
  );

  it.effect("keeps a club stream only for the human's club", () =>
    Effect.gen(function* () {
      const snapshotId = yield* createPyramidSnapshot(savesDir);
      const { id } = yield* beginCareer(savesDir, {
        worldSeed: 5150,
        referenceYear: 2026,
        userDataDir: savesDir,
        snapshotId,
      });
      const clubId = yield* withSave(
        id,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          const rows = yield* sql<{ id: string }>`SELECT id FROM clubs WHERE id LIKE 'club_eng_1_%' ORDER BY id LIMIT 1`;
          return rows[0]!.id;
        }),
      );
      yield* commitCareer(savesDir, id, "Log", clubId, {
        managerName: "Log",
        archetypeOrigin: "custom",
        pillars: { tacticalAcumen: 3, influence: 3, regimen: 3, technicalCoaching: 3 },
      });

      // A whole season, so player development runs for every club in a four-division pyramid.
      for (let advance = 0; advance < 80; advance += 1) {
        const result = yield* advanceCalendar(savesDir, id);
        if (result.seasonConcluded) break;
      }

      const clubStreams = new Set(
        (yield* events(id)).filter((event) => event.streamType === "club").map((event) => event.streamId),
      );
      // ~204 MB per season of development payloads across every club is what this keeps out. The
      // `players` rows are authoritative for what those attributes became.
      for (const streamId of clubStreams) {
        strictEqual(streamId, clubId, `a club stream exists for ${streamId}, which nobody manages`);
      }
    }),
    900_000,
  );

  it.effect("writes a resolution event whose size does not grow with the world", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Log");
      yield* advanceCalendar(savesDir, save.id);

      const resolved = (yield* events(save.id)).filter((event) => event.tag === "MatchdayResolved");
      ok(resolved.length > 0);
      for (const event of resolved) {
        const payload = JSON.parse(event.payload) as Record<string, unknown>;
        // A date and a count. `fixtures` is authoritative for every scoreline, so restating them
        // made one row per Continue whose size grew with the world — ~1.2 MB at pyramid scale.
        strictEqual(Object.keys(payload).sort().join(","), "date,resolved");
        strictEqual(typeof payload["resolved"], "number");
        ok(event.payload.length < 100, `payload was ${event.payload.length} bytes`);
      }
    }),
    120_000,
  );

  it.effect("carries no field named matchday in any payload", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Log");
      for (let advance = 0; advance < 3; advance += 1) yield* advanceCalendar(savesDir, save.id);

      for (const event of yield* events(save.id)) {
        ok(!/"matchday"/.test(event.payload), `${event.tag}: ${event.payload.slice(0, 120)}`);
      }
    }),
    120_000,
  );
});

describe("player_transfers is authoritative", () => {
  it.effect("is empty in a freshly generated world", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Log");
      const rows = yield* withSave(
        save.id,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          const counted = yield* sql<{ count: number }>`SELECT COUNT(*) as "count" FROM player_transfers`;
          return counted[0]!.count;
        }),
      );
      // The table fills only as football is played; generation writes none of it.
      strictEqual(rows, 0);
    }),
    60_000,
  );

  it.effect("answers a career history in one query, without reading the log", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Log");
      const squad = yield* getSquad(savesDir, save.id);

      // A transfer between two clubs the human never sees is recorded too — a player they sign in
      // five seasons' time has a history, and it had to be written while nobody was watching.
      const history = yield* withSave(
        save.id,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          const others = yield* sql<{ id: string }>`
            SELECT id FROM clubs WHERE is_user_club = 0 ORDER BY id LIMIT 2`;
          const player = squad.players[0]!;
          yield* sql`INSERT INTO player_transfers (player_id, from_club_id, to_club_id, transferred_on, fee)
            VALUES (${player.id}, NULL, ${others[0]!.id}, '2026-07-10', 0)`;
          yield* sql`INSERT INTO player_transfers (player_id, from_club_id, to_club_id, transferred_on, fee)
            VALUES (${player.id}, ${others[0]!.id}, ${others[1]!.id}, '2027-01-15', 4000000)`;

          return yield* sql<{ fromClubId: string | null; toClubId: string; transferredOn: string }>`
            SELECT from_club_id as "fromClubId", to_club_id as "toClubId",
                   transferred_on as "transferredOn"
            FROM player_transfers WHERE player_id = ${player.id} ORDER BY transferred_on ASC`;
        }),
      );

      strictEqual(history.length, 2);
      strictEqual(history[0]!.fromClubId, null);
      strictEqual(history[0]!.transferredOn, "2026-07-10");
      strictEqual(history[1]!.fromClubId, history[0]!.toClubId);
    }),
    60_000,
  );
});

describe("no read model becomes a table", () => {
  it("names none of the five in the schema", () => {
    const created = MIGRATION_STATEMENTS.flatMap((statement) => {
      const match = /CREATE TABLE `([a-z_]+)`/.exec(statement);
      return match ? [match[1]!] : [];
    });

    // The five named read models are projections, computed from authoritative rows on read. A
    // table for any of them would be a second source for something already held once.
    for (const forbidden of ["career_history", "match_timeline", "news_feed", "squad_view", "league_table"]) {
      ok(!created.includes(forbidden), `${forbidden} became a table`);
    }
  });
});
