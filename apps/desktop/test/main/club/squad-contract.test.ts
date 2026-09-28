/**
 * The squad read carries each player's own Contract and Transfer Value for the Contract view. The
 * test pins one player's Contract and removes another's, so the expected figures are the test's
 * own rather than whatever generation drew.
 */
import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { strictEqual } from "node:assert";
import { it } from "@effect/vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { seasonStartDate, transferValue } from "@cm-clone/shared";
import { format, parseISO, subDays } from "date-fns";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { getSquad } from "../../../src/main/club/index.js";
import { createSave } from "../../seeded-save.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-squad-contract-test-"));
});

afterEach(async () => {
  await rm(savesDir, { recursive: true, force: true });
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
    // Two years left: the rollover into Season current + 2 frees him, so he is contracted to its eve.
    strictEqual(
      withContract.contractExpiryDate,
      format(subDays(parseISO(seasonStartDate(referenceYear, seasonNumber + 2)), 1), "yyyy-MM-dd"),
    );
    strictEqual(
      withContract.transferValue,
      transferValue(withContract.overallRating, withContract.age, potentialAbility),
    );

    const withoutContract = byId(free.id);
    strictEqual(withoutContract.contractWage, null);
    strictEqual(withoutContract.contractExpiryDate, null);
  }),
);
