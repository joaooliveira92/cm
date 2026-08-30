import { SqliteClient } from "@effect/sql-sqlite-node";
import { ManagerArchetypeSchema, ManagerProfileNotFoundError, ManagerProfileView, type SaveId } from "@cm-clone/contracts";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { withExistingSave } from "./decider.js";

/** Read the manager_profile row for the current save. Returns null if no profile exists. */
export const loadManagerProfile = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const rows = yield* sql<{
    managerName: string;
    archetypeOrigin: string;
    tacticalAcumen: number;
    influence: number;
    regimen: number;
    technicalCoaching: number;
  }>`SELECT manager_name as "managerName", archetype_origin as "archetypeOrigin",
            tactical_acumen as "tacticalAcumen", influence,
            regimen, technical_coaching as "technicalCoaching"
     FROM manager_profile WHERE id = 1`;
  return rows[0]
    ? {
        managerName: rows[0].managerName,
        archetypeOrigin: rows[0].archetypeOrigin,
        pillars: {
          tacticalAcumen: rows[0].tacticalAcumen,
          influence: rows[0].influence,
          regimen: rows[0].regimen,
          technicalCoaching: rows[0].technicalCoaching,
        },
      }
    : null;
});

/** Query the manager profile from a committed save. */
export const getManagerProfile = (savesDir: string, saveId: SaveId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const profile = yield* loadManagerProfile;
      if (!profile) {
        return yield* new ManagerProfileNotFoundError();
      }
      return new ManagerProfileView({
        managerName: profile.managerName,
        archetypeOrigin: yield* Schema.decodeUnknownEffect(ManagerArchetypeSchema)(profile.archetypeOrigin),
        pillars: profile.pillars,
      });
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );