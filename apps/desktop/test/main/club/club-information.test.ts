/**
 * Club General Information (Screen 34, group-c ticket 06).
 *
 * The read is short on purpose: only the club's standing and its ground have a model in this game,
 * and the rest of the import is `deferred` in the Group C ledger. These cover the two things worth
 * proving — that it answers for *any* club rather than only the manager's, and that it fails the
 * way the contract says rather than returning an empty club.
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
import { getClubInformation } from "../../../src/main/club/index.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-club-information-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: ':memory:' })),
    Effect.scoped,
  );

/** A club the human does not manage — the point of the screen being club-scoped. */
const aRivalClub = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const rows = yield* sql<{ id: ClubId }>`
    SELECT id FROM clubs WHERE is_user_club = 0 ORDER BY id LIMIT 1`;
  return rows[0]!.id;
});

describe("getClubInformation", () => {
  it.effect("answers for the manager's own club, and says it is theirs", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Information");

      const own = yield* withSave(
        save.id,
        Effect.gen(function* () {
          const client = yield* SqlClient;
          const rows = yield* client<{ id: ClubId }>`
            SELECT id FROM clubs WHERE is_user_club = 1 LIMIT 1`;
          return rows[0]!.id;
        }),
      );

      const view = yield* getClubInformation(savesDir, save.id, own);

      strictEqual(view.isUserClub, true);
      strictEqual(view.club.id, own);
      ok(view.club.name.length > 0, "the club is named through the pack, not by raw id");
      ok(["big", "mid", "small"].includes(view.club.statureTier));
    }),
  );

  /**
   * The whole reason the screen is club-scoped rather than save-scoped: a rival answers, and
   * answers the same shape. `CONTEXT.md` — a Club carries no hidden value of its own — is why
   * nothing is withheld here.
   */
  it.effect("answers for a club the manager does not manage, and marks it as not theirs", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Information");
      const rival = yield* withSave(save.id, aRivalClub);

      const view = yield* getClubInformation(savesDir, save.id, rival);

      strictEqual(view.isUserClub, false);
      strictEqual(view.club.id, rival);
      ok(view.stadiumName.length > 0, "a rival's ground is not withheld");
      ok(view.stadiumCapacity > 0);
    }),
  );

  it.effect("names the town and the nation through the pack, never a raw id", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Information");
      const rival = yield* withSave(save.id, aRivalClub);

      const view = yield* getClubInformation(savesDir, save.id, rival);

      ok(view.cityName.length > 0);
      ok(view.nationName.length > 0);
      ok(!view.nationName.startsWith("nation_"), `nation read as a raw id: ${view.nationName}`);
    }),
  );

  it.effect("fails with ClubNotFoundError for a club the save does not hold", () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Information");

      const outcome = yield* getClubInformation(
        savesDir,
        save.id,
        ClubId.make("club_nowhere_9_99"),
      ).pipe(Effect.catchTag("ClubNotFoundError", (error) => Effect.succeed(error)));

      expect(outcome).toMatchObject({ _tag: "ClubNotFoundError" });
    }),
  );
});
