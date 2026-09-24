import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { it } from "@effect/vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { PlayerId, SaveId } from "@cm-clone/contracts";
import { ALL_ATTRIBUTES } from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach, describe, expect } from "vitest";
import { createSave } from "../../seeded-save.js";
import {
  developPlayersForSeason,
  getPlayerDevelopmentHistory,
  getSquad,
} from "../../../src/main/club/index.js";
import { seasonDevelopments } from "../../../src/main/club/training.js";
import { loadGameDate } from "../../../src/main/season/currentSeason.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-development-history-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: ':memory:' })),
    Effect.scoped,
  );

// Ticket 07 (Screen 113): the per-Season derivation. Table test over the cases the log can hold.
describe("seasonDevelopments", () => {
  it("has nothing to show before any Season has concluded", () => {
    expect(seasonDevelopments([])).toEqual([]);
  });

  it("gives the earliest recorded Season no comparison, since the log holds no starting Attributes", () => {
    const [only] = seasonDevelopments([{ seasonNumber: 1, attributes: { passing: 10 } }]);
    expect(only).toMatchObject({ seasonNumber: 1, comparedWithSeason: null, changes: [] });
  });

  it("compares each Season with the previous recorded one, newest first, visible Attributes only", () => {
    const seasons = seasonDevelopments([
      // Out of order on purpose: the log's row order is not the Season order.
      { seasonNumber: 4, attributes: { passing: 13, pace: 15, gkHandling: 9, injuryProneness: 7 } },
      { seasonNumber: 1, attributes: { passing: 10, pace: 16, injuryProneness: 5 } },
      { seasonNumber: 2, attributes: { passing: 12, pace: 16, injuryProneness: 6 } },
    ]);

    expect(seasons.map((season) => [season.seasonNumber, season.comparedWithSeason])).toEqual([
      [4, 2], // a gap: the player was away in Season 3, so Season 4 is measured from Season 2
      [2, 1],
      [1, null],
    ]);
    // Unchanged pace is left out; a hidden Attribute never appears even though it moved; an
    // Attribute present on one side only has nothing to compare.
    expect(seasons[1]!.changes).toEqual([{ attribute: "passing", from: 10, to: 12 }]);
    expect(seasons[0]!.changes).toEqual([
      { attribute: "passing", from: 12, to: 13 },
      { attribute: "pace", from: 16, to: 15 },
    ]);
  });

  it("lists changes in the fixed Attribute order, whatever order the payload's keys are in", () => {
    const [latest] = seasonDevelopments([
      { seasonNumber: 1, attributes: { decisions: 5, crossing: 5, strength: 5 } },
      { seasonNumber: 2, attributes: { strength: 6, decisions: 6, crossing: 6 } },
    ]);
    const order = latest!.changes.map((change) => change.attribute);
    expect(order).toEqual([...order].sort((a, b) => ALL_ATTRIBUTES.indexOf(a) - ALL_ATTRIBUTES.indexOf(b)));
    expect(order).toHaveLength(3);
  });
});

const eventCount = (saveId: SaveId) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const rows = yield* sql<{ n: number }>`SELECT COUNT(*) as n FROM events`;
      return rows[0]!.n;
    }),
  );

const visibleChanges = (
  from: Readonly<Partial<Record<string, number>>>,
  to: Readonly<Partial<Record<string, number>>>,
) =>
  ALL_ATTRIBUTES.flatMap((attribute) => {
    const before = from[attribute];
    const after = to[attribute];
    return before === undefined || after === undefined || before === after ? [] : [{ attribute, from: before, to: after }];
  });

// Through the real writer: the read must understand what `developPlayersForSeason` actually appends.
it.effect(
  "getPlayerDevelopmentHistory reads the Attribute changes Player Development recorded for an own-club player",
  () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "History");
      const squad = yield* getSquad(savesDir, save.id);

      const before = yield* getPlayerDevelopmentHistory(savesDir, save.id, squad.players[0]!.id);
      deepStrictEqual(before.seasons, []);

      yield* withSave(save.id, Effect.flatMap(loadGameDate, (on) => developPlayersForSeason(1, on)));
      const afterOne = yield* getSquad(savesDir, save.id);
      yield* withSave(save.id, Effect.flatMap(loadGameDate, (on) => developPlayersForSeason(2, on)));
      const afterTwo = yield* getSquad(savesDir, save.id);

      // A player whose Attributes really moved in Season 2, so the assertion cannot pass vacuously.
      const moved = afterTwo.players
        .map((player) => ({
          id: player.id,
          expected: visibleChanges(afterOne.players.find((p) => p.id === player.id)!.attributes, player.attributes),
        }))
        .find((player) => player.expected.length > 0);
      ok(moved !== undefined, "some own-club player developed in Season 2");

      const eventsBefore = yield* eventCount(save.id);
      const history = yield* getPlayerDevelopmentHistory(savesDir, save.id, moved.id);
      strictEqual(yield* eventCount(save.id), eventsBefore, "a read appends nothing");

      strictEqual(history.playerId, moved.id);
      deepStrictEqual(
        history.seasons.map((season) => [season.seasonNumber, season.comparedWithSeason]),
        [
          [2, 1],
          [1, null],
        ],
      );
      expect(history.seasons[0]!.changes).toEqual(moved.expected);
    }),
  120_000,
);

it.effect("getPlayerDevelopmentHistory refuses a player off the manager's club and an unknown player", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "History");
    const otherPlayerId = yield* withSave(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        const rows = yield* sql<{ id: PlayerId }>`
          SELECT id FROM players
          WHERE club_id <> (SELECT id FROM clubs WHERE is_user_club = 1 LIMIT 1)
          ORDER BY id LIMIT 1`;
        return rows[0]!.id;
      }),
    );

    const notOwn = yield* Effect.flip(getPlayerDevelopmentHistory(savesDir, save.id, otherPlayerId));
    strictEqual(notOwn._tag, "NotYourPlayerError");

    const missing = yield* Effect.flip(
      getPlayerDevelopmentHistory(savesDir, save.id, PlayerId.make("player_nobody")),
    );
    strictEqual(missing._tag, "PlayerNotFoundError");
  }),
  60_000,
);

it.effect("getPlayerDevelopmentHistory fails with SaveNotFoundError for a save that is not there", () =>
  Effect.gen(function* () {
    const error = yield* Effect.flip(
      getPlayerDevelopmentHistory(savesDir, SaveId.make("save_nobody"), PlayerId.make("p1")),
    );
    strictEqual(error._tag, "SaveNotFoundError");
  }),
);
