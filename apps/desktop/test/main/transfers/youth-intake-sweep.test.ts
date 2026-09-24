/**
 * The squad floor over three rollovers, on the worlds that used to break it.
 *
 * Seeds 7, 46, 298 and 381 each left the human club on ten players at season 2 before the Youth
 * Intake existed: a season of Contract expiries and nothing to replace them, so no legal Tactic and
 * a pre-match boundary no press of Continue could cross
 * ([decision request 01](../../../../../.scratch/gate-red-on-dev/decision-request-01-squad-decay-has-no-floor.md)).
 * Seed 46 was pinned in `contract-expiry.test.ts` as that state until ticket 07 removed it.
 *
 * Every Season is played for real through `advanceThroughBoundary`, so the human club fields a
 * Tactic for every one of its Fixtures, and the helper raises `HumanClubCannotFieldElevenError` the
 * moment it cannot. The squads are counted on the press that rolls the world over, before the next
 * Season's transfer window can move anyone.
 *
 * The board is kept from sacking the manager, which is the one thing staged here. Seed 381's human
 * club misses its objective in seasons 1 and 2 and is sacked, and a sacked career never rolls over
 * again, so "three rollovers" is unreachable on that world without it. Whether the manager keeps the
 * job has no bearing on how many players a club holds.
 *
 * Its own file because it is the expensive one: twelve seasons, where every other intake spec plays
 * one.
 */
import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ok, strictEqual } from "node:assert";
import { it } from "@effect/vitest";
import type { SaveId } from "@cm-clone/contracts";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../../seeded-save.js";
import { advanceThroughBoundary } from "../boundary-helpers.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-youth-intake-sweep-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const SEEDS_THAT_FELL_BELOW_ELEVEN = [7, 46, 298, 381] as const;
const ROLLOVERS = 3;

/** Every club that plays with a squad in the current Season, and how many players it holds. */
const squadSizes = (saveId: SaveId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    return yield* sql<{ clubId: string; isUserClub: number; squadSize: number }>`
      SELECT cp.club_id as "clubId", cl.is_user_club as "isUserClub",
             (SELECT COUNT(*) FROM players p WHERE p.club_id = cp.club_id) as "squadSize"
      FROM competition_participants cp
      JOIN competitions c ON c.id = cp.competition_id
      JOIN clubs cl ON cl.id = cp.club_id
      WHERE cp.season_number = (SELECT MAX(season_number) FROM season)
        AND c.kind <> 'cup' AND c.depth <> 'results-only'`;
  }).pipe(
    Effect.provide(SqliteClient.layer({ filename: ':memory:' })),
    Effect.scoped,
  );

/** Widens the open Board Objective to every position, so the Season ends in a met objective. */
const keepTheJob = (saveId: SaveId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql`UPDATE board_objective SET min_position = 1, max_position = 1000 WHERE verdict IS NULL`;
  }).pipe(
    Effect.provide(SqliteClient.layer({ filename: ':memory:' })),
    Effect.scoped,
  );

it.effect(
  "seeds 7, 46, 298 and 381 keep every club at 16 or more through three rollovers",
  () =>
    Effect.gen(function* () {
      for (const worldSeed of SEEDS_THAT_FELL_BELOW_ELEVEN) {
        const save = yield* createSave(savesDir, `Sweep ${worldSeed}`, undefined, { worldSeed });
        yield* keepTheJob(save.id);
        let rollovers = 0;
        for (let press = 0; press < 1000 && rollovers < ROLLOVERS; press += 1) {
          const stepped = yield* advanceThroughBoundary(savesDir, save.id);
          if (!stepped.seasonConcluded) continue;
          rollovers += 1;
          yield* keepTheJob(save.id);

          const squads = yield* squadSizes(save.id);
          ok(squads.some((club) => club.isUserClub === 1), `seed ${worldSeed}: the human club is counted`);
          for (const club of squads) {
            ok(
              club.squadSize >= 16,
              `seed ${worldSeed}, rollover ${rollovers}: ${club.clubId} holds ${club.squadSize}`,
            );
          }
        }
        strictEqual(rollovers, ROLLOVERS, `seed ${worldSeed} played through ${ROLLOVERS} rollovers`);

        // And the human club takes the field after the last one: play on to its first Fixture of
        // season 4, which the helper refuses loudly if it cannot field eleven.
        let played = false;
        for (let press = 0; press < 100 && !played; press += 1) {
          yield* advanceThroughBoundary(savesDir, save.id);
          played = yield* humanPlayedInSeason(save.id, ROLLOVERS + 1);
        }
        ok(played, `seed ${worldSeed}: the human club played a season ${ROLLOVERS + 1} Fixture`);
      }
    }),
  { timeout: 240_000 },
);

/** Whether the human club has a played Fixture in `seasonNumber`. */
const humanPlayedInSeason = (saveId: SaveId, seasonNumber: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ count: number }>`
      SELECT COUNT(*) as "count" FROM fixtures f JOIN clubs c ON c.is_user_club = 1
      WHERE f.season_number = ${seasonNumber} AND f.played = 1
        AND (f.home_club_id = c.id OR f.away_club_id = c.id)`;
    return (rows[0]?.count ?? 0) > 0;
  }).pipe(
    Effect.provide(SqliteClient.layer({ filename: ':memory:' })),
    Effect.scoped,
  );
