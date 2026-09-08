import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { Tactic, WriteRequestId, type PlayerId } from "@cm-clone/contracts";
import { FORMATION_SLOTS, POSITION_ROLES, emptyBench } from "@cm-clone/shared";
import { Effect, Result } from "effect";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../../../src/main/world/index.js";
import { getTactics, changeTactics } from "../../../src/main/club/index.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-tactics-test-"));
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
    bench: emptyBench(),
    mentality: "balanced",
    tempo: "normal",
    pressing: "medium",
  });

const rid = (s: string) => WriteRequestId.make(s);

it.effect("getTactics returns no persisted Tactic and revision 0 for a fresh save", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const view = yield* getTactics(savesDir, save.id);

    strictEqual(view.tactic, null);
    strictEqual(view.revision, 0);
    ok(view.squad.length >= 11);
  }),
);

it.effect("changeTactics persists a Tactic and getTactics loads it back unchanged", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTactics(savesDir, save.id);
    const tactic = buildTactic(before.squad.map((player) => player.id));

    const afterChange = yield* changeTactics(
      savesDir,
      save.id,
      tactic,
      before.revision,
      rid("first-save"),
    );
    deepStrictEqual(afterChange.tactic, tactic);
    strictEqual(afterChange.revision, 1);

    const reloaded = yield* getTactics(savesDir, save.id);
    deepStrictEqual(reloaded.tactic, tactic);
    strictEqual(reloaded.revision, 1);
  }),
);

it.effect("every accepted save raises the revision by exactly one, from 0", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTactics(savesDir, save.id);
    strictEqual(before.revision, 0);
    const tactic = buildTactic(before.squad.map((player) => player.id));

    const first = yield* changeTactics(savesDir, save.id, tactic, 0, rid("r1"));
    strictEqual(first.revision, 1);

    const secondTactic = new Tactic({ ...tactic, mentality: "attacking" });
    const second = yield* changeTactics(savesDir, save.id, secondTactic, first.revision, rid("r2"));
    strictEqual(second.revision, 2);

    const reloaded = yield* getTactics(savesDir, save.id);
    strictEqual(reloaded.revision, 2);
    deepStrictEqual(reloaded.tactic, secondTactic);
  }),
);

it.effect("a submit whose expected revision is stale is refused with a typed conflict naming the current revision", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTactics(savesDir, save.id);
    const tactic = buildTactic(before.squad.map((player) => player.id));
    yield* changeTactics(savesDir, save.id, tactic, before.revision, rid("first"));

    // A second window that still believes revision 0 submits — refused, never silently overwritten.
    const error = yield* Effect.flip(
      changeTactics(savesDir, save.id, tactic, 0, rid("second-window")),
    );
    strictEqual(error._tag, "TacticRevisionConflictError");
    strictEqual((error as { readonly currentRevision: number }).currentRevision, 1);

    // A conflict changes nothing: the stored tactic and revision are untouched.
    const reloaded = yield* getTactics(savesDir, save.id);
    strictEqual(reloaded.revision, 1);
    deepStrictEqual(reloaded.tactic, tactic);
  }),
);

it.effect("replaying an accepted request id is a no-op that returns the current state, not an error", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTactics(savesDir, save.id);
    const tactic = buildTactic(before.squad.map((player) => player.id));

    const first = yield* changeTactics(savesDir, save.id, tactic, before.revision, rid("accepted"));
    strictEqual(first.revision, 1);

    // The same submit replayed — even with a stale expected revision — is a success, not a conflict
    // and not a second write.
    const replayed = yield* changeTactics(savesDir, save.id, tactic, 999, rid("accepted"));
    strictEqual(replayed.revision, 1);
    deepStrictEqual(replayed.tactic, tactic);

    // And it still returns the current state once the club has moved on to a later revision.
    const secondTactic = new Tactic({ ...tactic, mentality: "attacking" });
    const second = yield* changeTactics(savesDir, save.id, secondTactic, 1, rid("second"));
    strictEqual(second.revision, 2);

    const stillReplayed = yield* changeTactics(savesDir, save.id, tactic, 1, rid("accepted"));
    strictEqual(stillReplayed.revision, 2);
    deepStrictEqual(stillReplayed.tactic, secondTactic);
  }),
);

it.effect("a replayed request id with a now-invalid payload is still a no-op, not an error", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTactics(savesDir, save.id);
    const tactic = buildTactic(before.squad.map((player) => player.id));
    const accepted = yield* changeTactics(
      savesDir,
      save.id,
      tactic,
      before.revision,
      rid("accepted"),
    );
    strictEqual(accepted.revision, 1);

    // The same request id replayed with a payload that would now fail validation (the same player
    // in every slot). The no-op guarantee wins over validation — the submit was accepted once, so
    // returning the current state is the pinned behaviour, before any re-validation.
    const invalidTactic = new Tactic({
      ...tactic,
      slots: FORMATION_SLOTS["4-4-2"].map((position) => ({
        position,
        role: POSITION_ROLES[position],
        playerId: tactic.slots[0]!.playerId,
      })),
    });
    const replayed = yield* changeTactics(
      savesDir,
      save.id,
      invalidTactic,
      999,
      rid("accepted"),
    );
    strictEqual(replayed.revision, 1);
    deepStrictEqual(replayed.tactic, tactic);
  }),
);

