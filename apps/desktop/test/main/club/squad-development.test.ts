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
import {
  developPlayersForSeason,
  getPlayerDevelopmentHistory,
  getSquad,
  getSquadDevelopment,
  setTrainingFocus,
} from "../../../src/main/club/index.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-squad-development-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

const eventCount = (saveId: SaveId) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const rows = yield* sql<{ n: number }>`SELECT COUNT(*) as n FROM events`;
      return rows[0]!.n;
    }),
  );

const byCodeUnits = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

// Ticket 08 (Screen 114), through the real writer: the squad read must agree with the per-player
// Performance Report read for every player, at each stage the log can be in.
it.effect(
  "getSquadDevelopment lists the own squad with Training Focus and each player's newest recorded Season",
  () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Squad development");
      const squad = yield* getSquad(savesDir, save.id);
      ok(squad.players.length > 1, "the manager's club has a squad");

      const focused = squad.players[0]!;
      yield* setTrainingFocus(savesDir, save.id, focused.id, "technical");

      // Before any Season concludes: the whole own squad, nothing recorded, not a zero comparison.
      const before = yield* getSquadDevelopment(savesDir, save.id);
      deepStrictEqual(
        before.players.map((player) => player.id).sort(byCodeUnits),
        squad.players.map((player) => player.id).sort(byCodeUnits),
      );
      ok(before.players.every((player) => player.latestSeason === null));
      const focusedRow = before.players.find((player) => player.id === focused.id)!;
      strictEqual(focusedRow.trainingFocus, "technical");
      strictEqual(focusedRow.firstName, focused.firstName);
      strictEqual(focusedRow.lastName, focused.lastName);
      ok(
        before.players.filter((player) => player.id !== focused.id).every((player) => player.trainingFocus === null),
        "every other player carries the None default",
      );

      // The first recorded Season has no starting point, so it carries no comparison.
      yield* withSave(save.id, developPlayersForSeason(1));
      const afterOne = yield* getSquadDevelopment(savesDir, save.id);
      ok(
        afterOne.players.every(
          (player) =>
            player.latestSeason?.seasonNumber === 1 &&
            player.latestSeason.comparedWithSeason === null &&
            player.latestSeason.changes.length === 0,
        ),
      );

      yield* withSave(save.id, developPlayersForSeason(2));
      const eventsBefore = yield* eventCount(save.id);
      const afterTwo = yield* getSquadDevelopment(savesDir, save.id);
      strictEqual(yield* eventCount(save.id), eventsBefore, "a read appends nothing");

      // Each row's newest Season is exactly the first Season the per-player read returns.
      for (const player of afterTwo.players) {
        const history = yield* getPlayerDevelopmentHistory(savesDir, save.id, player.id);
        deepStrictEqual(player.latestSeason, history.seasons[0]);
      }
      ok(
        afterTwo.players.some((player) => (player.latestSeason?.changes.length ?? 0) > 0),
        "some own-club player developed in Season 2, so the comparison is not vacuous",
      );
      ok(afterTwo.players.every((player) => player.latestSeason?.comparedWithSeason === 1));

      // Stable name order (last name, first name, id), the same as the Workload screen's.
      const order = afterTwo.players.map((player) => [player.lastName, player.firstName, player.id] as const);
      const sorted = [...order].sort(
        (a, b) => byCodeUnits(a[0], b[0]) || byCodeUnits(a[1], b[1]) || byCodeUnits(a[2], b[2]),
      );
      deepStrictEqual(order, sorted);
    }),
  120_000,
);

it.effect("getSquadDevelopment fails with SaveNotFoundError for a save that is not there", () =>
  Effect.gen(function* () {
    const error = yield* Effect.flip(getSquadDevelopment(savesDir, SaveId.make("save_nobody")));
    strictEqual(error._tag, "SaveNotFoundError");
  }),
);
