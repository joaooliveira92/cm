import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { ok, strictEqual } from "node:assert";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { compareCodeUnits, transferValue, type KnownFigure } from "@cm-clone/shared";
import type { PlayerId, PlayerSearchQuery, PlayerSearchResultView, SaveId } from "@cm-clone/contracts";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../../seeded-save.js";
import {
  PLAYER_SEARCH_MAX_RESULTS,
  getPlayerSearch,
  getTransfersScreen,
  loadAllPlayersEcon,
} from "../../../src/main/transfers/index.js";
import { loadGameDate } from "../../../src/main/season/currentSeason.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-player-search-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

/** The human club's Scouting Progress on a player, seeded so the search read narrows. */
const setScoutingProgress = (saveId: string, clubId: string, playerId: PlayerId, progress: number) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql`DELETE FROM scouting_progress WHERE club_id = ${clubId} AND player_id = ${playerId}`;
      yield* sql`INSERT INTO scouting_progress (club_id, player_id, progress) VALUES (${clubId}, ${playerId}, ${progress})`;
    }),
  );

const search = (saveId: SaveId, query: PlayerSearchQuery) => getPlayerSearch(savesDir, saveId, query);

const isRange = (figure: KnownFigure): figure is { _tag: "range"; low: number; high: number } =>
  figure._tag === "range";

/** The whole save, recomputed from stored truth (never off the search response below Fully
 *  Scouted): the true figures behind a published read. */
const trueFiguresOf = (saveId: SaveId, playerId: PlayerId) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const players = yield* loadAllPlayersEcon(yield* loadGameDate);
      const player = players.find((p) => p.id === playerId);
      ok(player, "expected the player in the store");
      return {
        overallRating: player.overallRating,
        transferValue: transferValue(player.overallRating, player.age, player.potentialAbility),
      };
    }),
  );

/** The search's documented ordering law: last name, first name, id — code-unit comparison, so it
 *  is the same on every machine and leaks nothing about hidden figures. */
const isNeutrallyOrdered = (results: readonly PlayerSearchResultView[]): boolean =>
  results.every((row, index, all) => {
    const before = all[index - 1];
    if (before === undefined) return true;
    return (
      compareCodeUnits(before.lastName.toLowerCase(), row.lastName.toLowerCase()) < 0 ||
      (before.lastName.toLowerCase() === row.lastName.toLowerCase() &&
        (compareCodeUnits(before.firstName.toLowerCase(), row.firstName.toLowerCase()) < 0 ||
          (before.firstName.toLowerCase() === row.firstName.toLowerCase() &&
            compareCodeUnits(before.id, row.id) < 0)))
    );
  });

it.effect(
  "searches the whole save as one pool — own squad, rivals and Free Agents together",
  () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Test Career");
      const screen = yield* getTransfersScreen(savesDir, save.id);
      const rival = screen.marketPlayers[0];
      ok(rival, "expected a rival on the market");

      // An empty, unfiltered query searches the whole save.
      const own = yield* search(save.id, {});
      ok(own.results.length > 0, "an empty query returns rows");

      // A rival by name.
      const rivalHit = yield* search(save.id, { name: `${rival.firstName} ${rival.lastName}` });
      ok(
        rivalHit.results.some((row) => row.id === rival.id),
        "a rival should appear by name",
      );

      // A Free Agent: free the rival, and the same name now finds a club-less row in the same pool.
      yield* withSave(
        save.id,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          yield* sql`UPDATE players SET club_id = NULL WHERE id = ${rival.id}`;
          yield* sql`DELETE FROM contracts WHERE player_id = ${rival.id}`;
        }),
      );
      const freedHit = yield* search(save.id, { name: `${rival.firstName} ${rival.lastName}` });
      const freed = freedHit.results.find((row) => row.id === rival.id);
      ok(freed, "the freed player should still be searchable");
      strictEqual(freed?.clubId, null);
      strictEqual(freed?.clubName, null);
    }),
  20_000,
);

it.effect("an own-squad Player reads exact; a rival narrows with progress and never widens, exact at 100", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const screen = yield* getTransfersScreen(savesDir, save.id);
    const target = screen.marketPlayers[0];
    ok(target);
    const humanClubId = screen.club.id;

    const figureAt = (progress: number) =>
      Effect.gen(function* () {
        yield* setScoutingProgress(save.id, humanClubId, target.id, progress);
        const hit = yield* search(save.id, { name: `${target.firstName} ${target.lastName}` });
        const row = hit.results.find((candidate) => candidate.id === target.id);
        ok(row, "the scouted rival should appear in the search results");
        return row.overallRating;
      });

    const at0 = yield* figureAt(0);
    const at50 = yield* figureAt(50);
    const at100 = yield* figureAt(100);

    ok(isRange(at0), "progress 0 should publish a Range");
    ok(isRange(at50), "progress 50 should publish a Range");
    strictEqual(at100._tag, "exact", "progress 100 should publish the exact figure");

    if (isRange(at0) && isRange(at50)) {
      ok(at50.low >= at0.low, `low bound must not fall: ${at50.low} >= ${at0.low}`);
      ok(at50.high <= at0.high, `high bound must not rise: ${at50.high} <= ${at0.high}`);
      ok(
        at50.high - at50.low < at0.high - at0.low,
        `the band must narrow with progress: ${at50.high - at50.low} < ${at0.high - at0.low}`,
      );
    }

    const truth = yield* trueFiguresOf(save.id, target.id);
    if (at100._tag === "exact") {
      strictEqual(at100.value, truth.overallRating, "the exact figure is the true figure");
    }
    if (isRange(at0)) {
      ok(
        truth.overallRating >= at0.low && truth.overallRating <= at0.high,
        "the true figure must fall inside the widest published Range",
      );
    }

    // An own-squad Player is exact by rule, never ranged — search one by name, read the row.
    const own = yield* search(save.id, { clubName: screen.club.name });
    const ownRow = own.results[0];
    ok(ownRow, "searching the own club's name should list own-squad players");
    strictEqual(ownRow.clubId, humanClubId);
    strictEqual(ownRow.overallRating._tag, "exact", "own-squad OVR must be exact");
    strictEqual(ownRow.transferValue._tag, "exact", "own-squad Value must be exact");
  }),
);

