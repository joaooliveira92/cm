import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { ok } from "node:assert";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { FORMATION_SLOTS, POSITION_ROLES } from "@cm-clone/shared";
import { Tactic } from "@cm-clone/contracts";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../src/main/saves.js";
import { getSquad } from "../src/main/squad.js";
import { changeTactics } from "../src/main/tactics.js";
import { startMatch, submitMatchCommand } from "../src/main/match.js";
import { placeBid, respondAsBidder, respondToBid, renewContract, signFreeAgent } from "../src/main/transfers.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-sacked-guard-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

/** Directly flips `manager_status.sacked` — a unit-level way to exercise every mutating handler's
 * guard without driving two full Seasons through `advanceCalendar` (that end-to-end path is
 * covered by `boardObjectives.test.ts`). */
const markSacked = (saveId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql`UPDATE manager_status SET sacked = 1 WHERE id = 1`;
  }).pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

const isSaveSackedError = (failure: unknown) => (failure as { readonly _tag: string })._tag === "SaveSackedError";

it.effect("a sacked save is read-only: every mutating command rejects with SaveSackedError", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const squad = yield* getSquad(savesDir, save.id);
    yield* markSacked(save.id);

    const tactic = new Tactic({
      formation: "4-4-2",
      slots: FORMATION_SLOTS["4-4-2"].map((position, index) => ({
        position,
        role: POSITION_ROLES[position],
        playerId: squad.players[index]!.id,
      })),
      mentality: "balanced",
      tempo: "normal",
      pressing: "medium",
    });

    ok(isSaveSackedError(yield* Effect.flip(changeTactics(savesDir, save.id, tactic))));
    ok(isSaveSackedError(yield* Effect.flip(startMatch(savesDir, save.id, "irrelevant-club-id"))));
    ok(
      isSaveSackedError(
        yield* Effect.flip(
          submitMatchCommand(savesDir, save.id, "irrelevant-match-id", 0, 1, false, {
            _tag: "MakeSubstitution",
            clubId: squad.club.id,
            outPlayerId: "irrelevant",
            inPlayerId: "irrelevant",
          }),
        ),
      ),
    );
    ok(isSaveSackedError(yield* Effect.flip(placeBid(savesDir, save.id, "irrelevant-player-id", 1000))));
    ok(isSaveSackedError(yield* Effect.flip(respondToBid(savesDir, save.id, "irrelevant-bid-id", "accept", undefined))));
    ok(isSaveSackedError(yield* Effect.flip(respondAsBidder(savesDir, save.id, "irrelevant-bid-id", "accept"))));
    ok(isSaveSackedError(yield* Effect.flip(signFreeAgent(savesDir, save.id, "irrelevant-player-id", undefined))));
    ok(isSaveSackedError(yield* Effect.flip(renewContract(savesDir, save.id, "irrelevant-player-id", undefined))));
  }),
);
