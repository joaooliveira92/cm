/**
 * Player ages are measured on the game date, never on the machine's clock (gate-red-on-dev ticket 09).
 *
 * The same seeded world is played through one Season twice, under two different faked system dates,
 * and everything an age feeds must come out identical: the opening wages world generation prices, the
 * Squad screen's ages, the market's Transfer Values, and the Attributes Player Development writes at
 * `SeasonConcluded`. Before the ticket, all four read the wall clock, so the same seed developed and
 * paid its players differently depending on the year the game was run.
 *
 * One expensive test in this file: two Seasons played end to end.
 */
import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { deepStrictEqual, notDeepStrictEqual, ok } from "node:assert";
import { it } from "@effect/vitest";
import type { SaveId } from "@cm-clone/contracts";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach, vi } from "vitest";
import { getSquad } from "../../../src/main/club/index.js";
import { getTransfersScreen } from "../../../src/main/transfers/index.js";
import { createSave } from "../../seeded-save.js";
import { advanceThroughBoundary } from "../boundary-helpers.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-game-date-ages-test-"));
});

afterEach(async () => {
  vi.useRealTimers();
  await rm(savesDir, { recursive: true, force: true });
});

const withSave = <A, E>(saveId: SaveId, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

/** Every Contract's wage and every player's Attributes, keyed by the seeded player id. */
const snapshotWorld = (saveId: SaveId) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const wages = yield* sql<{ playerId: string; wage: number }>`
        SELECT player_id as "playerId", wage FROM contracts ORDER BY player_id`;
      const attributes = yield* sql<Record<string, unknown>>`SELECT * FROM players ORDER BY id`;
      return { wages, attributes };
    }),
  );

const advanceToSeasonEnd = (saveId: SaveId) =>
  Effect.gen(function* () {
    for (let i = 0; i < 60; i++) {
      const { seasonConcluded } = yield* advanceThroughBoundary(savesDir, saveId);
      if (seasonConcluded) return;
    }
    throw new Error("SeasonConcluded never fired within 60 Continue presses");
  });

/** The world as far as ages reach it, played from generation through one Season with the machine's
 *  clock pinned to `systemDate`. Only `Date` is faked: timers stay real so SQLite and the Effect
 *  scheduler run as normal. */
const playUnderSystemDate = (systemDate: string) =>
  Effect.gen(function* () {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(systemDate));
    const save = yield* createSave(savesDir, `Clock ${systemDate}`);
    const opening = yield* snapshotWorld(save.id);
    const squadAges = (yield* getSquad(savesDir, save.id)).players.map((player) => [player.id, player.age]);
    const market = (yield* getTransfersScreen(savesDir, save.id)).marketPlayers.map((player) => [
      player.id,
      player.age,
      player.transferValue,
    ]);
    yield* advanceToSeasonEnd(save.id);
    const concluded = yield* snapshotWorld(save.id);
    vi.useRealTimers();
    return { opening, squadAges, market, concluded };
  });

it.effect(
  "a seeded world prices, shows and develops its players identically whatever the machine's date",
  () =>
    Effect.gen(function* () {
      const early = yield* playUnderSystemDate("2019-02-03T12:00:00Z");
      const late = yield* playUnderSystemDate("2043-11-20T12:00:00Z");

      ok(early.opening.wages.length > 0 && early.market.length > 0);
      // The Season really developed someone, so the comparison below is not two untouched worlds.
      notDeepStrictEqual(early.concluded.attributes, early.opening.attributes);

      deepStrictEqual(late.opening.wages, early.opening.wages, "opening wages");
      deepStrictEqual(late.squadAges, early.squadAges, "Squad screen ages");
      deepStrictEqual(late.market, early.market, "market ages and Transfer Values");
      deepStrictEqual(late.concluded.attributes, early.concluded.attributes, "developed Attributes");
      deepStrictEqual(late.concluded.wages, early.concluded.wages, "wages after the Season");
    }),
  { timeout: 120_000 },
);
