import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { ALL_ATTRIBUTES, type KnownFigure } from "@cm-clone/shared";
import type { PlayerId, SaveId } from "@cm-clone/contracts";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../../seeded-save.js";
import {
  getPlayerComparison,
  getPlayerSearch,
  getTransfersScreen,
} from "../../../src/main/transfers/index.js";
import { getPlayerContract, getPlayerProfile } from "../../../src/main/career/player.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-player-comparison-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

/** The human club's Scouting Progress on a player, seeded so the comparison read narrows. */
const setScoutingProgress = (saveId: string, clubId: string, playerId: PlayerId, progress: number) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql`DELETE FROM scouting_progress WHERE club_id = ${clubId} AND player_id = ${playerId}`;
      yield* sql`INSERT INTO scouting_progress (club_id, player_id, progress) VALUES (${clubId}, ${playerId}, ${progress})`;
    }),
  );

const compare = (saveId: SaveId, playerIds: readonly PlayerId[]) => getPlayerComparison(savesDir, saveId, playerIds);

const isRange = (figure: KnownFigure): figure is { _tag: "range"; low: number; high: number } =>
  figure._tag === "range";

const rowOf = <T extends { readonly id: PlayerId }>(rows: readonly T[], playerId: PlayerId): T => {
  const row = rows.find((candidate) => candidate.id === playerId);
  ok(row, "the compared player should have a column");
  return row;
};

it.effect(
  "reads each column by the human club's scouting progress — own squad exact, rivals ranged below Fully Scouted, exact at it, matching the search and the Profile",
  () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Test Career");
      const screen = yield* getTransfersScreen(savesDir, save.id);
      const rival = screen.marketPlayers[0];
      ok(rival, "expected a rival on the market");
      const humanClubId = screen.club.id;
      const ownSearch = yield* getPlayerSearch(savesDir, save.id, { clubName: screen.club.name });
      const own = ownSearch.results[0];
      ok(own, "expected an own-squad player");

      const columnsAt = (progress: number) =>
        Effect.gen(function* () {
          yield* setScoutingProgress(save.id, humanClubId, rival.id, progress);
          const view = yield* compare(save.id, [own.id, rival.id]);
          strictEqual(view.rows.length, 2, "one column per player asked");
          return { ownColumn: rowOf(view.rows, own.id), rivalColumn: rowOf(view.rows, rival.id) };
        });

      // The own-squad column is the same at every rival progress: exact by rule, never ranged.
      const { ownColumn } = yield* columnsAt(0);
      strictEqual(ownColumn.overallRating._tag, "exact", "own-squad OVR must be exact");
      strictEqual(ownColumn.transferValue._tag, "exact", "own-squad Value must be exact");
      ok(ownColumn.wage !== null, "an own-squad wage is the contract wage, never null");
      ok(
        ownColumn.contractExpiry !== "Free Agent",
        "an own-squad contract has a length, never a Free-Agent label",
      );

      // The rival column narrows with progress and never publishes an exact figure below 100.
      for (const progress of [0, 50, 99]) {
        const { rivalColumn } = yield* columnsAt(progress);
        for (const attribute of ALL_ATTRIBUTES) {
          const figure = rivalColumn.attributes[attribute];
          if (figure === undefined) continue;
          ok(
            isRange(figure),
            `${attribute} at ${progress} must publish a Range`,
          );
        }
        ok(isRange(rivalColumn.overallRating), `rival OVR at ${progress} must be a Range`);
        ok(isRange(rivalColumn.transferValue), `rival Value at ${progress} must be a Range`);
        ok(rivalColumn.wage !== null, "a contracted rival's wage is a fact, never null");
        strictEqual(
          rivalColumn.contractExpiry,
          yield* Effect.map(getPlayerContract(savesDir, save.id, rival.id), (contract) => `${contract.lengthYears} years`),
          "the rival's contract is read from the same contract row the contract screen reads",
        );
      }

      // Exactly as the search and the Profile publish for the same player at the same scouting.
      const { rivalColumn } = yield* columnsAt(100);
      strictEqual(rivalColumn.overallRating._tag, "exact", "Fully Scouted OVR must be exact");
      strictEqual(rivalColumn.transferValue._tag, "exact", "Fully Scouted Value must be exact");

      const searchHit = yield* getPlayerSearch(savesDir, save.id, {
        name: `${rival.firstName} ${rival.lastName}`,
      });
      const searchRow = searchHit.results.find((row) => row.id === rival.id);
      ok(searchRow, "the scouted rival should appear in the search results");
      deepStrictEqual(rivalColumn.overallRating, searchRow.overallRating, "OVR equals the search's");
      deepStrictEqual(rivalColumn.transferValue, searchRow.transferValue, "Value equals the search's");
      deepStrictEqual(rivalColumn.positions, searchRow.positions, "positions equal the search's");

      const profile = yield* getPlayerProfile(savesDir, save.id, rival.id);
      deepStrictEqual(rivalColumn.overallRating, profile.overallRating, "OVR equals the Profile's");
      deepStrictEqual(rivalColumn.transferValue, profile.transferValue, "Value equals the Profile's");
      for (const attribute of ALL_ATTRIBUTES) {
        deepStrictEqual(
          rivalColumn.attributes[attribute],
          profile.attributes[attribute],
          `${attribute} equals the Profile's`,
        );
      }
      strictEqual(rivalColumn.contractExpiry, profile.contractExpiry, "availability equals the Profile's");
      strictEqual(rivalColumn.injuryStatus, profile.injuryStatus, "injury status equals the Profile's");

      // And the comparison never carries a hidden Attribute — it draws a screen, screens show none.
      strictEqual(rivalColumn.attributes.injuryProneness, undefined, "no hidden Attribute on the wire");

      // The own-squad column matches the Profile too, exact throughout.
      const ownProfile = yield* getPlayerProfile(savesDir, save.id, own.id);
      deepStrictEqual(ownColumn.overallRating, ownProfile.overallRating);
      strictEqual(ownColumn.contractExpiry, ownProfile.contractExpiry);
      strictEqual(ownColumn.injuryStatus, ownProfile.injuryStatus);
    }),
  20_000,
);

