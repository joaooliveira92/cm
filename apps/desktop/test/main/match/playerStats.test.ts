import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it as effectIt } from "@effect/vitest";
import { afterEach, beforeEach, describe, expect } from "vitest";
import { Effect } from "effect";
import { getMatchPlayerStats, getMatchRatings, resumeSimulation } from "../../../src/main/match/index.js";
import { atFirstFixture, startSeededMatch } from "./seededMatch.js";

describe("getMatchPlayerStats over a seeded match", () => {
  let savesDir: string;
  beforeEach(() => {
    savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-player-stats-"));
  });
  afterEach(() => rm(savesDir, { recursive: true, force: true }));

  effectIt.effect("gives every matchday-squad member one row; an unused substitute is empty, and goals reconcile with the score", () =>
    Effect.gen(function* () {
      const { save, fixtureId } = yield* atFirstFixture(savesDir);
      const match = yield* startSeededMatch(savesDir, save.id, fixtureId, 7);
      let cursor = 0;
      let complete = false;
      let homeScore = 0;
      let awayScore = 0;
      while (!complete) {
        // oxlint-disable-next-line no-await-in-loop -- sequential by design: each chunk starts at the last cursor
        const chunk = yield* resumeSimulation(savesDir, save.id, match.matchId, cursor, null);
        cursor = chunk.cursor;
        complete = chunk.isComplete;
        homeScore = chunk.homeScore;
        awayScore = chunk.awayScore;
      }

      const full = (yield* getMatchPlayerStats(savesDir, save.id, match.matchId, null))!;
      expect(full.throughMinute).toBeNull();
      for (const side of [full.home, full.away]) {
        expect(side.rows.filter((row) => row.started)).toHaveLength(11);
        expect(new Set(side.rows.map((row) => row.playerId)).size).toBe(side.rows.length);
        expect(side.showSaves).toBe(side.rows.some((row) => row.saves > 0));
        for (const row of side.rows) {
          if (!row.played) {
            expect(row.rating).toBeNull();
            expect(row.keyPasses + row.offsides + row.fouls + row.assists + row.shots + row.saves + row.goals).toBe(0);
          } else {
            expect(row.rating).toBeGreaterThanOrEqual(1);
            expect(row.rating).toBeLessThanOrEqual(10);
          }
        }
      }
      // The fold reconciles with the committed score, side by side: every goal belongs to a scorer.
      const goals = full.home.rows.reduce((total, row) => total + row.goals, 0);
      const awayGoals = full.away.rows.reduce((total, row) => total + row.goals, 0);
      expect(goals).toBe(homeScore);
      expect(awayGoals).toBe(awayScore);
    }),
  );

  effectIt.effect("cuts a live table at the revealed position, leaving the eleven with nothing counted yet", () =>
    Effect.gen(function* () {
      const { save, fixtureId } = yield* atFirstFixture(savesDir);
      const match = yield* startSeededMatch(savesDir, save.id, fixtureId, 7);

      const atKickoff = (yield* getMatchPlayerStats(savesDir, save.id, match.matchId, 1))!;
      for (const side of [atKickoff.home, atKickoff.away]) {
        expect(side.rows.filter((row) => row.started)).toHaveLength(11);
        for (const row of side.rows) {
          expect(row.keyPasses + row.offsides + row.fouls + row.assists + row.shots + row.saves + row.goals).toBe(0);
          expect(row.condition).toBeNull();
        }
      }

      // With no match id, the read resolves nothing until a match has been committed.
      expect(yield* getMatchPlayerStats(savesDir, save.id, null, null)).toBeNull();
    }),
  );

  effectIt.effect("reads the same Match Rating in the Rat column and on the Ratings tab", () =>
    Effect.gen(function* () {
      const { save, fixtureId } = yield* atFirstFixture(savesDir);
      const match = yield* startSeededMatch(savesDir, save.id, fixtureId, 7);
      let cursor = 0;
      let complete = false;
      while (!complete) {
        // oxlint-disable-next-line no-await-in-loop -- sequential by design: each chunk starts at the last cursor
        const chunk = yield* resumeSimulation(savesDir, save.id, match.matchId, cursor, null);
        cursor = chunk.cursor;
        complete = chunk.isComplete;
      }

      const stats = (yield* getMatchPlayerStats(savesDir, save.id, match.matchId, null))!;
      const ratings = (yield* getMatchRatings(savesDir, save.id, match.matchId, null))!;
      const ratingById = new Map(
        [...ratings.home, ...ratings.away].map((row) => [String(row.playerId), row.rating]),
      );
      for (const side of [stats.home, stats.away]) {
        for (const row of side.rows) {
          expect(row.rating).toBe(ratingById.get(String(row.playerId)) ?? null);
        }
      }
    }),
  );
});
