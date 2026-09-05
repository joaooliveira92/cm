import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { it } from "@effect/vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { getManagerProfileScreen } from "../src/main/managerProfile.js";
import { createSave } from "../src/main/saves.js";
import { getSquad } from "../src/main/squad.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-manager-profile-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

/** Drives the save into the Archived Save state the way `ManagerSacked`'s projection does, without
 * running two full Seasons of fixtures to earn the sacking. */
const archiveSave = (saveId: string) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql`UPDATE manager_status SET archived_cause = 'sacked', consecutive_misses = 2, last_outcome = 'sacked'`;
    }),
  );

it.effect("serves creation-time identity alongside club, Season, and tenure", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Ada Lovelace");
    const squad = yield* getSquad(savesDir, save.id);

    const view = yield* getManagerProfileScreen(savesDir, save.id);

    strictEqual(view.profile.managerName, "Ada Lovelace");
    strictEqual(view.profile.archetypeOrigin, "custom");
    deepStrictEqual({ ...view.profile.pillars }, {
      tacticalAcumen: 3,
      influence: 3,
      regimen: 3,
      technicalCoaching: 3,
    });
    strictEqual(view.clubName, squad.club.name);
    strictEqual(view.seasonNumber, 1);
    strictEqual(view.tenureSeasons, 1);
  }),
);

it.effect("a live save is not archived; a sacked save is", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    strictEqual((yield* getManagerProfileScreen(savesDir, save.id)).archived, false);

    yield* archiveSave(save.id);
    strictEqual((yield* getManagerProfileScreen(savesDir, save.id)).archived, true);
  }),
);

it.effect("archiving changes only the flag — the profile it renders is unchanged", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const live = yield* getManagerProfileScreen(savesDir, save.id);

    yield* archiveSave(save.id);
    const archived = yield* getManagerProfileScreen(savesDir, save.id);

    deepStrictEqual(archived.profile, live.profile);
    strictEqual(archived.clubName, live.clubName);
    strictEqual(archived.seasonNumber, live.seasonNumber);
    strictEqual(archived.tenureSeasons, live.tenureSeasons);
  }),
);

it.effect("carries no season-boundary judgment — those stay exclusive to Season Summary", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const view = yield* getManagerProfileScreen(savesDir, save.id);

    for (const forbidden of [
      "boardObjective",
      "verdict",
      "consecutiveMisses",
      "managerOutcome",
      "archivedCause",
    ]) {
      ok(!(forbidden in view), `Manager Profile must not carry ${forbidden}`);
    }
  }),
);

it.effect("a well-formed but missing save fails typed, not as a defect", () =>
  Effect.gen(function* () {
    const result = yield* Effect.result(getManagerProfileScreen(savesDir, "no-such-save" as never));
    ok(result._tag === "Failure");
    strictEqual(result.failure._tag, "SaveNotFoundError");
  }),
);