it.effect("publishes no exact figure for any rival or Free Agent below Fully Scouted", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const screen = yield* getTransfersScreen(savesDir, save.id);
    const humanClubId = screen.club.id;

    // Seed one rival at 99 — one short of Fully Scouted, so the band has collapsed to the same
    // number at both ends but must still publish as a Range (AC: no exact figure leaks).
    const target = screen.marketPlayers[0];
    ok(target);
    yield* setScoutingProgress(save.id, humanClubId, target.id, 99);

    const scouted99 = yield* search(save.id, { name: `${target.firstName} ${target.lastName}` });
    const row99 = scouted99.results.find((row) => row.id === target.id);
    ok(row99, "the 99-scouted rival should appear by name");
    ok(isRange(row99.overallRating), "a player at 99 reads a Range, never an exact figure");
    ok(isRange(row99.transferValue), "a player at 99's Value reads a Range, never an exact figure");

    // And every other foreign reader of the whole pool: one rival at 99, everything else
    // Unscouted, no scouting at 100 anywhere. Own-squad rows are exact (full-info by rule).
    const whole = yield* search(save.id, {});
    for (const row of whole.results) {
      if (row.clubId === humanClubId) continue;
      ok(isRange(row.overallRating), `${row.firstName} ${row.lastName} OVR leaked an exact figure`);
      ok(isRange(row.transferValue), `${row.firstName} ${row.lastName} Value leaked an exact figure`);
    }
  }),
  20_000,
);

it.effect("filters by name, age range, position, nationality and club name", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const screen = yield* getTransfersScreen(savesDir, save.id);

    // Name: a fabricated surname names nobody.
    const none = yield* search(save.id, { name: "Nonesuch" });
    strictEqual(none.total, 0);

    // Age: bound the own squad's first player — the age the wire itself just published.
    const club = yield* search(save.id, { clubName: screen.club.name });
    const sample = club.results[0];
    ok(sample);
    const atLeast = yield* search(save.id, { minAge: sample.age });
    ok(atLeast.results.some((row) => row.id === sample.id), "minAge includes the player");
    const pastIt = yield* search(save.id, { minAge: sample.age + 1 });
    ok(
      !pastIt.results.some((row) => row.id === sample.id),
      "minAge above the player's age excludes them",
    );

    // Position: the sample player's own position from their row filters to players who play it.
    const position = sample.positions[0]?.position;
    ok(position);
    const byPosition = yield* search(save.id, { position });
    ok(byPosition.results.some((row) => row.id === sample.id));
    ok(
      byPosition.results.every((row) => row.positions.some((p) => p.position === position)),
      "every positional hit plays the position",
    );

    // Nationality: filter by a nation the save actually holds, and only that nation comes back.
    const nationality = sample.nationality;
    const byNation = yield* search(save.id, { nationality });
    ok(byNation.results.some((row) => row.id === sample.id));
    ok(
      byNation.results.every((row) => row.nationality === nationality),
      "every nationality hit is of the filtered nation",
    );

    // Club name: the own club's name matches exactly its squad, and nothing else.
    const byClub = yield* search(save.id, { clubName: screen.club.name });
    ok(byClub.results.length > 0);
    ok(
      byClub.results.every((row) => row.clubId === screen.club.id),
      "a club name search returns only that club's players",
    );

    // An inverted age range is empty, deterministically.
    const inverted = yield* search(save.id, {
      minAge: sample.age + 2,
      maxAge: sample.age + 1,
    });
    strictEqual(inverted.total, 0);
  }),
);

it.effect("caps its rows at the results limit and orders them neutrally and deterministically", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const players = yield* withSave(
      save.id,
      Effect.gen(function* () {
        return yield* loadAllPlayersEcon(yield* loadGameDate);
      }),
    );

    const first = yield* search(save.id, {});
    strictEqual(first.total, players.length, "total is the whole save's player count");
    ok(first.total >= PLAYER_SEARCH_MAX_RESULTS, "the seeded world outgrows the cap");
    strictEqual(
      first.results.length,
      PLAYER_SEARCH_MAX_RESULTS,
      "a query wider than the cap publishes exactly the cap",
    );
    ok(
      isNeutrallyOrdered(first.results),
      "rows are ordered by last name, first name, id — never a hidden figure",
    );

    const second = yield* search(save.id, {});
    strictEqual(
      JSON.stringify(second.results),
      JSON.stringify(first.results),
      "the same query returns the same rows in the same order",
    );
  }),
  40_000,
);