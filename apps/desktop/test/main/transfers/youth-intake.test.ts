/**
 * The Youth Intake at the Season rollover (gate-red-on-dev ticket 07): every club gains young players
 * after Contract expiry, enough to stay at a squad of 16.
 *
 * Every test here plays a real season on the default scope (one league and its cup) through the
 * pre-match boundary, so the intake is observed exactly where the game produces it: inside the
 * advance or commit that concludes the Season. The seed sweep over three rollovers lives in
 * `youth-intake-sweep.test.ts`, one expensive test per file.
 */
import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { deepStrictEqual, notDeepStrictEqual, ok, strictEqual } from "node:assert";
import { it } from "@effect/vitest";
import type { SaveId } from "@cm-clone/contracts";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { DEFAULT_CONTRACT_YEARS, deriveId, deriveSeed, seasonStartDate } from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { getNewsInbox } from "../../../src/main/career/index.js";
import { youthIntakePlayerId } from "../../../src/main/season/youthIntake.js";
import { createSave, TEST_REFERENCE_YEAR } from "../../seeded-save.js";
import { advanceThroughBoundary } from "../boundary-helpers.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-youth-intake-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

const allPlayerIds = (saveId: SaveId) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const rows = yield* sql<{ id: string }>`SELECT id FROM players`;
      return new Set(rows.map((row) => row.id));
    }),
  );

/**
 * Plays until the Season concludes and returns the date it concluded on. Stops on the press that
 * rolled the world over, before the next Season's first transfer window can move anyone.
 */
const playOneSeason = (saveId: SaveId) =>
  Effect.gen(function* () {
    for (let press = 0; press < 200; press += 1) {
      const stepped = yield* advanceThroughBoundary(savesDir, saveId);
      if (stepped.seasonConcluded) return yield* withSave(saveId, concludedOn);
    }
    return yield* Effect.die(new Error("the season never concluded"));
  });

/** The last date of the Season before the current one — the date the rollover ran on. */
const concludedOn = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const rows = yield* sql<{ gameDate: string }>`
    SELECT game_date as "gameDate" FROM season ORDER BY season_number DESC LIMIT 1 OFFSET 1`;
  return rows[0]!.gameDate;
});

const seasonNumber = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const rows = yield* sql<{ seasonNumber: number }>`SELECT MAX(season_number) as "seasonNumber" FROM season`;
  return rows[0]!.seasonNumber;
});

interface IntakeRow {
  readonly id: string;
  readonly squadSlot: number;
  readonly clubSeed: number;
  readonly clubId: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly dateOfBirth: string;
  readonly potentialAbility: number;
  readonly passing: number | null;
  readonly wage: number | null;
  readonly yearsRemaining: number | null;
  readonly signedSeason: number | null;
}

/** The players the rollover created — every player row that did not exist before it. Only world
 *  generation, a promotion out of a results-only division, and the intake create players, and the
 *  default scope has no promotion. */
const loadIntake = (saveId: SaveId, before: ReadonlySet<string>) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const rows = yield* sql<IntakeRow>`
        SELECT p.id, p.squad_slot as "squadSlot", cl.generation_seed as "clubSeed",
               p.club_id as "clubId", p.first_name as "firstName", p.last_name as "lastName",
               p.date_of_birth as "dateOfBirth", p.potential_ability as "potentialAbility", p.passing,
               ct.wage, ct.years_remaining as "yearsRemaining", ct.signed_season as "signedSeason"
        FROM players p JOIN clubs cl ON cl.id = p.club_id
        LEFT JOIN contracts ct ON ct.player_id = p.id
        ORDER BY p.club_id ASC, p.squad_slot ASC`;
      return rows.filter((row) => !before.has(row.id));
    }),
  );

