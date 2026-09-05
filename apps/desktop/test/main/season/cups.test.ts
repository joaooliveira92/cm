/**
 * Domestic cups (ticket 12): round-by-round progression drawn from the last round's winners,
 * shootouts, bracket reproduction from the world seed, and cross-depth ties.
 */

import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import type { SaveId } from "@cm-clone/contracts";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { cupRoundDate, tieWinner } from "@cm-clone/shared";
import { createSave } from "../../../src/main/world/index.js";
import { createPyramidSnapshot } from "../snapshot-helpers.js";
import { advanceCalendar, discardSquadsForClubs, getFixtures } from "../../../src/main/season/index.js";
import { seasonHelpers } from "./helpers.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-season-cups-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const { createCareerFrom, createCareerFromWorldSeed, withSaveWrite } = seasonHelpers(() => savesDir);

/** Every cup fixture of a save, in bracket order. */
const loadCupFixtures = (saveId: string, cupId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    return yield* sql<{
      round: number;
      homeClubId: string;
      awayClubId: string;
      homeGoals: number | null;
      awayGoals: number | null;
      homePenalties: number | null;
      awayPenalties: number | null;
      scheduledDate: string;
      played: number;
    }>`SELECT round, home_club_id as "homeClubId", away_club_id as "awayClubId",
              home_goals as "homeGoals", away_goals as "awayGoals",
              home_penalties as "homePenalties", away_penalties as "awayPenalties",
              scheduled_date as "scheduledDate", played
       FROM fixtures WHERE competition_id = ${cupId} AND season_number = 1
       ORDER BY round ASC, id ASC`;
  }).pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`), readonly: true })),
    Effect.scoped,
  );

/** How many non-cup fixtures carry a penalty score. Must always be zero. */
const loadPenaltyBearingLeagueFixtures = (saveId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ count: number }>`
      SELECT COUNT(*) as "count" FROM fixtures f JOIN competitions c ON c.id = f.competition_id
      WHERE c.kind <> 'cup' AND (f.home_penalties IS NOT NULL OR f.away_penalties IS NOT NULL)`;
    return rows[0]?.count ?? 0;
  }).pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`), readonly: true })),
    Effect.scoped,
  );

/** Advances until the season concludes, or gives up — a season that never ends is the failure. */
const playWholeSeason = (saveId: SaveId) =>
  Effect.gen(function* () {
    for (let advance = 0; advance < 80; advance += 1) {
      const result = yield* advanceCalendar(savesDir, saveId);
      if (result.seasonConcluded) return advance + 1;
    }
    return null;
  });

it.effect("a cup runs round by round, and every round is drawn from the last one's winners", () =>
  Effect.gen(function* () {
    // The default scope: one division and the cup it feeds. A 20-club field is a 32-slot bracket
    // with 12 byes, which exercises every part of the shape without simulating a whole pyramid.
    const save = yield* createSave(savesDir, "Cup Career");
    ok((yield* playWholeSeason(save.id)) !== null, "the season should conclude");

    const ties = yield* loadCupFixtures(save.id, "comp_eng_cup");
    ok(ties.length > 0, "the cup should have played ties");
    ok(ties.every((tie) => tie.played === 1));

    const byRound = new Map<number, typeof ties>();
    for (const tie of ties) byRound.set(tie.round, [...(byRound.get(tie.round) ?? []), tie]);
    const rounds = [...byRound.keys()].sort((a, b) => a - b);

    // 20 entrants: 12 byes, 4 ties in round 1, then 16 clubs, 8, 4, 2, 1.
    deepStrictEqual(rounds, [1, 2, 3, 4, 5]);
    deepStrictEqual(
      rounds.map((round) => byRound.get(round)!.length),
      [4, 8, 4, 2, 1],
    );

    // From round 3 on, every club in a round won its last tie — nothing enters late, and no club
    // that lost reappears.
    for (let index = 2; index < rounds.length; index += 1) {
      const winners = new Set(
        byRound
          .get(rounds[index - 1]!)!
          .map((tie) => tieWinner({ ...tie, homeGoals: tie.homeGoals ?? 0, awayGoals: tie.awayGoals ?? 0 })),
      );
      for (const tie of byRound.get(rounds[index]!)!) {
        for (const clubId of [tie.homeClubId, tie.awayClubId]) {
          ok(winners.has(clubId), `round ${rounds[index]}: ${clubId} did not win its last tie`);
        }
      }
    }
  }),
  180_000,
);

