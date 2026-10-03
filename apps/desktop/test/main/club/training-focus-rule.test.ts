import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, strictEqual } from "node:assert";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { TrainingFocusNotOfferedError, type SaveId } from "@cm-clone/contracts";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../../seeded-save.js";
import { getSquad, setTrainingFocus } from "../../../src/main/club/index.js";

// Ticket 10 (group-h): `setTrainingFocus` enforces the Training Focus rule — a Category is only a
// Training Focus for a player whose Attributes it contains.

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-training-focus-rule-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: SaveId, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

const focusEvents = (saveId: SaveId) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const rows = yield* sql<{ n: number }>`SELECT COUNT(*) as n FROM events WHERE tag = 'TrainingFocusSet'`;
      return rows[0]!.n;
    }),
  );

/** A fresh save with one outfield and one goalkeeping player from the manager's squad. */
const saveWithPlayers = Effect.gen(function* () {
  const save = yield* createSave(savesDir, "Test Career");
  const squad = yield* getSquad(savesDir, save.id);
  const outfield = squad.players.find((player) => player.attributes.gkHandling === undefined)!;
  const keeper = squad.players.find((player) => player.attributes.gkHandling !== undefined)!;
  return { save, outfield, keeper };
});

it.effect("refuses Goalkeeping for an outfield player, writing no row and no event", () =>
  Effect.gen(function* () {
    const { save, outfield } = yield* saveWithPlayers;

    const error = yield* Effect.flip(setTrainingFocus(savesDir, save.id, outfield.id, "goalkeeping"));
    deepStrictEqual(error, new TrainingFocusNotOfferedError({ playerId: outfield.id, focus: "goalkeeping" }));

    const squad = yield* getSquad(savesDir, save.id);
    strictEqual(squad.players.find((player) => player.id === outfield.id)!.trainingFocus, null);
    strictEqual(yield* focusEvents(save.id), 0);
  }),
);

it.effect("accepts Goalkeeping for a player with goalkeeping Attributes, and every outfield Category for an outfield player", () =>
  Effect.gen(function* () {
    const { save, outfield, keeper } = yield* saveWithPlayers;

    strictEqual((yield* setTrainingFocus(savesDir, save.id, keeper.id, "goalkeeping")).focus, "goalkeeping");
    for (const focus of ["technical", "mental", "physical", null] as const) {
      strictEqual((yield* setTrainingFocus(savesDir, save.id, outfield.id, focus)).focus, focus);
    }
  }),
);

it.effect("leaves an off-rule focus from an older save in place, and lets any offered value replace it", () =>
  Effect.gen(function* () {
    const { save, outfield } = yield* saveWithPlayers;
    // What a save written before the rule was enforced can hold.
    yield* withSave(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        yield* sql`INSERT INTO training_focus (player_id, focus) VALUES (${outfield.id}, 'goalkeeping')`;
      }),
    );

    const loaded = yield* getSquad(savesDir, save.id);
    strictEqual(loaded.players.find((player) => player.id === outfield.id)!.trainingFocus, "goalkeeping");

    strictEqual(
      (yield* Effect.flip(setTrainingFocus(savesDir, save.id, outfield.id, "goalkeeping")))._tag,
      "TrainingFocusNotOfferedError",
    );
    strictEqual((yield* setTrainingFocus(savesDir, save.id, outfield.id, "mental")).focus, "mental");
    strictEqual((yield* setTrainingFocus(savesDir, save.id, outfield.id, null)).focus, null);
  }),
);
