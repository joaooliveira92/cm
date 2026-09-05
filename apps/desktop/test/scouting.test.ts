import { mkdtempSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { it } from "@effect/vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach, describe, expect } from "vitest";
import { PlayerId } from "@cm-clone/contracts";
import { FULLY_SCOUTED, attributeRange, nextProgress, scoutingAccrual } from "@cm-clone/shared";
import { createSave } from "../src/main/world/index.js";
import { advanceCalendar, discardSquadsForClubs } from "../src/main/season/index.js";
import { assignScout, getScouting, unassignScout, getSquad } from "../src/main/club/index.js";
import { releaseClubStaff } from "../src/main/career/index.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-scouting-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

/** A player at some club other than the human's — the ordinary scouting target. */
const someOtherClubsPlayer = (saveId: string) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const rows = yield* sql<{ id: PlayerId }>`
        SELECT p.id FROM players p JOIN clubs c ON c.id = p.club_id
        WHERE c.is_user_club = 0 ORDER BY p.id LIMIT 2`;
      return rows;
    }),
  );

const progressRows = (saveId: string) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      return yield* sql<{ clubId: string; playerId: string; progress: number }>`
        SELECT club_id as "clubId", player_id as "playerId", progress
        FROM scouting_progress ORDER BY player_id ASC`;
    }),
  );

// ---------------------------------------------------------------------------
// The formulas (pure)
// ---------------------------------------------------------------------------

describe("scouting accrual", () => {
  it("is strictly positive across the whole 1-20 quality domain", () => {
    for (let quality = 1; quality <= 20; quality += 1) {
      expect(scoutingAccrual(quality)).toBeGreaterThan(0);
    }
  });

  it("reaches Fully Scouted for every scout, the worst one included", () => {
    for (let quality = 1; quality <= 20; quality += 1) {
      let progress = 0;
      let advances = 0;
      while (progress < FULLY_SCOUTED && advances < 500) {
        progress = nextProgress(progress, quality);
        advances += 1;
      }
      // A poor scout is slow, never futile: an assignment that could never finish would be a trap.
      strictEqual(progress, FULLY_SCOUTED, `quality ${quality} stalled at ${progress}`);
    }
  });

  it("never decreases, and never overshoots", () => {
    for (let quality = 1; quality <= 20; quality += 1) {
      let progress = 0;
      for (let step = 0; step < 100; step += 1) {
        const next = nextProgress(progress, quality);
        expect(next).toBeGreaterThanOrEqual(progress);
        expect(next).toBeLessThanOrEqual(FULLY_SCOUTED);
        progress = next;
      }
    }
  });

  it("makes a better scout faster without buying them another slot", () => {
    expect(scoutingAccrual(20)).toBeGreaterThan(scoutingAccrual(1));
  });
});

describe("attribute range", () => {
  it("collapses to the true value at Fully Scouted", () => {
    deepStrictEqual(attributeRange(64, FULLY_SCOUTED), [64, 64]);
  });

  it("is widest at Unscouted and narrows monotonically", () => {
    const widths = [0, 25, 50, 75, 100].map((progress) => {
      const [low, high] = attributeRange(50, progress);
      return high - low;
    });
    for (let index = 1; index < widths.length; index += 1) {
      expect(widths[index]!).toBeLessThan(widths[index - 1]!);
    }
  });

  it("never shows a bound outside the scale", () => {
    deepStrictEqual(attributeRange(1, 0, [1, 20])[0], 1);
    deepStrictEqual(attributeRange(20, 0, [1, 20])[1], 20);
  });
});

// ---------------------------------------------------------------------------
// Assignments and progress on disk
// ---------------------------------------------------------------------------

