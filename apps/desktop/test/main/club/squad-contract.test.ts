/**
 * The squad read carries each player's own Contract and Transfer Value for the Contract view. The
 * tests pin players' Contracts, so the expected figures are the tests' own rather than whatever
 * generation drew.
 *
 * One expensive test in this file: a Season played to its rollover.
 */
import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { strictEqual } from "node:assert";
import { it } from "@effect/vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import type { SaveId } from "@cm-clone/contracts";
import { seasonEndDate, transferValue } from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { getSquad } from "../../../src/main/club/index.js";
import { createSave } from "../../seeded-save.js";
import { advanceThroughBoundary } from "../boundary-helpers.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-squad-contract-test-"));
});

afterEach(async () => {
  await rm(savesDir, { recursive: true, force: true });
});

const withSave = <A, E>(saveId: SaveId, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

const advanceToSeasonEnd = (saveId: SaveId) =>
  Effect.gen(function* () {
    for (let i = 0; i < 60; i++) {
      const { seasonConcluded } = yield* advanceThroughBoundary(savesDir, saveId);
      if (seasonConcluded) return;
    }
    throw new Error("SeasonConcluded never fired within 60 Continue presses");
  });

it.effect("reads each player's own Contract, a null Contract, and an exact Transfer Value", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Squad contracts");
    const before = yield* getSquad(savesDir, save.id);
    const [contracted, free] = before.players;
    if (contracted === undefined || free === undefined) throw new Error("seeded squad has under two players");

    const { referenceYear, seasonNumber, potentialAbility } = yield* Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql`UPDATE contracts SET wage = 12345, years_remaining = 2 WHERE player_id = ${contracted.id}`;
      // The expiry sweep's window: the Contract row is gone, the player not yet moved.
      yield* sql`DELETE FROM contracts WHERE player_id = ${free.id}`;
      const [manifest] = yield* sql<{ referenceYear: number }>`
        SELECT reference_year as "referenceYear" FROM generation_manifest WHERE id = 1`;
      const [season] = yield* sql<{ seasonNumber: number }>`
        SELECT MAX(season_number) as "seasonNumber" FROM season`;
      const [row] = yield* sql<{ potentialAbility: number }>`
        SELECT potential_ability as "potentialAbility" FROM players WHERE id = ${contracted.id}`;
      return {
        referenceYear: manifest!.referenceYear,
        seasonNumber: season!.seasonNumber,
        potentialAbility: row!.potentialAbility,
      };
    }).pipe(
      Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${save.id}.sqlite`) })),
      Effect.scoped,
    );

    const after = yield* getSquad(savesDir, save.id);
    const byId = (id: string) => after.players.find((player) => player.id === id)!;

    const withContract = byId(contracted.id);
    strictEqual(withContract.contractWage, 12345);
    // Two years left: this Season and the next, so he is contracted to the next one's end.
    strictEqual(withContract.contractExpiryDate, seasonEndDate(referenceYear, seasonNumber + 1));
    strictEqual(
      withContract.transferValue,
      transferValue(withContract.overallRating, withContract.age, potentialAbility),
    );

    const withoutContract = byId(free.id);
    strictEqual(withoutContract.contractWage, null);
    strictEqual(withoutContract.contractExpiryDate, null);
  }),
);

it.effect(
  "a Contract ends on the date its Season concludes by, and the date does not move at the rollover",
  () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Contract rollover");
      const [leaving, staying] = (yield* getSquad(savesDir, save.id)).players;
      if (leaving === undefined || staying === undefined) throw new Error("seeded squad has under two players");

      const { referenceYear, seasonNumber } = yield* withSave(
        save.id,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          yield* sql`UPDATE contracts SET years_remaining = 1 WHERE player_id = ${leaving.id}`;
          yield* sql`UPDATE contracts SET years_remaining = 2 WHERE player_id = ${staying.id}`;
          const [manifest] = yield* sql<{ referenceYear: number }>`
            SELECT reference_year as "referenceYear" FROM generation_manifest WHERE id = 1`;
          const [season] = yield* sql<{ seasonNumber: number }>`
            SELECT MAX(season_number) as "seasonNumber" FROM season`;
          return { referenceYear: manifest!.referenceYear, seasonNumber: season!.seasonNumber };
        }),
      );
      const thisEnd = seasonEndDate(referenceYear, seasonNumber);
      const nextEnd = seasonEndDate(referenceYear, seasonNumber + 1);

      const before = yield* getSquad(savesDir, save.id);
      const expiryOf = (squad: typeof before, id: string) =>
        squad.players.find((player) => player.id === id)?.contractExpiryDate;
      strictEqual(expiryOf(before, leaving.id), thisEnd);
      strictEqual(expiryOf(before, staying.id), nextEnd);

      yield* advanceToSeasonEnd(save.id);

      // The date shown is a bound the Season really kept: its last fixture fell on or before it.
      const lastFixture = yield* withSave(
        save.id,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          const [row] = yield* sql<{ lastDate: string }>`
            SELECT MAX(scheduled_date) as "lastDate" FROM fixtures WHERE season_number = ${seasonNumber}`;
          return row!.lastDate;
        }),
      );
      strictEqual(lastFixture <= thisEnd, true, `last fixture ${lastFixture} after ${thisEnd}`);

      const after = yield* getSquad(savesDir, save.id);
      strictEqual(expiryOf(after, leaving.id), undefined, "a Contract in its last year frees the player");
      strictEqual(expiryOf(after, staying.id), nextEnd, "the rollover does not move a Contract's end");
    }),
);
