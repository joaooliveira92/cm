import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { ok, strictEqual } from "node:assert";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { PlayerId, type SaveId } from "@cm-clone/contracts";
import { SQUAD_FLOOR } from "@cm-clone/shared";
import { createSave } from "../../seeded-save.js";
import { getTacticsOverview } from "../../../src/main/club/index.js";
import { getContractExpiryScreen } from "../../../src/main/transfers/contractExpiry.js";
import { renewContract } from "../../../src/main/transfers/index.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-contract-expiry-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

/**
 * Helper: update a generated player's contract to a given years_remaining value.
 * Uses the save's own player and club rows so no NOT NULL constraints are violated.
 */
const setContractYearsRemaining = (playerId: string, yearsRemaining: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql`UPDATE contracts SET years_remaining = ${yearsRemaining} WHERE player_id = ${playerId}`;
  });

// ---------------------------------------------------------------------------
// getContractExpiryScreen
// ---------------------------------------------------------------------------

it.effect("returns players with years_remaining === 1 for the user's club", () =>
  Effect.gen(function* () {
    // Create a minimal save with one user club
    const save = yield* createSave(savesDir, "test-save");
    const saveId = save.id;

    // Find the user's club and its players with contracts
    const { clubId, player1Id, player2Id, player3Id } = yield* withSave(saveId, Effect.gen(function* () {
      const sql = yield* SqlClient;
      const clubRows = yield* sql<{ id: string }>`SELECT id FROM clubs WHERE is_user_club = 1 LIMIT 1`;
      const clubId = clubRows[0]!.id;

      // Get 3 players of this club who have contracts
      const playerRows = yield* sql.unsafe<{ id: string }>(
        `SELECT p.id FROM players p
         JOIN contracts ct ON ct.player_id = p.id
         WHERE p.club_id = ? LIMIT 3`,
        [clubId],
      );

      return { clubId, player1Id: playerRows[0]!.id, player2Id: playerRows[1]!.id, player3Id: playerRows[2]!.id };
    }));

    // Reset all club contracts to a non-expiring value, then set specific ones
    yield* withSave(saveId, Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql`UPDATE contracts SET years_remaining = 5 WHERE player_id IN
        (SELECT p.id FROM players p WHERE p.club_id = ${clubId})`;
    }));
    yield* withSave(saveId, setContractYearsRemaining(player1Id, 1));
    yield* withSave(saveId, setContractYearsRemaining(player2Id, 1));
    yield* withSave(saveId, setContractYearsRemaining(player3Id, 2));

    // Now call the screen read
    const screen = yield* getContractExpiryScreen(savesDir, saveId);
    strictEqual(screen.players.length, 2, "only expiring players returned");
    const foundIds = new Set(screen.players.map((p) => String(p.playerId)));
    ok(foundIds.has(player1Id), `expected ${player1Id} in expiring list`);
    ok(foundIds.has(player2Id), `expected ${player2Id} in expiring list`);

    // Verify one of the expiring players has wage and yearsRemaining data
    const p1 = screen.players.find((p) => p.playerId === player1Id);
    ok(p1 !== undefined, "player1 should be in results");
    ok(p1!.wage > 0, "wage should be positive");
    strictEqual(p1!.yearsRemaining, 1);
  }),
);

it.effect("expiry rule matches what expireContractsForSeason uses (years_remaining === 1)", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "test-save");
    const saveId = save.id;

    const { player1Id, player2Id, clubId } = yield* withSave(saveId, Effect.gen(function* () {
      const sql = yield* SqlClient;
      const clubRows = yield* sql<{ id: string }>`SELECT id FROM clubs WHERE is_user_club = 1 LIMIT 1`;
      const clubId = clubRows[0]!.id;
      const playerRows = yield* sql.unsafe<{ id: string }>(
        `SELECT p.id FROM players p
         JOIN contracts ct ON ct.player_id = p.id
         WHERE p.club_id = ? LIMIT 2`,
        [clubId],
      );
      return { player1Id: playerRows[0]!.id, player2Id: playerRows[1]!.id, clubId };
    }));

    // Reset all club contracts to a non-expiring value
    yield* withSave(saveId, Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql`UPDATE contracts SET years_remaining = 5 WHERE player_id IN
        (SELECT p.id FROM players p WHERE p.club_id = ${clubId})`;
    }));
    // Set one to 1 (should appear — last contracted year), one to 2 (should not)
    yield* withSave(saveId, setContractYearsRemaining(player1Id, 1));
    yield* withSave(saveId, setContractYearsRemaining(player2Id, 2));

    const screen = yield* getContractExpiryScreen(savesDir, saveId);
    strictEqual(screen.players.length, 1, "only years_remaining === 1 players");
    strictEqual(String(screen.players[0]!.playerId), player1Id);
  }),
);

