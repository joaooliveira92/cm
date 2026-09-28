/**
 * The squad read flags a Player as foreign when his nationality is not his club's nation, the
 * nation of the club's home city. The seeded world's mix of nationalities is whatever generation
 * drew, so the test pins two players' nationalities itself: one to the club's nation, one away.
 */
import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { strictEqual } from "node:assert";
import { it } from "@effect/vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { getSquad } from "../../../src/main/club/index.js";
import { createSave } from "../../seeded-save.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-squad-foreign-test-"));
});

afterEach(async () => {
  await rm(savesDir, { recursive: true, force: true });
});

it.effect("flags exactly the players whose nationality is not the club's nation", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Foreign players");
    const before = yield* getSquad(savesDir, save.id);
    const [home, away] = before.players;
    if (home === undefined || away === undefined) throw new Error("seeded squad has under two players");

    yield* Effect.gen(function* () {
      const sql = yield* SqlClient;
      const clubNation = (yield* sql<{ nationId: string }>`
        SELECT ct.nation_id as "nationId" FROM clubs c JOIN cities ct ON ct.id = c.city_id
        WHERE c.id = ${before.club.id}`)[0]!.nationId;
      const otherNation = (yield* sql<{ id: string }>`
        SELECT id FROM nations WHERE id <> ${clubNation} ORDER BY id LIMIT 1`)[0]!.id;
      yield* sql`UPDATE players SET nationality = ${clubNation} WHERE id = ${home.id}`;
      yield* sql`UPDATE players SET nationality = ${otherNation} WHERE id = ${away.id}`;
    }).pipe(
      Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${save.id}.sqlite`) })),
      Effect.scoped,
    );

    const after = yield* getSquad(savesDir, save.id);
    const foreignOf = (id: string) => after.players.find((player) => player.id === id)?.foreign;
    strictEqual(foreignOf(home.id), false);
    strictEqual(foreignOf(away.id), true);
  }),
);
