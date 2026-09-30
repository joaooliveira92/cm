import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { PlayerId, type SaveId } from "@cm-clone/contracts";
import { ratingOf, type PositionalRatings, type RetrainingTarget } from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../../seeded-save.js";
import { advanceThroughBoundary } from "../boundary-helpers.js";
import { getSquad } from "../../../src/main/club/index.js";
import { setRetrainingTarget } from "../../../src/main/club/retraining.js";
import {
  positionalRatingSelectList,
  positionalRatingsOf,
  type PositionalRatingRow,
} from "../../../src/main/world/positionalRatingColumns.js";

// player-positional-model 17: a retraining target raises one line or side over played Microcycles,
// and nothing else about a player's positions changes.

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-retraining-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: SaveId, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })), Effect.scoped);

const ratingsOf = (saveId: SaveId, playerId: string) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const rows = yield* sql.unsafe<PositionalRatingRow>(`SELECT ${positionalRatingSelectList()} FROM players WHERE id = ?`, [
        playerId,
      ]);
      return positionalRatingsOf(rows[0]!);
    }),
  );

const everyRating = (ratings: PositionalRatings): Record<string, number> => ({
  ...Object.fromEntries(Object.entries(ratings.lines).map(([code, value]) => [`line ${code}`, value])),
  ...Object.fromEntries(Object.entries(ratings.sides).map(([code, value]) => [`side ${code}`, value])),
  freeRole: ratings.freeRole,
});

/** The first line an outfield player is weak at, so there is room to retrain toward it. */
const weakLineOf = (ratings: PositionalRatings): RetrainingTarget =>
  (["WB", "DM", "AM", "M", "D", "F"] as const).find((line) => ratings.lines[line] < 12)!;

it.effect(
  "a retraining target rises over played Microcycles, and no other positional rating moves",
  () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Test Career");
      const squad = yield* getSquad(savesDir, save.id);
      const outfield = squad.players.filter((player) => player.attributes.gkHandling === undefined);
      const [trainee, bystander] = [outfield[0]!, outfield[1]!];

      const before = yield* ratingsOf(save.id, trainee.id);
      const bystanderBefore = yield* ratingsOf(save.id, bystander.id);
      const target = weakLineOf(before);
      ok(target !== undefined, "the trainee has a weak line to retrain toward");

      const view = yield* setRetrainingTarget(savesDir, save.id, trainee.id, target);
      deepStrictEqual([view.playerId, view.target], [trainee.id, target]);
      const reread = yield* getSquad(savesDir, save.id);
      strictEqual(reread.players.find((player) => player.id === trainee.id)!.retrainingTarget, target);

      for (let microcycle = 0; microcycle < 8; microcycle += 1) {
        const { seasonConcluded } = yield* advanceThroughBoundary(savesDir, save.id);
        if (seasonConcluded) break;
      }

      const after = yield* ratingsOf(save.id, trainee.id);
      ok(ratingOf(after, target) > ratingOf(before, target), `${target} rose from ${ratingOf(before, target)}`);
      const untouched = (ratings: PositionalRatings) => {
        const all = everyRating(ratings);
        delete all[`line ${target}`];
        return all;
      };
      deepStrictEqual(untouched(after), untouched(before), "no other rating of the trainee moved");
      deepStrictEqual(everyRating(yield* ratingsOf(save.id, bystander.id)), everyRating(bystanderBefore), "an untargeted player keeps every rating");

      yield* setRetrainingTarget(savesDir, save.id, trainee.id, null);
      const cleared = yield* getSquad(savesDir, save.id);
      strictEqual(cleared.players.find((player) => player.id === trainee.id)!.retrainingTarget, null);
    }),
  120_000,
);

it.effect("a retraining target is refused for a player outside the manager's club, or no player at all", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const squad = yield* getSquad(savesDir, save.id);
    const outsider = yield* withSave(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        const rows = yield* sql<{ id: string }>`SELECT id FROM players WHERE club_id IS NOT NULL AND club_id <> ${squad.club.id} LIMIT 1`;
        return PlayerId.make(rows[0]!.id);
      }),
    );

    const notYours = yield* Effect.flip(setRetrainingTarget(savesDir, save.id, outsider, "WB"));
    strictEqual(notYours._tag, "NotYourPlayerError");
    const missing = yield* Effect.flip(setRetrainingTarget(savesDir, save.id, PlayerId.make("no-such-player"), "WB"));
    strictEqual(missing._tag, "PlayerNotFoundError");
  }),
);