it.effect("a drawn tie is settled by a shootout, and no league fixture ever carries penalties", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Cup Career");
    yield* playWholeSeason(save.id);

    const ties = yield* loadCupFixtures(save.id, "comp_eng_cup");
    for (const tie of ties) {
      // The paired invariant the schema's CHECK enforces, asserted from the other side.
      strictEqual(tie.homePenalties === null, tie.awayPenalties === null);
      if (tie.homeGoals === tie.awayGoals) {
        ok(tie.homePenalties !== null, "a level tie must have gone to penalties");
        ok(tie.homePenalties !== tie.awayPenalties, "a shootout must produce a winner");
      } else {
        strictEqual(tie.homePenalties, null);
      }
    }

    // A draw is a legitimate league result, so nothing outside a cup is ever settled this way.
    strictEqual(yield* loadPenaltyBearingLeagueFixtures(save.id), 0);
  }),
  180_000,
);

it.effect("the bracket reproduces from the world seed alone", () =>
  Effect.gen(function* () {
    const first = yield* createCareerFromWorldSeed(5150, "Cup A");
    const second = yield* createCareerFromWorldSeed(5150, "Cup B");
    for (let advance = 0; advance < 12; advance += 1) {
      yield* advanceCalendar(savesDir, first.id);
      yield* advanceCalendar(savesDir, second.id);
    }

    const a = yield* loadCupFixtures(first.id, "comp_eng_cup");
    const b = yield* loadCupFixtures(second.id, "comp_eng_cup");

    ok(a.some((tie) => tie.round > 1), "the bracket should have progressed");
    deepStrictEqual(a, b);
  }),
  180_000,
);

it.effect("a cup fixture sits on the date its round always had, however late it was drawn", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Cup Career");
    // The season's year comes from the world, not the wall clock — under a test clock they differ.
    const opening = yield* getFixtures(savesDir, save.id);
    const startYear = Number(opening.fixtures[0]!.date.slice(0, 4));
    yield* playWholeSeason(save.id);

    const ties = yield* loadCupFixtures(save.id, "comp_eng_cup");
    // Round 5's row was created months after round 1's, and still landed on the date the template
    // reserved for it before either existed.
    ok(ties.some((tie) => tie.round === 5));
    for (const tie of ties) {
      strictEqual(tie.scheduledDate, cupRoundDate(startYear, tie.round));
    }
  }),
  180_000,
);

