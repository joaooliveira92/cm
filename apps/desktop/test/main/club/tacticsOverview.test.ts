import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { it } from "@effect/vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Tactic, WriteRequestId, type PlayerId, type SaveId } from "@cm-clone/contracts";
import {
  FORMATION_SLOTS,
  POSITION_ROLES,
  positionRating,
  roleRating,
  type PlayerAttributes,
} from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../../../src/main/world/index.js";
import {
  changeTactics,
  getSquad,
  getTactics,
  getTacticsOverview,
} from "../../../src/main/club/index.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-overview-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const buildTactic = (squadIds: ReadonlyArray<PlayerId>): Tactic =>
  new Tactic({
    formation: "4-4-2",
    slots: FORMATION_SLOTS["4-4-2"].map((position, index) => ({
      position,
      role: POSITION_ROLES[position],
      playerId: squadIds[index]!,
    })),
    bench: Array.from({ length: 7 }, (_, benchIndex) => squadIds[11 + benchIndex] ?? null),
    mentality: "balanced",
    tempo: "normal",
    pressing: "medium",
  });

const rid = (s: string) => WriteRequestId.make(s);

/** Opens a read/write connection to the save's SQLite file, for seeding state the read observes. */
const withSaveWrite = <A, E>(saveId: SaveId, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

it.effect("a fresh save's snapshot is the no-tactic state: revision 0, null tactic sections, and no match-day selection", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const snapshot = yield* getTacticsOverview(savesDir, save.id);

    strictEqual(snapshot.revision, 0);
    strictEqual(snapshot.formation, null);
    strictEqual(snapshot.instructions, null);
    strictEqual(snapshot.assignments.length, 0);
    strictEqual(snapshot.familiarity, null);
    strictEqual(snapshot.selection.starters.length, 0);
    strictEqual(snapshot.selection.substitutes.length, 0, "no Tactic means nobody is benched yet");
    deepStrictEqual({ ...snapshot.setPieces }, { status: "none" });

    strictEqual(snapshot.issues.length, 1);
    strictEqual(snapshot.issues[0]!.id, "no-tactic");
    strictEqual(snapshot.issues[0]!.severity, "blocking");
    strictEqual(snapshot.issues[0]!.destination, "tactics");
  }),
);

it.effect("every section binds to the revision the tactic was saved at, and ratings arrive computed", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTactics(savesDir, save.id);
    const tactic = buildTactic(before.squad.map((player) => player.id));
    yield* changeTactics(savesDir, save.id, tactic, before.revision, rid("first"));

    const snapshot = yield* getTacticsOverview(savesDir, save.id);

    strictEqual(snapshot.revision, 1);
    strictEqual(snapshot.formation?.formation, "4-4-2");
    strictEqual(snapshot.formation?.slots.length, 11);
    deepStrictEqual(
      snapshot.formation?.slots.map((slot) => slot.position),
      FORMATION_SLOTS["4-4-2"],
    );
    deepStrictEqual({ ...snapshot.instructions }, {
      mentality: "balanced",
      tempo: "normal",
      pressing: "medium",
    });

    // 11 assignments, one per slot, names and ratings computed at the trusted boundary.
    strictEqual(snapshot.assignments.length, 11);
    const assignmentByPlayer = new Map(
      snapshot.assignments.map((assignment) => [assignment.playerId, assignment]),
    );
    for (const slot of tactic.slots) {
      const player = before.squad.find((p) => p.id === slot.playerId);
      ok(player, "slot player is in the squad");
      const assignment = assignmentByPlayer.get(slot.playerId);
      ok(assignment);
      strictEqual(assignment.firstName, player.firstName);
      strictEqual(assignment.lastName, player.lastName);
      strictEqual(assignment.position, slot.position);
      strictEqual(assignment.role, slot.role);
      strictEqual(
        assignment.positionRating,
        positionRating(player.attributes as PlayerAttributes, slot.position),
      );
      strictEqual(
        assignment.roleRating,
        roleRating(player.attributes as PlayerAttributes, slot.role),
      );
    }

    // Familiarity sums to the eleven starters; selection is the match-day eighteen.
    strictEqual(
      snapshot.familiarity!.natural +
        snapshot.familiarity!.competent +
        snapshot.familiarity!.unfamiliar,
      11,
    );
    strictEqual(snapshot.selection.starters.length, 11);
    deepStrictEqual(
      snapshot.selection.starters.map((player) => player.id),
      tactic.slots.map((slot) => slot.playerId),
    );
    deepStrictEqual(
      snapshot.selection.substitutes.map((player) => player.id),
      tactic.bench.filter((id): id is PlayerId => id !== null),
    );
    const selectedIds = new Set([
      ...snapshot.selection.starters.map((p) => p.id),
      ...snapshot.selection.substitutes.map((p) => p.id),
    ]);
    strictEqual(selectedIds.size, 18, "eleven starters and seven benched, nobody doubled");
    ok(before.squad.length > 18, "the fixture squad has someone outside the match-day eighteen");
    ok(
      snapshot.selection.starters.every((p) => p.firstName.length > 0 && p.lastName.length > 0),
    );
    ok(
      snapshot.selection.substitutes.every((p) => p.firstName.length > 0 && p.lastName.length > 0),
    );

    deepStrictEqual(snapshot.issues, []);
  }),
);

