import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { ok, strictEqual } from "node:assert";
import { SqliteClient } from "@effect/sql-sqlite-node";
import type { SaveId } from "@cm-clone/contracts";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../../seeded-save.js";
import { advanceThroughBoundary, ensureHumanTactic, pendingFixtureId } from "../boundary-helpers.js";
import { advanceCalendar } from "../../../src/main/season/index.js";
import { startMatch } from "../../../src/main/match/index.js";

// human-club-recovery 01: both clubs of the human's Fixture recover before its kickoff, once, the
// way a simulated Fixture recovers its two clubs. One file, one expensive test: it plays a Matchday.

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-human-recovery-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const inSave = <A, E>(saveId: SaveId, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

type Ledger = ReadonlyMap<string, number>;

const ledgerOf = (saveId: SaveId, clubId: string) =>
  inSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const rows = yield* sql<{ id: string; condition: number }>`
        SELECT pf.player_id as id, pf.condition FROM player_fitness pf
        JOIN players p ON p.id = pf.player_id WHERE p.club_id = ${clubId}`;
      return new Map(rows.map((row) => [row.id, row.condition])) as Ledger;
    }),
  );

const pendingSides = (saveId: SaveId) =>
  inSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const rows = yield* sql<{ fixtureId: number; date: string; home: string; away: string; userClub: string }>`
        SELECT f.id as "fixtureId", f.scheduled_date as "date", f.home_club_id as home, f.away_club_id as away,
               (SELECT id FROM clubs WHERE is_user_club = 1) as "userClub"
        FROM season s JOIN fixtures f ON f.id = s.awaiting_fixture_id`;
      const row = rows[0]!;
      return { ...row, opponent: row.home === row.userClub ? row.away : row.home };
    }),
  );

const setLedger = (saveId: SaveId, playerId: string, condition: number, severity: string) =>
  inSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql`UPDATE player_fitness SET condition = ${condition}, last_injury_severity = ${severity}
                 WHERE player_id = ${playerId}`;
    }),
  );

/** A club that plays on the boundary date too, in a Fixture the boundary leaves unresolved, and that
 *  played nothing since the last Matchday — so the boundary step is the only thing that could move it. */
const bystanderOn = (saveId: SaveId, date: string, since: string, exclude: ReadonlyArray<string>) =>
  inSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const rows = yield* sql<{ clubId: string }>`
        SELECT f.home_club_id as "clubId" FROM fixtures f
        JOIN player_fitness pf ON pf.player_id IN (SELECT id FROM players WHERE club_id = f.home_club_id)
        WHERE f.scheduled_date = ${date} AND f.played = 0
          AND f.home_club_id NOT IN (${exclude[0]!}, ${exclude[1]!})
          AND NOT EXISTS (SELECT 1 FROM fixtures g WHERE g.played = 1 AND g.scheduled_date > ${since}
                          AND (g.home_club_id = f.home_club_id OR g.away_club_id = f.home_club_id))
        LIMIT 1`;
      return rows[0]?.clubId ?? null;
    }),
  );

const startingConditions = (saveId: SaveId) =>
  inSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const rows = yield* sql<{ payload: string }>`SELECT payload FROM events WHERE tag = 'MatchStarted' ORDER BY rowid DESC LIMIT 1`;
      const started = JSON.parse(rows[0]!.payload) as {
        homeSetup: { squad: Array<{ id: string; startingCondition: number }> };
        awaySetup: { squad: Array<{ id: string; startingCondition: number }> };
      };
      return new Map(
        [...started.homeSetup.squad, ...started.awaySetup.squad].map((p) => [p.id, p.startingCondition]),
      ) as Ledger;
    }),
  );

