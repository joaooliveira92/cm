import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { it } from "@effect/vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach, describe } from "vitest";
import type { ClubId, PlayerId, SaveId } from "@cm-clone/contracts";
import { nextProgress } from "@cm-clone/shared";
import { createSave } from "../../../src/main/world/index.js";
import {
  assignScout,
  assignScoutToClub,
  getScouting,
  getTeamScoutReadings,
  getTeamScoutReport,
  unassignScout,
} from "../../../src/main/club/index.js";
import { reportIdFor } from "../../../src/main/club/teamScoutReport.js";
import { loadSeasonRow } from "../../../src/main/season/currentSeason.js";
import { advanceThroughBoundary } from "../boundary-helpers.js";

/**
 * Club-targeted Scouting Assignments (team-scout-report ticket 07): a Club is shorthand for its
 * squad, costs one scout, and is refused when the report reading it was issued from is stale.
 */

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-club-scouting-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: SaveId, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

/** An AI club with players, its squad, the human's club, and the current report id for the target. */
const fixtureFor = (saveId: SaveId) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const [human] = yield* sql<{ id: ClubId }>`SELECT id FROM clubs WHERE is_user_club = 1`;
      const [target] = yield* sql<{ id: ClubId }>`
        SELECT c.id FROM clubs c JOIN players p ON p.club_id = c.id
        WHERE c.is_user_club = 0 GROUP BY c.id ORDER BY c.id LIMIT 1`;
      const squad = yield* sql<{ id: PlayerId }>`
        SELECT id FROM players WHERE club_id = ${target!.id} ORDER BY id`;
      const season = yield* loadSeasonRow;
      return {
        humanClubId: human!.id,
        targetClubId: target!.id,
        squad: squad.map((row) => row.id),
        reportId: reportIdFor(target!.id, season.currentDate),
      };
    }),
  );

const tables = (saveId: SaveId) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const assignments = yield* sql<{
        scoutId: string;
        playerId: string | null;
        targetClubId: string | null;
      }>`SELECT scout_id as "scoutId", player_id as "playerId", target_club_id as "targetClubId"
         FROM scouting_assignments ORDER BY scout_id`;
      const progress = yield* sql<{ playerId: string; progress: number }>`
        SELECT player_id as "playerId", progress FROM scouting_progress ORDER BY player_id`;
      return { assignments, progress };
    }),
  );

const tagOf = (error: unknown): string => (error as { readonly _tag: string })._tag;