it.effect("a tie across the depth boundary resolves without waking the match engine", () =>
  Effect.gen(function* () {
    // A cup draws from every division of its nation, so a division at results-only and one at full
    // can meet. **No shipped scope option produces that yet** — England's pyramid loads all four
    // divisions playable, and a nation set to view_only has no playable division to meet. The state
    // is staged here rather than selected: the fourth division is put at results-only and its
    // player rows deleted, which is exactly and entirely what a results-only division is on disk.
    const snapshotId = yield* createPyramidSnapshot(savesDir);
    const save = yield* createCareerFrom(snapshotId, 5150, "Mixed Tie");

    const staged = yield* withSaveWrite(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        yield* sql`UPDATE competitions SET depth = 'results-only' WHERE id = 'comp_eng_4'`;
        const demoted = yield* sql<{ clubId: string }>`
          SELECT club_id as "clubId" FROM competition_participants WHERE competition_id = 'comp_eng_4'`;
        yield* discardSquadsForClubs(demoted.map((row) => row.clubId));

        const shallow = yield* sql<{ clubId: string }>`
          SELECT club_id as "clubId" FROM competition_participants
          WHERE competition_id = 'comp_eng_4' ORDER BY club_id LIMIT 1`;
        const deep = yield* sql<{ clubId: string }>`
          SELECT id as "clubId" FROM clubs WHERE is_user_club = 1`;
        ok(shallow[0] !== undefined, "the staged division should still hold its clubs");

        // One fixture in the whole world, so anything the engine writes is attributable to it.
        const nextDate = yield* sql<{ date: string }>`
          SELECT MIN(scheduled_date) as "date" FROM fixtures WHERE played = 0`;
        yield* sql`DELETE FROM fixtures WHERE played = 0`;
        yield* sql`INSERT INTO fixtures (season_number, competition_id, round, scheduled_date, home_club_id, away_club_id, home_goals, away_goals, home_penalties, away_penalties, played)
          VALUES (1, 'comp_eng_cup', 7, ${nextDate[0]!.date}, ${deep[0]!.clubId}, ${shallow[0]!.clubId}, NULL, NULL, NULL, NULL, 0)`;

        const conditions = yield* sql<{ playerId: string; condition: number }>`
          SELECT player_id as "playerId", condition FROM player_fitness ORDER BY player_id`;
        return { conditions, homeClubId: deep[0]!.clubId, awayClubId: shallow[0]!.clubId };
      }),
    );

    yield* advanceCalendar(savesDir, save.id);

    const after = yield* withSaveWrite(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        const tie = yield* sql<{
          homeGoals: number | null;
          awayGoals: number | null;
          homePenalties: number | null;
          awayPenalties: number | null;
          played: number;
        }>`SELECT home_goals as "homeGoals", away_goals as "awayGoals",
                  home_penalties as "homePenalties", away_penalties as "awayPenalties", played
           FROM fixtures WHERE competition_id = 'comp_eng_cup' AND round = 7`;
        const conditions = yield* sql<{ playerId: string; condition: number }>`
          SELECT player_id as "playerId", condition FROM player_fitness ORDER BY player_id`;
        return { tie: tie[0]!, conditions };
      }),
    );

    strictEqual(after.tie.played, 1);
    ok(after.tie.homeGoals !== null && after.tie.awayGoals !== null);
    // A knockout produces a winner either way.
    ok(
      after.tie.homeGoals !== after.tie.awayGoals ||
        (after.tie.homePenalties !== null && after.tie.homePenalties !== after.tie.awayPenalties),
    );
    // The engine's signature is what it writes about players. Untouched conditions mean the
    // collapse resolved the tie, not ninety simulated minutes.
    deepStrictEqual(after.conditions, staged.conditions);
  }),
  120_000,
);

it.effect("the cup winner is the participant whose final position is 1", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Cup Career");
    yield* playWholeSeason(save.id);

    const ties = yield* loadCupFixtures(save.id, "comp_eng_cup");
    const final = ties.filter((tie) => tie.round === Math.max(...ties.map((t) => t.round)));
    strictEqual(final.length, 1);
    const winner = tieWinner({
      ...final[0]!,
      homeGoals: final[0]!.homeGoals ?? 0,
      awayGoals: final[0]!.awayGoals ?? 0,
    });

    const frozen = yield* withSaveWrite(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        return yield* sql<{ clubId: string; finalPosition: number | null }>`
          SELECT club_id as "clubId", final_position as "finalPosition"
          FROM competition_participants
          WHERE competition_id = 'comp_eng_cup' AND season_number = 1 AND final_position IS NOT NULL
          ORDER BY final_position ASC`;
      }),
    );

    // No winner column exists; winning the cup is what position 1 means.
    strictEqual(frozen[0]?.clubId, winner);
    strictEqual(frozen[0]?.finalPosition, 1);
    // The beaten finalist is second, and nobody else reached that round.
    strictEqual(frozen[1]?.finalPosition, 2);
    ok([final[0]!.homeClubId, final[0]!.awayClubId].includes(frozen[1]!.clubId));
  }),
  180_000,
);
