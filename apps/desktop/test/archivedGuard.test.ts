import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { ok } from "node:assert";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { FORMATION_SLOTS, POSITION_ROLES, type ArchivedCause } from "@cm-clone/shared";
import { BidId, ClubId, MatchId, PlayerId, Tactic } from "@cm-clone/contracts";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../src/main/world/index.js";
import { getSquad, changeTactics } from "../src/main/club/index.js";
import { startMatch, submitMatchCommand } from "../src/main/match/index.js";
import {
  placeBid,
  respondAsBidder,
  respondToBid,
  renewContract,
  signFreeAgent,
} from "../src/main/transfers/index.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-archived-guard-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

/** Directly sets `manager_status.archived_cause` — a unit-level way to exercise every mutating
 * handler's guard without driving two full Seasons through `advanceCalendar` (that end-to-end path
 * is covered by `boardObjectives.test.ts`) or retiring (covered by `retireManager.test.ts`). */
const markArchived = (saveId: string, cause: ArchivedCause) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql`UPDATE manager_status SET archived_cause = ${cause} WHERE id = 1`;
  }).pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

/** The guard keys off the archived state, never the cause. The tag is what makes the save
 * read-only; the cause riding along is what lets the renderer word the refusal correctly, so both
 * are asserted. */
const rejectsAsArchived = (failure: unknown, cause: ArchivedCause) => {
  const typed = failure as { readonly _tag: string; readonly cause: string };
  return typed._tag === "SaveArchivedError" && typed.cause === cause;
};

/** Every mutating command in the app, run against a save archived by `cause`. */
const everyMutatingCommandRejects = (cause: ArchivedCause) =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const squad = yield* getSquad(savesDir, save.id);
    yield* markArchived(save.id, cause);

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

    ok(rejectsAsArchived(yield* Effect.flip(changeTactics(savesDir, save.id, tactic)), cause));
    ok(rejectsAsArchived(yield* Effect.flip(startMatch(savesDir, save.id, ClubId.make("irrelevant-club-id"))), cause));
    ok(
      rejectsAsArchived(
        yield* Effect.flip(
          submitMatchCommand(savesDir, save.id, MatchId.make("irrelevant-match-id"), 0, 1, false, {
            _tag: "MakeSubstitution",
            clubId: squad.club.id,
            outPlayerId: PlayerId.make("irrelevant"),
            inPlayerId: PlayerId.make("irrelevant"),
          }),
        ),
        cause,
      ),
    );
    ok(rejectsAsArchived(yield* Effect.flip(placeBid(savesDir, save.id, PlayerId.make("irrelevant-player-id"), 1000)), cause));
    ok(
      rejectsAsArchived(
        yield* Effect.flip(respondToBid(savesDir, save.id, BidId.make("irrelevant-bid-id"), "accept", undefined)),
        cause,
      ),
    );
    ok(rejectsAsArchived(yield* Effect.flip(respondAsBidder(savesDir, save.id, BidId.make("irrelevant-bid-id"), "accept")), cause));
    ok(rejectsAsArchived(yield* Effect.flip(signFreeAgent(savesDir, save.id, PlayerId.make("irrelevant-player-id"), undefined)), cause));
    ok(rejectsAsArchived(yield* Effect.flip(renewContract(savesDir, save.id, PlayerId.make("irrelevant-player-id"), undefined)), cause));
  });

it.effect("a sacked save is read-only: every mutating command rejects with SaveArchivedError", () =>
  everyMutatingCommandRejects("sacked"),
);

// The retirement half is the point of the rename: a retired save is archived exactly as hard as a
// sacked one, through the same column and the same guard, and only the carried cause differs.
it.effect("a retired save is read-only: every mutating command rejects with SaveArchivedError", () =>
  everyMutatingCommandRejects("retired"),
);