describe("assigning a scout to a club", () => {
  it.effect("occupies one scout, is a no-op when repeated, and refuses what it must", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "ClubScouting");
      const { humanClubId, targetClubId, reportId } = yield* fixtureFor(save.id);
      const [scout, other] = (yield* getScouting(savesDir, save.id)).scouts;

      const assigned = yield* assignScoutToClub(
        savesDir,
        save.id,
        scout!.scoutId,
        targetClubId,
        reportId,
      );
      const row = assigned.scouts.find((s) => s.scoutId === scout!.scoutId)!;
      strictEqual(row.targetClubId, targetClubId);
      strictEqual(row.playerId, null);
      ok(row.targetClubName !== null && row.targetClubName.length > 0);
      const afterFirst = yield* tables(save.id);
      strictEqual(afterFirst.assignments.length, 1, "one scout, however wide the target");
      strictEqual(afterFirst.progress.length, 0, "assigning observes nothing yet");

      // The same assignment again: no second effect on either table.
      yield* assignScoutToClub(savesDir, save.id, scout!.scoutId, targetClubId, reportId);
      deepStrictEqual(yield* tables(save.id), afterFirst);

      // A stale reading is refused and changes nothing.
      const stale = yield* Effect.flip(
        assignScoutToClub(savesDir, save.id, other!.scoutId, targetClubId, `${targetClubId}:1999-01-01`),
      );
      strictEqual(tagOf(stale), "StaleReportError");
      deepStrictEqual(yield* tables(save.id), afterFirst);

      // The manager's own squad is never scouted, and an unknown club is named as such.
      const own = yield* Effect.flip(
        assignScoutToClub(savesDir, save.id, other!.scoutId, humanClubId, reportIdFor(humanClubId, reportId.split(":").at(-1)!)),
      );
      strictEqual(tagOf(own), "OwnClubNotScoutableError");
      const ghost = yield* Effect.flip(
        assignScoutToClub(savesDir, save.id, other!.scoutId, "club_nobody" as ClubId, reportId),
      );
      strictEqual(tagOf(ghost), "ClubNotFoundError");
      deepStrictEqual(yield* tables(save.id), afterFirst);

      // A second scout takes the club over, and redirecting a scout to a player clears the club.
      yield* assignScoutToClub(savesDir, save.id, other!.scoutId, targetClubId, reportId);
      const takenOver = yield* tables(save.id);
      deepStrictEqual(
        takenOver.assignments.map((a) => [a.scoutId, a.targetClubId]),
        [[other!.scoutId, targetClubId]],
      );
    }),
    60_000,
  );

  it.effect("advances the whole squad once per advance, and the report goes stale for commands", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "ClubScouting");
      const { targetClubId, squad, reportId } = yield* fixtureFor(save.id);
      const scouts = (yield* getScouting(savesDir, save.id)).scouts;
      const [clubScout, playerScout] = [...scouts].sort((a, b) => a.quality - b.quality);

      yield* assignScoutToClub(savesDir, save.id, clubScout!.scoutId, targetClubId, reportId);
      // The same player also watched on their own, by the better scout: they advance once, at that
      // scout's rate, rather than twice.
      yield* assignScout(savesDir, save.id, playerScout!.scoutId, squad[0]!);

      yield* advanceThroughBoundary(savesDir, save.id);

      // The world seed is random per save, and an advance can move a player between clubs, so the
      // promise is checked against the players who were in the squad on both sides of it.
      const after = new Set((yield* fixtureFor(save.id)).squad);
      const stayed = squad.filter((id) => after.has(id));
      ok(stayed.length > 1, "the target keeps most of its squad across one advance");

      const { progress } = yield* tables(save.id);
      const byPlayer = new Map(progress.map((row) => [row.playerId, row.progress]));
      ok(stayed.every((id) => (byPlayer.get(id) ?? 0) > 0), "every squad member accrues");
      if (after.has(squad[0]!)) {
        strictEqual(byPlayer.get(squad[0]!), nextProgress(0, playerScout!.quality));
      }
      strictEqual(byPlayer.get(stayed.find((id) => id !== squad[0])!), nextProgress(0, clubScout!.quality));

      // The report now names the club's scout and is current.
      const report = yield* getTeamScoutReport(savesDir, save.id, targetClubId);
      strictEqual(report.scout?.scoutId, clubScout!.scoutId);
      strictEqual(report.freshness, "current");

      // The reading the first assignment was issued from is no longer the current one.
      const stale = yield* Effect.flip(
        assignScoutToClub(savesDir, save.id, clubScout!.scoutId, targetClubId, reportId),
      );
      strictEqual(tagOf(stale), "StaleReportError");
      yield* assignScoutToClub(savesDir, save.id, clubScout!.scoutId, targetClubId, report.reportId);
    }),
    120_000,
  );

  it.effect("files a reading when a Club watch ends, and only then", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "ClubScouting");
      const { targetClubId, squad, reportId } = yield* fixtureFor(save.id);
      const [scout, other] = (yield* getScouting(savesDir, save.id)).scouts;
      const readings = () => getTeamScoutReadings(savesDir, save.id, targetClubId);

      yield* assignScoutToClub(savesDir, save.id, scout!.scoutId, targetClubId, reportId);
      yield* advanceThroughBoundary(savesDir, save.id);
      const firstReportId = (yield* getTeamScoutReport(savesDir, save.id, targetClubId)).reportId;

      // Re-assigning the same scout, or another scout taking the club over, ends no watch.
      yield* assignScoutToClub(savesDir, save.id, scout!.scoutId, targetClubId, firstReportId);
      yield* assignScoutToClub(savesDir, save.id, other!.scoutId, targetClubId, firstReportId);
      strictEqual((yield* readings()).readings.length, 0);

      // Redirecting the watching scout to a player ends it: the reading names that scout.
      yield* assignScout(savesDir, save.id, other!.scoutId, squad[0]!);
      const afterRedirect = (yield* readings()).readings;
      strictEqual(afterRedirect.length, 1);
      strictEqual(afterRedirect[0]!.reportId, firstReportId);
      strictEqual(afterRedirect[0]!.scout?.scoutId, other!.scoutId);

      // A later watch that ends by unassigning files a second reading, listed first.
      yield* assignScoutToClub(savesDir, save.id, scout!.scoutId, targetClubId, firstReportId);
      yield* advanceThroughBoundary(savesDir, save.id);
      yield* unassignScout(savesDir, save.id, scout!.scoutId);
      const listed = (yield* readings()).readings;
      strictEqual(listed.length, 2);
      ok(listed[0]!.observedAt > listed[1]!.observedAt, "newest first");

      // Reading the list again changes nothing: a filed reading is never rewritten.
      deepStrictEqual((yield* readings()).readings, listed);
    }),
    180_000,
  );
});