/** Every club that plays with a squad next season, with its squad size now. */
const loadSquadSizes = (saveId: SaveId, seasonNumber: number) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      return yield* sql<{ clubId: string; isUserClub: number; squadSize: number }>`
        SELECT cp.club_id as "clubId", cl.is_user_club as "isUserClub",
               (SELECT COUNT(*) FROM players p WHERE p.club_id = cp.club_id) as "squadSize"
        FROM competition_participants cp
        JOIN competitions c ON c.id = cp.competition_id
        JOIN clubs cl ON cl.id = cp.club_id
        WHERE cp.season_number = ${seasonNumber} AND c.kind <> 'cup' AND c.depth <> 'results-only'
        ORDER BY cp.club_id ASC`;
    }),
  );

const ageOn = (dateOfBirth: string, date: string): number => {
  const age = Number(date.slice(0, 4)) - Number(dateOfBirth.slice(0, 4));
  return date.slice(5) >= dateOfBirth.slice(5) ? age : age - 1;
};

const userClubId = (saveId: SaveId) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const rows = yield* sql<{ id: string }>`SELECT id FROM clubs WHERE is_user_club = 1`;
      return rows[0]!.id;
    }),
  );

it.effect(
  "every club, the human's included, gains two to four players aged 16-18 on ordinary Contracts",
  () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Intake");
      const before = yield* allPlayerIds(save.id);
      // World generation's ids are untouched by the intake's own derivation: every Season-1 player
      // is still `deriveId(clubSeed, "player", slot)`, so existing seeded worlds do not move.
      const generated = yield* loadIntake(save.id, new Set());
      ok(generated.length > 0);
      for (const player of generated) {
        strictEqual(player.id, deriveId(player.clubSeed, "player", player.squadSlot));
      }
      const rolledOverOn = yield* playOneSeason(save.id);
      const openedOn = seasonStartDate(TEST_REFERENCE_YEAR, 2);

      strictEqual(yield* withSave(save.id, seasonNumber), 2, "the rollover has run");
      const intake = yield* loadIntake(save.id, before);
      const squads = yield* loadSquadSizes(save.id, 2);
      const human = yield* userClubId(save.id);
      ok(squads.some((club) => club.clubId === human), "the human club is among them");

      for (const club of squads) {
        const own = intake.filter((row) => row.clubId === club.clubId);
        ok(own.length >= 2, `${club.clubId} gained ${own.length}`);
        // More than four only when the floor asked for it, and then exactly to the floor.
        ok(own.length <= 4 || club.squadSize === 16, `${club.clubId} gained ${own.length} to ${club.squadSize}`);
        ok(club.squadSize >= 16, `${club.clubId} holds ${club.squadSize}`);
      }
      // Every created player went to a club that plays with a squad.
      strictEqual(
        intake.length,
        squads.reduce((sum, club) => sum + intake.filter((row) => row.clubId === club.clubId).length, 0),
      );

      for (const player of intake) {
        for (const date of [rolledOverOn, openedOn]) {
          const age = ageOn(player.dateOfBirth, date);
          ok(age >= 16 && age <= 18, `${player.id} is ${age} on ${date}`);
        }
        ok(player.wage !== null && player.wage > 0, `${player.id} has a wage`);
        strictEqual(player.yearsRemaining, DEFAULT_CONTRACT_YEARS);
        strictEqual(player.signedSeason, 2);
        strictEqual(player.id, youthIntakePlayerId(player.clubSeed, 2)(player.squadSlot));
      }
    }),
  { timeout: 60_000 },
);

it("intake ids derive from the full path, so clubs whose 32-bit intake seeds collide still get distinct ids", () => {
  // Found by search: two club generation seeds whose Season 2 intake base seed is the same 32-bit
  // value. Deriving ids from that base, as the intake first did, gave both clubs identical ids.
  const [first, second] = [59_599, 813_120];
  const base = deriveSeed(first, "youth-intake", 2);
  strictEqual(deriveSeed(second, "youth-intake", 2), base);
  strictEqual(deriveId(base, "player", 0), deriveId(deriveSeed(second, "youth-intake", 2), "player", 0));

  const ids = new Set<string>();
  for (const clubSeed of [first, second]) {
    for (const season of [2, 3]) {
      for (let slot = 0; slot < 16; slot += 1) ids.add(youthIntakePlayerId(clubSeed, season)(slot));
    }
  }
  strictEqual(ids.size, 2 * 2 * 16);
  // Nor does an intake id coincide with the world-generation id a club seed equal to the base
  // would mint.
  notDeepStrictEqual(youthIntakePlayerId(first, 2)(0), deriveId(base, "player", 0));
});