it.effect("a Free Agent column reads no wage and no contract; the availability facts stay exact", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const screen = yield* getTransfersScreen(savesDir, save.id);
    const rival = screen.marketPlayers[0];
    ok(rival, "expected a rival on the market");

    // Free the rival: no club, no contract — the comparison must read the absence, not a spare zero.
    yield* withSave(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        yield* sql`UPDATE players SET club_id = NULL WHERE id = ${rival.id}`;
        yield* sql`DELETE FROM contracts WHERE player_id = ${rival.id}`;
      }),
    );

    const view = yield* compare(save.id, [rival.id]);
    const column = rowOf(view.rows, rival.id);
    strictEqual(column.clubId, null);
    strictEqual(column.clubName, null);
    strictEqual(column.wage, null, "a Free Agent has no wage to publish");
    strictEqual(column.contractExpiry, "Free Agent");
    ok(typeof column.injuryStatus === "string", "availability still publishes an injury status");
  }),
);

it.effect("publishes no exact figure for any rival below Fully Scouted, wage excepted as a fact", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const screen = yield* getTransfersScreen(savesDir, save.id);
    const rivalA = screen.marketPlayers[0];
    const rivalB = screen.marketPlayers[1];
    ok(rivalA && rivalB, "expected two rivals on the market");

    // One short of Fully Scouted and one never scouted: neither may leak an exact figure.
    yield* setScoutingProgress(save.id, screen.club.id, rivalA.id, 99);
    const view = yield* compare(save.id, [rivalA.id, rivalB.id]);

    for (const column of view.rows) {
      for (const attribute of ALL_ATTRIBUTES) {
        const figure = column.attributes[attribute];
        if (figure === undefined) continue;
        ok(isRange(figure), `a below-Fully-Scouted ${attribute} must read a Range`);
      }
      ok(isRange(column.overallRating), "a below-Fully-Scouted OVR must read a Range");
      ok(isRange(column.transferValue), "a below-Fully-Scouted Value must read a Range");
      // Wage, contract and availability are facts, not market readings — they stay exact.
      strictEqual(typeof column.wage, "number", "the contract wage is published, never ranged");
      ok(column.contractExpiry !== "Free Agent");
      strictEqual(typeof column.injuryStatus, "string");
    }
  }),
);

it.effect("refuses a player the save does not hold", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const failure = yield* Effect.flip(compare(save.id, ["no-such-player" as PlayerId]));
    strictEqual(failure._tag, "PlayerNotFoundError");
  }),
);

it.effect("comparing nothing answers with no columns", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const view = yield* compare(save.id, []);
    strictEqual(view.rows.length, 0);
  }),
);