import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import { deepStrictEqual, strictEqual } from "node:assert";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../../seeded-save.js";
import { getSquad } from "../../../src/main/club/squad.js";
import { getTransferHistoryScreen } from "../../../src/main/transfers/transferHistory.js";
import { displayNames } from "../../../src/main/world/displayNames.js";

/**
 * Transfer History (Screen 146). The rows are written directly rather than driven through
 * `completeTransfer`, for the same reason the scouting seeds write progress rows directly: this
 * read's job is ordering, joining and the nullable selling Club, and driving a real Bid to
 * completion would cost a Transfer Window and several played Matchdays without exercising any of
 * that. `completeTransfer`'s own write is covered in `transfers.test.ts`.
 */

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-transfer-history-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: ':memory:' })),
    Effect.scoped,
  );

interface Fixture {
  readonly userClubName: string;
  readonly rivalNames: ReadonlyArray<string>;
}

/**
 * The manager's Club, and two rival Clubs to move Players to and from.
 *
 * Club names are not a column on `clubs`: they live in the save's content pack, so the test resolves
 * them through the same `displayNames` seam the read uses rather than asserting on a literal.
 */
const clubs = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const nameOf = yield* displayNames;
  const user = yield* sql<{ id: string }>`
    SELECT id FROM clubs WHERE is_user_club = 1 LIMIT 1`;
  const rivals = yield* sql<{ id: string }>`
    SELECT id FROM clubs WHERE is_user_club = 0 ORDER BY id LIMIT 2`;
  return {
    user: { id: user[0]!.id, name: nameOf(user[0]!.id) },
    rivals: rivals.map((r) => ({ id: r.id, name: nameOf(r.id) })),
  };
});

it.effect("returns an empty history for a fresh save that has completed no transfer", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "test-save");

    const screen = yield* getTransferHistoryScreen(savesDir, save.id);

    deepStrictEqual([...screen.entries], [], "a fresh save has no completed transfer");
  }),
);

it.effect("returns transfers into and out of the manager's Club, newest first", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "test-save");
    const squad = yield* getSquad(savesDir, save.id);
    const ours = squad.players[0]!;
    const alsoOurs = squad.players[1]!;

    const fixture: Fixture = yield* withSave(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        const { user, rivals } = yield* clubs;

        // Oldest: a Player sold out of the manager's Club.
        yield* sql`INSERT INTO player_transfers (player_id, from_club_id, to_club_id, transferred_on, fee)
          VALUES (${ours.id}, ${user.id}, ${rivals[0]!.id}, '2026-07-02', 1500000)`;
        // Newest: a Player bought into the manager's Club.
        yield* sql`INSERT INTO player_transfers (player_id, from_club_id, to_club_id, transferred_on, fee)
          VALUES (${alsoOurs.id}, ${rivals[1]!.id}, ${user.id}, '2026-08-20', 3000000)`;
        // A transfer between two rivals, which the manager's Club took no part in.
        yield* sql`INSERT INTO player_transfers (player_id, from_club_id, to_club_id, transferred_on, fee)
          VALUES (${ours.id}, ${rivals[0]!.id}, ${rivals[1]!.id}, '2026-09-09', 900000)`;

        return {
          userClubName: user.name,
          rivalNames: rivals.map((r) => r.name),
        };
      }),
    );

    const screen = yield* getTransferHistoryScreen(savesDir, save.id);

    strictEqual(screen.entries.length, 2, "the rival-to-rival transfer is excluded");

    const [newest, oldest] = screen.entries;
    strictEqual(newest!.transferredOn, "2026-08-20", "newest first");
    strictEqual(oldest!.transferredOn, "2026-07-02");

    // The incoming transfer: from a rival Club, to the manager's Club.
    strictEqual(newest!.fromClubName, fixture.rivalNames[1]);
    strictEqual(newest!.toClubName, fixture.userClubName);
    strictEqual(newest!.fee, 3_000_000);
    strictEqual(newest!.playerFirstName, alsoOurs.firstName);
    strictEqual(newest!.playerLastName, alsoOurs.lastName);

    // The outgoing transfer: from the manager's Club, to a rival Club.
    strictEqual(oldest!.fromClubName, fixture.userClubName);
    strictEqual(oldest!.toClubName, fixture.rivalNames[0]);
    strictEqual(oldest!.fee, 1_500_000);
  }),
);

it.effect("reads a Free Agent signing, which has no selling Club", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "test-save");
    const squad = yield* getSquad(savesDir, save.id);
    const signing = squad.players[0]!;

    const userClubName = yield* withSave(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        const { user } = yield* clubs;
        // A Free Agent signing: no Club to leave, and a Credits 0 fee (CONTEXT.md, Free Agent).
        yield* sql`INSERT INTO player_transfers (player_id, from_club_id, to_club_id, transferred_on, fee)
          VALUES (${signing.id}, NULL, ${user.id}, '2026-07-01', 0)`;
        return user.name;
      }),
    );

    const screen = yield* getTransferHistoryScreen(savesDir, save.id);

    strictEqual(screen.entries.length, 1);
    const entry = screen.entries[0]!;
    strictEqual(entry.fromClubName, null, "a Free Agent signing has no selling Club");
    strictEqual(entry.toClubName, userClubName);
    strictEqual(entry.fee, 0);
    strictEqual(entry.playerFirstName, signing.firstName);
  }),
);

it.effect("orders two transfers completed on the same in-world date deterministically", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "test-save");
    const squad = yield* getSquad(savesDir, save.id);

    yield* withSave(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        const { user, rivals } = yield* clubs;
        // Ids are left to autoincrement, as `completeTransfer` leaves them: hard-coding 1 and 2
        // would assert the ORDER BY back to itself, where the case that matters is the one
        // production actually produces.
        yield* sql`INSERT INTO player_transfers (player_id, from_club_id, to_club_id, transferred_on, fee)
          VALUES (${squad.players[0]!.id}, ${rivals[0]!.id}, ${user.id}, '2026-07-05', 100000)`;
        yield* sql`INSERT INTO player_transfers (player_id, from_club_id, to_club_id, transferred_on, fee)
          VALUES (${squad.players[1]!.id}, ${rivals[0]!.id}, ${user.id}, '2026-07-05', 200000)`;
      }),
    );

    const first = yield* getTransferHistoryScreen(savesDir, save.id);
    const second = yield* getTransferHistoryScreen(savesDir, save.id);

    deepStrictEqual(
      first.entries.map((e) => e.fee),
      [200000, 100000],
      "a same-date tie breaks on the row id, so the later-recorded transfer comes first",
    );
    deepStrictEqual(
      first.entries.map((e) => e.id),
      second.entries.map((e) => e.id),
      "reading the screen twice produces the same order",
    );
  }),
);