it.effect("a club still below 16 after expiry gains as many as it takes to reach 16", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Floor");
    const human = yield* userClubId(save.id);

    // Five players stay; every other Contract at the human club and at one AI club ends this
    // Season. They still play all of Season 1 — expiry only lands at its end.
    const aiClub = yield* withSave(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        const rows = yield* sql<{ id: string }>`
          SELECT id FROM clubs WHERE is_user_club = 0 AND id IN (SELECT club_id FROM players)
          ORDER BY id ASC LIMIT 1`;
        const aiClubId = rows[0]!.id;
        for (const clubId of [human, aiClubId]) {
          yield* sql`UPDATE contracts SET years_remaining = 1
            WHERE player_id IN (SELECT id FROM players WHERE club_id = ${clubId})`;
          yield* sql`UPDATE contracts SET years_remaining = 3 WHERE player_id IN (
            SELECT id FROM players WHERE club_id = ${clubId} ORDER BY id ASC LIMIT 5)`;
        }
        return aiClubId;
      }),
    );

    const before = yield* allPlayerIds(save.id);
    yield* playOneSeason(save.id);

    const intake = yield* loadIntake(save.id, before);
    const squads = yield* loadSquadSizes(save.id, 2);
    const sizeOf = (clubId: string) => squads.find((club) => club.clubId === clubId)!.squadSize;
    const gainedBy = (clubId: string) => intake.filter((row) => row.clubId === clubId).length;
    // The human club kept exactly its five — nothing moves a human player without the manager — so
    // the intake is the eleven it takes to reach 16.
    strictEqual(sizeOf(human), 16);
    strictEqual(gainedBy(human), 11);
    // An AI club may have bought or sold during the season, so what it kept is not known here; that
    // it lands on exactly 16 with more than the ordinary four is what the floor promises.
    strictEqual(sizeOf(aiClub), 16);
    ok(gainedBy(aiClub) > 4, `${aiClub} gained ${gainedBy(aiClub)}`);
  }),
  { timeout: 60_000 },
);

it.effect("the same world seed produces the same intake", () =>
  Effect.gen(function* () {
    const playIntake = (name: string, worldSeed: number) =>
      Effect.gen(function* () {
        const save = yield* createSave(savesDir, name, undefined, { worldSeed });
        const before = yield* allPlayerIds(save.id);
        yield* playOneSeason(save.id);
        return yield* loadIntake(save.id, before);
      });

    const first = yield* playIntake("First", 7);
    const second = yield* playIntake("Second", 7);
    ok(first.length > 0);
    deepStrictEqual(second, first, "ids, names, ages, attributes and Contracts all match");

    // And the seed is what decides it, rather than nothing varying at all.
    const other = yield* playIntake("Other", 8);
    notDeepStrictEqual(
      other.map((row) => `${row.firstName} ${row.lastName}`),
      first.map((row) => `${row.firstName} ${row.lastName}`),
    );
  }),
  { timeout: 120_000 },
);

it.effect("the human club's intake is one News Inbox item naming every player", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "News");
    const human = yield* userClubId(save.id);
    const before = yield* allPlayerIds(save.id);
    yield* playOneSeason(save.id);

    const own = (yield* loadIntake(save.id, before)).filter((row) => row.clubId === human);
    ok(own.length >= 2);

    const inbox = yield* getNewsInbox(savesDir, save.id);
    const items = inbox.messages.filter((message) => message.subject.startsWith("Youth intake"));
    strictEqual(items.length, 1, "one item, not one per player");
    const item = items[0]!;
    strictEqual(item.subject, "Youth intake for season 2");
    strictEqual(item.seasonNumber, 2);
    for (const player of own) {
      ok(item.body.includes(`${player.firstName} ${player.lastName}`), `names ${player.firstName} ${player.lastName}`);
    }
  }),
  { timeout: 60_000 },
);