describe("assigning a scout", () => {
  it.effect("reports the club's scouts, each watching at most one player", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Scouting");
      const board = yield* getScouting(savesDir, save.id);

      ok(board.scouts.length > 0, "the human's club should have scouts");
      ok(board.scouts.every((scout) => scout.playerId === null), "nobody is watched yet");
      ok(board.scouts.every((scout) => scout.progress === null), "and nothing is scouted");
    }),
    60_000,
  );

  it.effect("points a scout at a player, and frees them again", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Scouting");
      const board = yield* getScouting(savesDir, save.id);
      const scout = board.scouts[0]!;
      const [target] = yield* someOtherClubsPlayer(save.id);

      const assigned = yield* assignScout(savesDir, save.id, scout.scoutId, target!.id);
      strictEqual(assigned.scouts.find((s) => s.scoutId === scout.scoutId)?.playerId, target!.id);
      // Assigning writes no progress: the club has not observed anything yet, and a progress-0 row
      // is exactly what the sparse table must never hold.
      strictEqual((yield* progressRows(save.id)).length, 0);

      const freed = yield* unassignScout(savesDir, save.id, scout.scoutId);
      strictEqual(freed.scouts.find((s) => s.scoutId === scout.scoutId)?.playerId, null);
    }),
    60_000,
  );

  it.effect("has no cap error and no duplicate error, because neither state is reachable", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Scouting");
      const board = yield* getScouting(savesDir, save.id);
      const [first, second] = yield* someOtherClubsPlayer(save.id);

      // Every scout assigned, which is the cap — and the cap is the row count of a table keyed on
      // the scout, so there is nothing to check and nothing to raise.
      for (const scout of board.scouts) {
        yield* assignScout(savesDir, save.id, scout.scoutId, first!.id);
      }
      const afterAll = yield* getScouting(savesDir, save.id);
      // One player, one watcher: the unique index moved the assignment rather than duplicating it.
      strictEqual(afterAll.scouts.filter((s) => s.playerId === first!.id).length, 1);

      // Redirecting a scout is a legitimate move, not a conflict.
      const scoutId = board.scouts[0]!.scoutId;
      const redirected = yield* assignScout(savesDir, save.id, scoutId, second!.id);
      strictEqual(redirected.scouts.find((s) => s.scoutId === scoutId)?.playerId, second!.id);
    }),
    60_000,
  );

  it.effect("names an unknown scout as the only failure the shape cannot rule out", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Scouting");
      const [target] = yield* someOtherClubsPlayer(save.id);

      const unknownScout = yield* Effect.flip(
        assignScout(savesDir, save.id, "staff_nobody", target!.id),
      );
      strictEqual((unknownScout as { readonly _tag: string })._tag, "UnknownScoutError");

      const board = yield* getScouting(savesDir, save.id);
      const unknownPlayer = yield* Effect.flip(
        assignScout(savesDir, save.id, board.scouts[0]!.scoutId, PlayerId.make("player_nobody")),
      );
      strictEqual((unknownPlayer as { readonly _tag: string })._tag, "PlayerNotFoundError");
    }),
    60_000,
  );
});

describe("progress accrues as the calendar moves", () => {
  it.effect("writes its first row on the first advance, never at zero", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Scouting");
      const board = yield* getScouting(savesDir, save.id);
      const [target] = yield* someOtherClubsPlayer(save.id);
      yield* assignScout(savesDir, save.id, board.scouts[0]!.scoutId, target!.id);

      strictEqual((yield* progressRows(save.id)).length, 0);

      yield* advanceCalendar(savesDir, save.id);
      const rows = yield* progressRows(save.id);
      strictEqual(rows.length, 1);
      ok(rows[0]!.progress > 0, "no code path writes a progress-0 row");

      // And it keeps rising, monotonically, toward Fully Scouted.
      let previous = rows[0]!.progress;
      for (let advance = 0; advance < 5; advance += 1) {
        yield* advanceCalendar(savesDir, save.id);
        const [row] = yield* progressRows(save.id);
        ok(row!.progress >= previous, "progress must never decrease");
        previous = row!.progress;
      }
      ok(previous > rows[0]!.progress);
    }),
    120_000,
  );

  it.effect("keeps a club's knowledge when its scout is reassigned elsewhere", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Scouting");
      const board = yield* getScouting(savesDir, save.id);
      const [first, second] = yield* someOtherClubsPlayer(save.id);
      const scoutId = board.scouts[0]!.scoutId;

      yield* assignScout(savesDir, save.id, scoutId, first!.id);
      yield* advanceCalendar(savesDir, save.id);
      const watched = (yield* progressRows(save.id))[0]!.progress;

      // Knowledge is not un-learned: the club keeps what it observed.
      yield* assignScout(savesDir, save.id, scoutId, second!.id);
      yield* advanceCalendar(savesDir, save.id);
      const rows = yield* progressRows(save.id);
      strictEqual(rows.length, 2);
      strictEqual(rows.find((row) => row.playerId === first!.id)?.progress, watched);
    }),
    120_000,
  );

  it.effect("accrues nothing for an unassigned scout", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Scouting");
      yield* advanceCalendar(savesDir, save.id);
      strictEqual((yield* progressRows(save.id)).length, 0);
    }),
    120_000,
  );
});