it.effect("a slot that names a departed player reports the blocker, nulls that assignment, and drops the player from selection", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTactics(savesDir, save.id);
    const tactic = buildTactic(before.squad.map((player) => player.id));
    yield* changeTactics(savesDir, save.id, tactic, before.revision, rid("first"));

    const departed = tactic.slots[0]!.playerId;
    yield* withSaveWrite(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        const otherClub = yield* sql<{ id: string }>`
          SELECT id FROM clubs WHERE is_user_club = 0 LIMIT 1`;
        yield* sql`UPDATE players SET club_id = ${otherClub[0]!.id} WHERE id = ${departed}`;
      }),
    );

    const snapshot = yield* getTacticsOverview(savesDir, save.id);

    const departedBlocker = snapshot.issues.find((issue) => issue.id === "tactic-names-departed-players");
    ok(departedBlocker, "the departed slot is a blocking issue");
    strictEqual(departedBlocker!.severity, "blocking");
    strictEqual(departedBlocker!.destination, "tactics");

    const departedAssignment = snapshot.assignments.find((a) => a.playerId === departed);
    ok(departedAssignment);
    strictEqual(departedAssignment.firstName, null);
    strictEqual(departedAssignment.lastName, null);
    strictEqual(departedAssignment.positionRating, null);
    strictEqual(departedAssignment.roleRating, null);

    // The departed player is not on the match-day eighteen: starters drop to ten, the bench keeps its
// seven, and the gap is the blocker rather than a phantom starter or substitute.
    const selectedIds = new Set([
      ...snapshot.selection.starters.map((p) => p.id),
      ...snapshot.selection.substitutes.map((p) => p.id),
    ]);
    ok(!selectedIds.has(departed), "the departed player is not in either selection list");
    strictEqual(snapshot.selection.starters.length, 10);
    strictEqual(snapshot.selection.substitutes.length, 7);
    strictEqual(
      snapshot.familiarity!.natural + snapshot.familiarity!.competent + snapshot.familiarity!.unfamiliar,
      10,
      "familiarity counts only the still-registered starters",
    );
  }),
);

it.effect("a pending incoming bid surfaces as an advisory with the Transfers destination", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const squad = yield* getSquad(savesDir, save.id);
    const clubId = squad.club.id;
    yield* withSaveWrite(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        const bidder = yield* sql<{ id: string }>`
          SELECT id FROM clubs WHERE is_user_club = 0 LIMIT 1`;
        yield* sql`INSERT INTO bids (id, player_id, selling_club_id, bidding_club_id, amount, counter_amount, status, season_number)
          VALUES ('overview-bid', ${squad.players[0]!.id}, ${clubId}, ${bidder[0]!.id}, 1000000, NULL, 'pending', (SELECT MAX(season_number) FROM season))`;
      }),
    );

    const snapshot = yield* getTacticsOverview(savesDir, save.id);

    const bidAdvisory = snapshot.issues.find((issue) => issue.id === "bids-awaiting-response");
    ok(bidAdvisory, "the pending bid is an advisory");
    strictEqual(bidAdvisory!.severity, "advisory");
    strictEqual(bidAdvisory!.destination, "transfers");
  }),
);