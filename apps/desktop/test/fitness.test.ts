import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { ok, strictEqual } from "node:assert";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { advanceCalendar, recoverClubFitness } from "../src/main/season/index.js";
import { createSave } from "../src/main/saves.js";
import { getSquad } from "../src/main/squad.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-fitness-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

const setLedgerRow = (saveId: string, playerId: string, condition: number, severity: "none" | "light" | "medium" | "severe") =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql`UPDATE player_fitness SET condition = ${condition}, last_injury_severity = ${severity} WHERE player_id = ${playerId}`;
    }),
  );

const ledgerCondition = (saveId: string, playerId: string) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const rows = yield* sql<{ condition: number }>`SELECT condition FROM player_fitness WHERE player_id = ${playerId}`;
      return rows[0]!.condition;
    }),
  );

// ---------------------------------------------------------------------------
// Season fitness ledger (ticket 10) — end-to-end cross-match recovery
// ---------------------------------------------------------------------------

it.effect("the ledger seeds every player at full Condition, and resolving a Fixture drains it below 100", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");

    const fresh = yield* getSquad(savesDir, save.id);
    ok(fresh.players.length > 0);
    for (const player of fresh.players) strictEqual(player.condition, 100);

    yield* advanceCalendar(savesDir, save.id);

    const afterFixture = yield* getSquad(savesDir, save.id);
    const conditions = afterFixture.players.map((player) => player.condition);
    ok(conditions.some((condition) => condition < 100), "at least one on-pitch player should drain below 100");
    ok(conditions.every((condition) => condition >= 0 && condition <= 100));
  }),
);

it.effect("a not-fully-recovered player's shortfall is surfaced in squad availability (below 100)", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const squad = yield* getSquad(savesDir, save.id);
    const player = squad.players[0]!;

    // A player who finished a heavy fixture below full carries that shortfall into the next match
    // rather than being reset to full.
    yield* setLedgerRow(save.id, player.id, 42, "none");

    const view = yield* getSquad(savesDir, save.id);
    const carried = view.players.find((p) => p.id === player.id)!;
    strictEqual(carried.condition, 42);
  }),
);

it.effect("recovery between Fixtures is keyed to the most recent injury Severity (knock faster than severe)", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const squad = yield* getSquad(savesDir, save.id);
    const [knockPlayer, severePlayer] = [squad.players[0]!, squad.players[1]!];

    // Same shortfall, same Natural Fitness scale, differing only in the last injury's Severity.
    yield* setLedgerRow(save.id, knockPlayer.id, 30, "light");
    yield* setLedgerRow(save.id, severePlayer.id, 30, "severe");

    yield* withSave(save.id, recoverClubFitness(squad.club.id, 1));

    const knockCondition = yield* ledgerCondition(save.id, knockPlayer.id);
    const severeCondition = yield* ledgerCondition(save.id, severePlayer.id);

    // Both recovered part of the way toward full, but neither all the way — the knock recovered more.
    ok(knockCondition > 30 && knockCondition < 100, `knock recovered to ${knockCondition}`);
    ok(severeCondition > 30 && severeCondition < 100, `severe recovered to ${severeCondition}`);
    ok(knockCondition > severeCondition, "a knock (light) recovers faster than a severe injury");
  }),
);