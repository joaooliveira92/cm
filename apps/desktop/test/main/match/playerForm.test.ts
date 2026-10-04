import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { ok, strictEqual } from "node:assert";
import type { ClubId, MatchId, PlayerId, SaveId } from "@cm-clone/contracts";
import { Effect } from "effect";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { getPlayerForm } from "../../../src/main/match/playerForm.js";
import { getMatchRatings } from "../../../src/main/match/ratings.js";
import { resumeSimulation } from "../../../src/main/match/index.js";
import { commitMatchday } from "../../../src/main/season/commitMatchday.js";
import { atFirstFixture, startSeededMatch } from "../match/seededMatch.js";

/**
 * Player Form (match-screen ticket 19): the recent games and the five-rating strip behind the Form
 * tab, read over a seeded save. The rating on a played row is the same number the Ratings tab shows,
 * and a player signed after a fixture gets no row before the day he joined.
 */
const ANY_MATCH_SEED = 7;

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-player-form-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: SaveId, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

const drain = (saveId: SaveId, matchId: MatchId) =>
  Effect.gen(function* () {
    let cursor = 0;
    let isComplete = false;
    while (!isComplete) {
      const chunk = yield* resumeSimulation(savesDir, saveId, matchId, cursor, null);
      cursor = chunk.cursor;
      isComplete = chunk.isComplete;
    }
  });

/** A starter in the human's fixture, and the club he played for. */
const firstStarter = (saveId: SaveId, fixtureId: number) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const rows = yield* sql<{ playerId: string; clubId: string }>`
        SELECT player_id as "playerId", club_id as "clubId" FROM player_match_lines
        WHERE fixture_id = ${fixtureId} AND started = 1 ORDER BY player_id LIMIT 1`;
      return { playerId: rows[0]!.playerId as PlayerId, clubId: rows[0]!.clubId as ClubId };
    }),
  );

const insertTransfer = (saveId: SaveId, playerId: PlayerId, clubId: ClubId, on: string) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql`INSERT INTO player_transfers (player_id, from_club_id, to_club_id, transferred_on, fee)
                 VALUES (${playerId}, NULL, ${clubId}, ${on}, 0)`;
    }),
  );

const deleteTransfers = (saveId: SaveId, playerId: PlayerId) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql`DELETE FROM player_transfers WHERE player_id = ${playerId}`;
    }),
  );

it.effect("a played row carries the same Match Rating as the Ratings tab, and the strip counts it", () =>
  Effect.gen(function* () {
    const { save, fixtureId } = yield* atFirstFixture(savesDir);
    const match = yield* startSeededMatch(savesDir, save.id, fixtureId, ANY_MATCH_SEED);
    yield* drain(save.id, match.matchId);
    yield* commitMatchday(savesDir, save.id, fixtureId);

    const { playerId, clubId } = yield* firstStarter(save.id, fixtureId);
    const form = yield* getPlayerForm(savesDir, save.id, playerId, null);

    strictEqual(form.selectedClubId, clubId, "defaults to the player's current club");
    const game = form.games.find((row) => row.fixtureId === fixtureId);
    ok(game !== undefined && game.state === "played", "the committed fixture is a played row");
    ok(game.rating !== null, "a played row is rated");

    const ratings = yield* getMatchRatings(savesDir, save.id, match.matchId, null);
    ok(ratings !== null, "the match has a ratings view");
    const ratingRow = [...ratings.home, ...ratings.away].find((row) => row.playerId === playerId);
    ok(ratingRow !== undefined, "the player is rated");
    strictEqual(game.rating, ratingRow.rating, "the Form row's rating equals the Ratings tab's");
    ok(form.formRatings.includes(ratingRow.rating), "the form strip counts the appearance");

    // The season block totals the appearance: one start, the goals, and a mean rating.
    const overall = form.season.find((row) => row.kind === "overall");
    ok(overall !== undefined, "the season block has an Overall row");
    strictEqual(overall.starts, 1, "one start");
    strictEqual(overall.subs, 0, "no substitute appearance");
    strictEqual(overall.goals, game.goals, "the season totals equal the row's");
    ok(overall.averageRating !== null, "an appearance gives a mean rating");
    strictEqual(overall.averageRating, game.rating, "one appearance means the mean equals the rating");

    // The Player of the Match is marked, and his season row counts it.
    const momId = ratings.playerOfTheMatch;
    ok(momId !== null, "a finished match names a Player of the Match");
    const momForm = yield* getPlayerForm(savesDir, save.id, momId!, null);
    const momOverall = momForm.season.find((row) => row.kind === "overall");
    ok(momOverall !== undefined && momOverall.mom >= 1, "the Player of the Match counts one MoM");
  }),
);

it.effect("a player signed after a fixture gets no row before the day he joined", () =>
  Effect.gen(function* () {
    const { save, fixtureId } = yield* atFirstFixture(savesDir);
    const match = yield* startSeededMatch(savesDir, save.id, fixtureId, ANY_MATCH_SEED);
    yield* drain(save.id, match.matchId);
    yield* commitMatchday(savesDir, save.id, fixtureId);

    const { playerId, clubId } = yield* firstStarter(save.id, fixtureId);

    // Joined long after this fixture: the fixture predates him and does not appear.
    yield* insertTransfer(save.id, playerId, clubId, "2099-01-01");
    const after = yield* getPlayerForm(savesDir, save.id, playerId, null);
    ok(
      after.games.every((row) => row.fixtureId !== fixtureId),
      "a fixture before the player joined is not listed",
    );

    // Joined before the fixture: it appears again.
    yield* deleteTransfers(save.id, playerId);
    const before = yield* getPlayerForm(savesDir, save.id, playerId, null);
    ok(
      before.games.some((row) => row.fixtureId === fixtureId),
      "a fixture after the player joined is listed",
    );
  }),
);