it.effect("two concurrent saves on the same expected revision yield exactly one success and one typed conflict", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTactics(savesDir, save.id);
    const tactic = buildTactic(before.squad.map((player) => player.id));

    const outcomes = yield* Effect.all(
      [
        Effect.result(changeTactics(savesDir, save.id, tactic, 0, rid("race-a"))),
        Effect.result(changeTactics(savesDir, save.id, tactic, 0, rid("race-b"))),
      ],
      { concurrency: 2 },
    );

    const wins = outcomes.filter((outcome) => Result.isSuccess(outcome));
    const losses = outcomes.filter((outcome) => Result.isFailure(outcome));
    strictEqual(wins.length, 1, "exactly one concurrent save wins the race");
    strictEqual(losses.length, 1, "the losing save must not be silently overwritten");
    strictEqual(wins[0]!.success.revision, 1);

    const loser = losses[0]!;
    if (Result.isFailure(loser)) {
      strictEqual(loser.failure._tag, "TacticRevisionConflictError");
      strictEqual(
        (loser.failure as { readonly currentRevision: number }).currentRevision,
        1,
      );
    }

    const reloaded = yield* getTactics(savesDir, save.id);
    strictEqual(reloaded.revision, 1);
  }),
);

it.effect("changeTactics rejects a Tactic that assigns the same player twice", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTactics(savesDir, save.id);
    const duplicatePlayerId = before.squad[0]!.id;
    const tactic = new Tactic({
      ...buildTactic(before.squad.map((player) => player.id)),
      slots: FORMATION_SLOTS["4-4-2"].map((position) => ({
        position,
        role: POSITION_ROLES[position],
        playerId: duplicatePlayerId,
      })),
    });

    const result = yield* Effect.exit(
      changeTactics(savesDir, save.id, tactic, before.revision, rid("dup")),
    );
    ok(result._tag === "Failure");
  }),
);

it.effect("changeTactics rejects a slot whose Role doesn't match its Position", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTactics(savesDir, save.id);
    const tactic = buildTactic(before.squad.map((player) => player.id));
    const badTactic = new Tactic({
      ...tactic,
      slots: [{ ...tactic.slots[0]!, role: "Poacher" }, ...tactic.slots.slice(1)],
    });

    const result = yield* Effect.exit(
      changeTactics(savesDir, save.id, badTactic, before.revision, rid("bad")),
    );
    ok(result._tag === "Failure");
  }),
);

it.effect("every Formation's slots are a genuinely distinct shape", () =>
  Effect.sync(() => {
    const shapes = new Set(
      Object.values(FORMATION_SLOTS).map((slots) => JSON.stringify(slots)),
    );
    strictEqual(shapes.size, Object.keys(FORMATION_SLOTS).length);
  }),
);

it.effect("changeTactics rejects a slot position that doesn't match the formation", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTactics(savesDir, save.id);
    const tactic = buildTactic(before.squad.map((player) => player.id));
    const badTactic = new Tactic({
      ...tactic,
      slots: [{ ...tactic.slots[0]!, position: "ST", role: "Poacher" }, ...tactic.slots.slice(1)],
    });

    const result = yield* Effect.exit(
      changeTactics(savesDir, save.id, badTactic, before.revision, rid("bad")),
    );
    ok(result._tag === "Failure");
  }),
);

/** A valid 4-4-2 whose first 11 squad players start and the next 7 fill the bench. */
const buildTacticWithBench = (squadIds: ReadonlyArray<PlayerId>): Tactic =>
  new Tactic({
    ...buildTactic(squadIds),
    bench: squadIds.slice(11, 11 + 7).map((playerId) => playerId ?? null),
  });

it.effect("a named bench round-trips through changeTactics and getTactics", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTactics(savesDir, save.id);
    const withBench = buildTacticWithBench(before.squad.map((player) => player.id));

    const accepted = yield* changeTactics(savesDir, save.id, withBench, before.revision, rid("bench"));
    deepStrictEqual(accepted.tactic, withBench);

    const reloaded = yield* getTactics(savesDir, save.id);
    deepStrictEqual(reloaded.tactic, withBench);
  }),
);

it.effect("changeTactics accepts a bench with empty slots", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTactics(savesDir, save.id);
    const tactic = buildTactic(before.squad.map((player) => player.id));
    const partiallyFilled = new Tactic({
      ...tactic,
      bench: [before.squad[11]!.id, null, null, null, null, null, null],
    });

    const accepted = yield* changeTactics(
      savesDir,
      save.id,
      partiallyFilled,
      before.revision,
      rid("partial-bench"),
    );
    deepStrictEqual(accepted.tactic, partiallyFilled);
  }),
);

it.effect("changeTactics rejects a bench that names a starter", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTactics(savesDir, save.id);
    const tactic = buildTactic(before.squad.map((player) => player.id));
    const overlap = new Tactic({
      ...tactic,
      bench: [tactic.slots[0]!.playerId, null, null, null, null, null, null],
    });

    const result = yield* Effect.exit(
      changeTactics(savesDir, save.id, overlap, before.revision, rid("overlap")),
    );
    ok(result._tag === "Failure");
  }),
);

it.effect("changeTactics rejects a bench that names the same player twice", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTactics(savesDir, save.id);
    const tactic = buildTactic(before.squad.map((player) => player.id));
    const doubled = new Tactic({
      ...tactic,
      bench: [before.squad[11]!.id, before.squad[11]!.id, null, null, null, null, null],
    });

    const result = yield* Effect.exit(
      changeTactics(savesDir, save.id, doubled, before.revision, rid("double")),
    );
    ok(result._tag === "Failure");
  }),
);