/**
 * Club Fixtures (Screen 40) and Club Transfers (Screen 42), group-c ticket 07.
 *
 * Both are club-scoped siblings of reads that were deliberately the manager's own. What is worth
 * proving is that they answer for a rival, that the club rides with the rows so one read answers
 * the page, and that an unknown club fails rather than returning the empty list a real club can
 * legitimately have.
 */
import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ok, strictEqual } from "node:assert";
import { it } from "@effect/vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach, describe, expect } from "vitest";
import { ClubId } from "@cm-clone/contracts";
import { createSave } from "../../seeded-save.js";
import { getClubFixtures } from "../../../src/main/season/index.js";
import { getClubTransfers } from "../../../src/main/transfers/index.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-club-fixtures-transfers-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

const clubWhere = (predicate: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql.unsafe<{ id: ClubId }>(
      `SELECT id FROM clubs WHERE ${predicate} ORDER BY id LIMIT 1`,
    );
    return rows[0]!.id;
  });

const NOWHERE = ClubId.make("club_nowhere_9_99");

describe("getClubFixtures", () => {
  it.effect("answers for a rival club, with the club on the view", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Fixtures");
      const rival = yield* withSave(save.id, clubWhere("is_user_club = 0"));

      const view = yield* getClubFixtures(savesDir, save.id, rival);

      strictEqual(view.club.id, rival);
      strictEqual(view.isUserClub, false);
      ok(view.club.name.length > 0, "the club is named through the pack, not by raw id");
      ok(view.season.seasonNumber >= 1);
    }),
  );

  it.effect("marks the manager's own club as theirs", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Fixtures");
      const own = yield* withSave(save.id, clubWhere("is_user_club = 1"));

      strictEqual((yield* getClubFixtures(savesDir, save.id, own)).isUserClub, true);
    }),
  );

  /** The point of filtering on the club's two sides rather than on a competition. */
  it.effect("returns only fixtures the club actually plays in, home or away", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Fixtures");
      const club = yield* withSave(save.id, clubWhere("is_user_club = 1"));

      const view = yield* getClubFixtures(savesDir, save.id, club);

      ok(view.fixtures.length > 0, "a club in a league has fixtures");
      for (const fixture of view.fixtures) {
        ok(
          fixture.homeClubId === club || fixture.awayClubId === club,
          `fixture ${fixture.id} involves neither side of ${club}`,
        );
      }
    }),
  );

  it.effect("is ordered by date, so the list reads as a calendar", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Fixtures");
      const club = yield* withSave(save.id, clubWhere("is_user_club = 1"));

      const dates = (yield* getClubFixtures(savesDir, save.id, club)).fixtures.map((f) => f.date);

      expect([...dates]).toEqual([...dates].sort());
    }),
  );

  it.effect("fails with ClubNotFoundError, rather than the empty list a real club can have", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Fixtures");

      const outcome = yield* getClubFixtures(savesDir, save.id, NOWHERE).pipe(
        Effect.catchTag("ClubNotFoundError", (error) => Effect.succeed(error)),
      );

      expect(outcome).toMatchObject({ _tag: "ClubNotFoundError" });
    }),
  );
});

describe("getClubTransfers", () => {
  it.effect("answers for a rival club, with the club on the view", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Transfers");
      const rival = yield* withSave(save.id, clubWhere("is_user_club = 0"));

      const view = yield* getClubTransfers(savesDir, save.id, rival);

      strictEqual(view.club.id, rival);
      strictEqual(view.isUserClub, false);
      ok(view.club.name.length > 0);
    }),
  );

  /** A fresh career has played no Transfer Window, so empty is the ordinary answer here. */
  it.effect("returns an empty list for a club that has completed no transfer", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Transfers");
      const own = yield* withSave(save.id, clubWhere("is_user_club = 1"));

      const view = yield* getClubTransfers(savesDir, save.id, own);

      strictEqual(view.isUserClub, true);
      strictEqual(view.entries.length, 0);
    }),
  );

  it.effect("fails with ClubNotFoundError, so a missing club cannot look like an empty one", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Transfers");

      const outcome = yield* getClubTransfers(savesDir, save.id, NOWHERE).pipe(
        Effect.catchTag("ClubNotFoundError", (error) => Effect.succeed(error)),
      );

      expect(outcome).toMatchObject({ _tag: "ClubNotFoundError" });
    }),
  );
});