it.effect("returns empty list when no players have expiring contracts", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "test-save");
    const saveId = save.id;

    // Set all players to years_remaining > 0
    yield* withSave(saveId, Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql`UPDATE contracts SET years_remaining = 3 WHERE player_id IN
        (SELECT p.id FROM players p WHERE p.club_id IN (SELECT id FROM clubs WHERE is_user_club = 1))`;
    }));

    const screen = yield* getContractExpiryScreen(savesDir, saveId);
    strictEqual(screen.players.length, 0, "no expiring players");
  }),
);

// ---------------------------------------------------------------------------
// The squad the coming rollover leaves behind (gate-red-on-dev 08)
// ---------------------------------------------------------------------------

/** The human club's players, ids in a stable order, with every Contract reset mid-term. */
const resetUserClubContracts = (saveId: SaveId) =>
  withSave(saveId, Effect.gen(function* () {
    const sql = yield* SqlClient;
    const clubId = (yield* sql<{ id: string }>`SELECT id FROM clubs WHERE is_user_club = 1 LIMIT 1`)[0]!.id;
    yield* sql`UPDATE contracts SET years_remaining = 3 WHERE player_id IN
      (SELECT p.id FROM players p WHERE p.club_id = ${clubId})`;
    const rows = yield* sql<{ id: string }>`
      SELECT p.id FROM players p JOIN contracts ct ON ct.player_id = p.id
      WHERE p.club_id = ${clubId} ORDER BY p.id`;
    return rows.map((row) => row.id);
  }));

/** Puts the first `count` of `playerIds` into their last contracted year. */
const markLeaving = (saveId: SaveId, playerIds: ReadonlyArray<string>, count: number) =>
  withSave(saveId, Effect.forEach(playerIds.slice(0, count), (id) => setContractYearsRemaining(id, 1), {
    concurrency: 1,
    discard: true,
  }));

const shortSquadIssue = (saveId: SaveId) =>
  getTacticsOverview(savesDir, saveId).pipe(
    Effect.map((snapshot) => snapshot.issues.find((issue) => issue.id === "squad-short-at-rollover")),
  );

it.effect("carries the whole squad size beside the leaving players", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "test-save");
    const playerIds = yield* resetUserClubContracts(save.id);
    yield* markLeaving(save.id, playerIds, 2);

    const screen = yield* getContractExpiryScreen(savesDir, save.id);
    strictEqual(screen.squadSize, playerIds.length);
    strictEqual(screen.players.length, 2);
  }),
);

it.effect("the short-squad advisory appears below the floor, and not at it", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "test-save");
    const playerIds = yield* resetUserClubContracts(save.id);
    const atFloor = playerIds.length - SQUAD_FLOOR;
    ok(atFloor > 0, "the seeded squad is above the floor, so leaving players can take it below");

    yield* markLeaving(save.id, playerIds, atFloor);
    strictEqual(yield* shortSquadIssue(save.id), undefined, "exactly the floor stays is no warning");

    yield* markLeaving(save.id, playerIds, atFloor + 2);
    const issue = yield* shortSquadIssue(save.id);
    ok(issue, "two more leaving takes the squad below the floor");
    strictEqual(issue.severity, "advisory");
    strictEqual(issue.destination, "contractExpiry");
    ok(
      issue.detail.startsWith(`${atFloor + 2} players' Contracts end this Season, leaving ${SQUAD_FLOOR - 2},`),
      issue.detail,
    );
  }),
);

it.effect("renewing enough of the leaving players clears the advisory on the next read", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "test-save");
    const playerIds = yield* resetUserClubContracts(save.id);
    const leaving = playerIds.length - SQUAD_FLOOR + 1;
    yield* markLeaving(save.id, playerIds, leaving);
    ok(yield* shortSquadIssue(save.id), "one short of the floor is warned about");

    // The pre-season Transfer Window is open on a new save, so the ordinary renewal path is legal.
    yield* renewContract(savesDir, save.id, PlayerId.make(playerIds[0]!), 3);

    strictEqual(yield* shortSquadIssue(save.id), undefined);
    const screen = yield* getContractExpiryScreen(savesDir, save.id);
    strictEqual(screen.squadSize - screen.players.length, SQUAD_FLOOR);
  }),
);
