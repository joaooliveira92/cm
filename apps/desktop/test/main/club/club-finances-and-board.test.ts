/**
 * Club Finances (Screen 39) and Board Confidence (Screen 47), group-c ticket 08.
 *
 * Each screen is half-modelled and the ledger names which half. What is worth proving is that the
 * modelled halves read correctly, that Finances answers for a rival — `club_budgets` is keyed on
 * `club_id` — and that Board Confidence is *save*-scoped because a rival has no objective at all.
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
import { getBoardConfidence } from "../../../src/main/season/index.js";
import { getClubFinances } from "../../../src/main/transfers/index.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-club-finances-board-test-"));
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

describe("getClubFinances", () => {
  it.effect("answers for a rival club, because every club has a budget row", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Finances");
      const rival = yield* withSave(save.id, clubWhere("is_user_club = 0"));

      const view = yield* getClubFinances(savesDir, save.id, rival);

      strictEqual(view.club.id, rival);
      strictEqual(view.isUserClub, false);
      ok(view.club.name.length > 0);
      ok(view.wageBudget > 0, "a generated club has a wage budget");
    }),
  );

  it.effect("marks the manager's own club as theirs", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Finances");
      const own = yield* withSave(save.id, clubWhere("is_user_club = 1"));

      strictEqual((yield* getClubFinances(savesDir, save.id, own)).isUserClub, true);
    }),
  );

  /** Headroom is derived, not stored, and the derivation is the one the transfer commands check. */
  it.effect("reports headroom as wage budget less committed wages", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Finances");
      const own = yield* withSave(save.id, clubWhere("is_user_club = 1"));

      const view = yield* getClubFinances(savesDir, save.id, own);

      strictEqual(view.headroom, view.wageBudget - view.committedWages);
    }),
  );

  it.effect("fails with ClubNotFoundError for a club the save does not hold", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Finances");

      const outcome = yield* getClubFinances(
        savesDir,
        save.id,
        ClubId.make("club_nowhere_9_99"),
      ).pipe(Effect.catchTag("ClubNotFoundError", (error) => Effect.succeed(error)));

      expect(outcome).toMatchObject({ _tag: "ClubNotFoundError" });
    }),
  );
});

describe("getBoardConfidence", () => {
  it.effect("reads the manager's own objective for the current season", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Board");

      const view = yield* getBoardConfidence(savesDir, save.id);

      ok(view.clubName.length > 0, "the club is named through the pack");
      ok(view.season.seasonNumber >= 1);
      ok(view.objective !== null, "a started career has an objective");
      ok(view.objective.minPosition <= view.objective.maxPosition);
    }),
  );

  /**
   * The screen is save-scoped precisely because this is true: `board_objective` names the human's
   * club, so no rival has a row. Asserted against the schema rather than the screen, because it is
   * the fact the whole scoping decision rests on.
   */
  it.effect("no club but the manager's has a board objective at all", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Board");

      const clubIds = yield* withSave(
        save.id,
        Effect.gen(function* () {
          const sql = yield* SqlClient;
          const rows = yield* sql<{ clubId: ClubId; isUserClub: number }>`
            SELECT o.club_id as "clubId", c.is_user_club as "isUserClub"
            FROM board_objective o JOIN clubs c ON c.id = o.club_id`;
          return rows;
        }),
      );

      ok(clubIds.length > 0, "the save has an objective to check");
      for (const row of clubIds) {
        strictEqual(row.isUserClub, 1, `${row.clubId} has an objective but is not the user's club`);
      }
    }),
  );

  /** Before the board judges a season, both fields are null — a state, not a gap. */
  it.effect("carries a null verdict while the season is still being played", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Board");

      const view = yield* getBoardConfidence(savesDir, save.id);

      strictEqual(view.objective?.finalPosition ?? null, null);
      strictEqual(view.objective?.verdict ?? null, null);
    }),
  );
});