describe("the scoutable set is exactly the players who have rows", () => {
  it.effect("cannot reach a results-only club's players, with no depth branch anywhere", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Scouting");

      const reachable = yield* withSave(
        save.id,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          // Every player the market can offer, and how many of them belong to a results-only
          // competition. The answer is structurally zero: those clubs have no player rows.
          const rows = yield* sql<{ count: number }>`
            SELECT COUNT(*) as "count" FROM players p
            JOIN competition_participants cp ON cp.club_id = p.club_id
            JOIN competitions c ON c.id = cp.competition_id
            WHERE c.depth = 'results-only'`;
          return rows[0]!.count;
        }),
      );

      strictEqual(reachable, 0);
    }),
    60_000,
  );
});

describe("scouting belongs to the club", () => {
  it.effect("goes with the backroom when the manager leaves", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Scouting");
      const board = yield* getScouting(savesDir, save.id);
      const [target] = yield* someOtherClubsPlayer(save.id);
      yield* assignScout(savesDir, save.id, board.scouts[0]!.scoutId, target!.id);
      yield* advanceCalendar(savesDir, save.id);
      ok((yield* progressRows(save.id)).length > 0);

      const club = yield* getSquad(savesDir, save.id);
      yield* withSave(save.id, releaseClubStaff(club.club.id));

      // Taking a new job starts a new club's observation rather than importing the last one's.
      strictEqual((yield* progressRows(save.id)).length, 0);
      const assignments = yield* withSave(
        save.id,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          const rows = yield* sql<{ count: number }>`SELECT COUNT(*) as "count" FROM scouting_assignments`;
          return rows[0]!.count;
        }),
      );
      strictEqual(assignments, 0);
    }),
    120_000,
  );

  it.effect("goes with a player the world stops containing", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Scouting");
      const board = yield* getScouting(savesDir, save.id);
      const [target] = yield* someOtherClubsPlayer(save.id);
      yield* assignScout(savesDir, save.id, board.scouts[0]!.scoutId, target!.id);
      yield* advanceCalendar(savesDir, save.id);
      ok((yield* progressRows(save.id)).length > 0);

      // Relegation into a results-only tier deletes players. The scout's slot silently reopens.
      const clubId = yield* withSave(
        save.id,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          const rows = yield* sql<{ clubId: string }>`SELECT club_id as "clubId" FROM players WHERE id = ${target!.id}`;
          return rows[0]!.clubId;
        }),
      );
      yield* withSave(save.id, discardSquadsForClubs([clubId]));

      strictEqual((yield* progressRows(save.id)).length, 0);
      const stillWatching = yield* getScouting(savesDir, save.id);
      ok(stillWatching.scouts.every((scout) => scout.playerId !== target!.id));
    }),
    120_000,
  );
});

describe("no scouting code branches on Simulation Depth", () => {
  it("mentions depth only to explain why it does not read it", async () => {
    const source = await readFile(
      new URL("../src/main/club/scouting.ts", import.meta.url),
      "utf8",
    );
    // Comments may discuss Depth — the module's header explains precisely why the rule enforces
    // itself. Code may not read it: the scoutable set is the players who have rows, and a depth
    // predicate here would be a second, weaker statement of the same thing.
    const code = source
      .replaceAll(/\/\*[\s\S]*?\*\//g, "")
      .replaceAll(/\/\/[^\n]*/g, "");

    expect(code).not.toMatch(/results-only/);
    expect(code).not.toMatch(/\bdepth\b/i);
  });
});