it.effect(
  "both clubs of the human's Fixture recover once before kickoff, and the live match starts from it",
  () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Test Career");
      yield* ensureHumanTactic(savesDir, save.id);

      // Reach the first boundary and play it, so the next boundary is a real gap after a match.
      yield* advanceThroughBoundary(savesDir, save.id);
      const played = yield* inSave(
        save.id,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          return (yield* sql<{ date: string }>`SELECT game_date as date FROM season ORDER BY season_number DESC LIMIT 1`)[0]!.date;
        }),
      );

      const userClub = (yield* pendingSidesOrUser(save.id)).userClub;
      const human = yield* ledgerOf(save.id, userClub);
      const tired = [...human].filter(([, condition]) => condition < 100);
      ok(tired.length >= 2, "the first Matchday left players below full");

      // Two players at the same Condition, one with a knock and one severe.
      const knockId = tired[0]![0];
      const severeId = tired[1]![0];
      yield* setLedger(save.id, knockId, 60, "light");
      yield* setLedger(save.id, severeId, 60, "severe");

      // Every player's Condition before the advance, to tell what the boundary step moved.
      const everyoneBefore = yield* allLedger(save.id);

      yield* advanceCalendar(savesDir, save.id);
      ok((yield* pendingFixtureId(savesDir, save.id)) !== null, "stopped at the next boundary");
      const sides = yield* pendingSides(save.id);

      const humanAtBoundary = yield* ledgerOf(save.id, userClub);
      for (const [id, before] of tired) {
        if (id === knockId || id === severeId) continue;
        ok(humanAtBoundary.get(id)! > before, `player ${id} recovered from ${before}`);
      }
      const knock = humanAtBoundary.get(knockId)!;
      const severe = humanAtBoundary.get(severeId)!;
      ok(knock > 60 && severe > 60 && knock > severe, `knock ${knock} recovers faster than severe ${severe}`);

      const opponentAtBoundary = yield* ledgerOf(save.id, sides.opponent);
      const opponentRose = [...opponentAtBoundary].filter(
        ([id, condition]) => condition > (everyoneBefore.get(id) ?? 100),
      );
      ok(opponentRose.length > 0, "the opponent's tired players recovered before the live match");

      // A club outside the human's Fixture, with nothing played since, is not touched by the step.
      const bystander = yield* bystanderOn(save.id, sides.date, played, [sides.home, sides.away]);
      ok(bystander !== null, "found a club the boundary leaves alone");
      for (const [id, condition] of yield* ledgerOf(save.id, bystander!)) {
        strictEqual(condition, everyoneBefore.get(id), `bystander ${id} unchanged`);
      }

      // A second Continue at the same boundary recovers nothing more.
      yield* advanceCalendar(savesDir, save.id);
      const humanAfterRepeat = yield* ledgerOf(save.id, userClub);
      for (const [id, condition] of humanAtBoundary) strictEqual(humanAfterRepeat.get(id), condition);
      const opponentAfterRepeat = yield* ledgerOf(save.id, sides.opponent);
      for (const [id, condition] of opponentAtBoundary) strictEqual(opponentAfterRepeat.get(id), condition);

      // The live match starts from the recovered values, recorded on its start event.
      yield* startMatch(savesDir, save.id, sides.fixtureId as never, "quick");
      const started = yield* startingConditions(save.id);
      for (const [id, condition] of started) {
        const ledger = humanAtBoundary.get(id) ?? opponentAtBoundary.get(id);
        if (ledger !== undefined) strictEqual(condition, ledger);
      }

    }),
  900_000,
);

const allLedger = (saveId: SaveId) =>
  inSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const rows = yield* sql<{ id: string; condition: number }>`SELECT player_id as id, condition FROM player_fitness`;
      return new Map(rows.map((row) => [row.id, row.condition])) as Ledger;
    }),
  );

const pendingSidesOrUser = (saveId: SaveId) =>
  inSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const rows = yield* sql<{ userClub: string }>`SELECT id as "userClub" FROM clubs WHERE is_user_club = 1`;
      return rows[0]!;
    }),
  );
