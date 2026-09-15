import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { it } from "@effect/vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { SaveId } from "@cm-clone/contracts";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../../../src/main/world/index.js";
import { getSquad, getWorkload } from "../../../src/main/club/index.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-workload-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

// Ticket 05 (Screen 112): the Workload read comes straight off the existing fitness ledger — it is
// the same `player_fitness` rows `recoverClubFitness` writes and `getSquad` reads Condition from.
it.effect(
  "getWorkload reads each own-club player's Condition and last injury Severity from the fitness ledger",
  () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Workload");
      const squad = yield* getSquad(savesDir, save.id);
      const [tired, injured, atThreshold] = [squad.players[0]!, squad.players[1]!, squad.players[2]!];

      yield* withSave(
        save.id,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          yield* sql`UPDATE player_fitness SET condition = 74, last_injury_severity = 'none' WHERE player_id = ${tired.id}`;
          yield* sql`UPDATE player_fitness SET condition = 40, last_injury_severity = 'severe' WHERE player_id = ${injured.id}`;
          yield* sql`UPDATE player_fitness SET condition = 75, last_injury_severity = 'light' WHERE player_id = ${atThreshold.id}`;
        }),
      );

      const view = yield* getWorkload(savesDir, save.id);

      // Exactly the manager's own squad, nobody else's.
      deepStrictEqual(
        view.players.map((p) => p.id).sort(),
        squad.players.map((p) => p.id).sort(),
      );

      const byId = new Map(view.players.map((p) => [p.id, p]));
      strictEqual(byId.get(tired.id)!.condition, 74);
      strictEqual(byId.get(tired.id)!.lastInjurySeverity, "none");
      strictEqual(byId.get(injured.id)!.condition, 40);
      strictEqual(byId.get(injured.id)!.lastInjurySeverity, "severe");
      // Rest/Active is derived on read against the engine's non-contact threshold (75): below → rest.
      strictEqual(byId.get(tired.id)!.recovery, "rest");
      strictEqual(byId.get(injured.id)!.recovery, "rest");
      strictEqual(byId.get(atThreshold.id)!.recovery, "active");

      // Untouched rows read the seeded ledger: full Condition, no injury.
      const touched = new Set([tired.id, injured.id, atThreshold.id]);
      const untouched = view.players.filter((p) => !touched.has(p.id));
      ok(untouched.length > 0);
      ok(untouched.every((p) => p.condition === 100 && p.lastInjurySeverity === "none" && p.recovery === "active"));

      // A stable name order, so the screen's row order does not depend on SQLite's scan order.
      const byBinaryName = (a: { lastName: string; firstName: string }, b: { lastName: string; firstName: string }) =>
        a.lastName === b.lastName
          ? Number(a.firstName > b.firstName) - Number(a.firstName < b.firstName)
          : Number(a.lastName > b.lastName) - Number(a.lastName < b.lastName);
      deepStrictEqual(view.players, [...view.players].sort(byBinaryName));
    }),
  60_000,
);

it.effect("getWorkload is a pure read: reading it leaves the fitness ledger untouched", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Workload");
    const ledger = withSave(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        return yield* sql<{ playerId: string; condition: number; severity: string }>`
          SELECT player_id as "playerId", condition, last_injury_severity as "severity"
          FROM player_fitness ORDER BY player_id`;
      }),
    );
    const before = yield* ledger;
    yield* getWorkload(savesDir, save.id);
    yield* getWorkload(savesDir, save.id);
    deepStrictEqual(yield* ledger, before);
  }),
  60_000,
);

it.effect("getWorkload fails with SaveNotFoundError for a save that is not there", () =>
  Effect.gen(function* () {
    const error = yield* Effect.flip(getWorkload(savesDir, SaveId.make("save_nobody")));
    strictEqual(error._tag, "SaveNotFoundError");
  }),
);
