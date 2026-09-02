import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ClubId } from "@cm-clone/contracts";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect, Exit } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { beginCareer, commitCareer, listSaves } from "../src/main/saves.js";
import { createDefaultSnapshot } from "./snapshot-helpers.js";

/**
 * The commit boundary rejects a club id that matches no club.
 *
 * `UPDATE clubs SET is_user_club = 1 WHERE id = ?` matches zero rows for an unknown id without
 * complaint, so before this the career committed with no user club and the first squad screen
 * found nothing owned by the manager. The condition is recoverable rather than a defect:
 * `commitCareer` is an IPC surface decoding an untrusted payload, and the flow has something to
 * say about it.
 */

let savesDir = "";
let userDataDir = "";

const PROFILE = {
  managerName: "Test Manager",
  archetypeOrigin: "custom",
  pillars: { tacticalAcumen: 3, influence: 3, regimen: 3, technicalCoaching: 3 },
};

const provisionalWorld = Effect.gen(function* () {
  const snapshotId = yield* createDefaultSnapshot(userDataDir);
  return yield* beginCareer(savesDir, { userDataDir, snapshotId });
});

const clubIdsOf = (saveId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    return yield* sql<{ id: string }>`SELECT id FROM clubs ORDER BY rowid`;
  }).pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

beforeEach(async () => {
  savesDir = await mkdtemp(path.join(tmpdir(), "cm-clone-commit-club-"));
  userDataDir = path.join(savesDir, ".user-data");
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

describe("commitCareer and the selected club", () => {
  it("fails with ClubNotFoundError and leaves the save undiscoverable", async () => {
    const { id } = await Effect.runPromise(provisionalWorld);

    const exit = await Effect.runPromiseExit(
      commitCareer(savesDir, id, "Doomed Career", ClubId.make("no-such-club"), PROFILE),
    );

    expect(Exit.isFailure(exit)).toBe(true);
    expect(JSON.stringify(exit)).toContain("ClubNotFoundError");

    // Nothing was written: `save_meta` is what makes a save discoverable, and the failure lands
    // before the first statement, so the file on disk is still a provisional world.
    const saves = await Effect.runPromise(listSaves(savesDir));
    expect(saves).toHaveLength(0);
    // The file itself is untouched rather than deleted — discarding it is the flow's job.
    expect(await readdir(savesDir)).toContain(`${id}.sqlite`);
  }, 120_000);

  it("commits the club the caller chose, not the first one generated", async () => {
    const { id } = await Effect.runPromise(provisionalWorld);
    const clubs = await Effect.runPromise(clubIdsOf(id));
    const chosen = clubs[7]!.id;

    await Effect.runPromise(
      commitCareer(savesDir, id, "Chosen Career", ClubId.make(chosen), PROFILE),
    );

    const userClubs = await Effect.runPromise(
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        return yield* sql<{ id: string }>`SELECT id FROM clubs WHERE is_user_club = 1`;
      }).pipe(
        Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${id}.sqlite`) })),
        Effect.scoped,
      ),
    );

    expect(userClubs.map((club) => club.id)).toEqual([chosen]);
    expect(await Effect.runPromise(listSaves(savesDir))).toHaveLength(1);
  }, 120_000);
});
