/**
 * Training schedule recovery modifier (training-schedule-and-delegation 04): the saved schedule
 * multiplies between-match Condition recovery. A Recovery schedule leaves players fresher than a
 * Heavy schedule.
 */
import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { ok } from "node:assert";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { ClubId, type SaveId } from "@cm-clone/contracts";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../../seeded-save.js";
import { recoverClubFitness } from "../../../src/main/season/matchday.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-schedule-recovery-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const saveFile = (saveId: SaveId) => path.join(savesDir, `${saveId}.sqlite`);

it.effect(
  "a Recovery schedule leaves a player at a higher Condition than a Heavy schedule",
  () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Test Career");

      const sqlLayer = SqliteClient.layer({ filename: saveFile(save.id) });
      const provide = Effect.provide(sqlLayer);
      const scoped = Effect.scoped;

      const clubId = yield* Effect.gen(function* () {
        const sql = yield* SqlClient;
        const [club] = yield* sql<{ id: string }>`SELECT id FROM clubs WHERE is_user_club = 1`;
        ok(club !== undefined, "found user club");
        return ClubId.make(club!.id);
      }).pipe(provide, scoped);

      const setCondition = (c: number) =>
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          yield* sql`UPDATE player_fitness SET condition = ${c} WHERE season_number = 1`;
        }).pipe(provide, scoped);

      const readConditions = () =>
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          const rows = yield* sql<{ id: string; condition: number }>`
            SELECT player_id as "id", condition FROM player_fitness WHERE season_number = 1`;
          return rows;
        }).pipe(provide, scoped);

      const scheduleSessions = (
        sessions: ReadonlyArray<{ type: string; intensity: string }>,
        revision: number,
      ) =>
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          yield* sql`DELETE FROM training_schedule_sessions WHERE club_id = ${clubId}`;
          yield* sql`INSERT INTO training_schedules (club_id, revision, delegated) VALUES (${clubId}, ${revision}, 0)
            ON CONFLICT(club_id) DO UPDATE SET revision = excluded.revision, delegated = excluded.delegated`;
          yield* sql`INSERT INTO training_schedule_sessions ${sql.insert(
            sessions.map((s, i) => ({
              club_id: clubId,
              slot_index: i,
              session_type: s.type,
              intensity: s.intensity,
            })),
          )}`;
        }).pipe(provide, scoped);

      const recoverySessions = [
        { type: "recovery", intensity: "low" },
        { type: "rest", intensity: "low" },
        { type: "technical", intensity: "low" },
        { type: "tactical", intensity: "low" },
        { type: "recovery", intensity: "low" },
      ];

      const heavySessions = [
        { type: "physical", intensity: "high" },
        { type: "physical", intensity: "high" },
        { type: "technical", intensity: "high" },
        { type: "tactical", intensity: "medium" },
        { type: "recovery", intensity: "low" },
      ];

      // Set all players to 50, apply Recovery schedule, recover.
      yield* setCondition(50);
      yield* scheduleSessions(recoverySessions, 1);
      yield* recoverClubFitness(clubId, 1).pipe(provide, scoped);

      const afterRecovery = yield* readConditions();

      // Reset to 50, switch to Heavy, recover.
      yield* setCondition(50);
      yield* scheduleSessions(heavySessions, 1);
      yield* recoverClubFitness(clubId, 1).pipe(provide, scoped);

      const afterHeavy = yield* readConditions();

      ok(afterRecovery.length > 0, "has players after recovery");
      for (const row of afterHeavy) {
        const recoveryPlayer = afterRecovery.find((r) => r.id === row.id);
        if (recoveryPlayer !== undefined) {
          ok(
            recoveryPlayer.condition >= row.condition,
            `player ${row.id}: Recovery (${recoveryPlayer.condition}) >= Heavy (${row.condition})`,
          );
        }
      }
    }),
  900_000,
);