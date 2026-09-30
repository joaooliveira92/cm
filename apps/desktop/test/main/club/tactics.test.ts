import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { PlayerId, Tactic, WriteRequestId, type InvalidTacticError } from "@cm-clone/contracts";
import { BUILT_IN_TEMPLATES } from "@cm-clone/shared";
import { Effect, Result } from "effect";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../../seeded-save.js";
import { tacticOf } from "../../setup/tacticFixtures.js";
import { getTactics, changeTactics } from "../../../src/main/club/index.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-tactics-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const buildTactic = (squadIds: ReadonlyArray<PlayerId>): Tactic => tacticOf(squadIds);

/** A complete Tactic with a non-default value in every kind of field: another template with runs,
 *  a changed team instruction and team set piece, a slot's instructions, run and set-piece role, a
 *  named bench and every taker list. What a save must give back untouched. */
const buildCompleteTactic = (squadIds: ReadonlyArray<PlayerId>): Tactic => {
  const base = tacticOf(squadIds, { template: "4-2-3-1", bench: squadIds.slice(11, 18) });
  const at = (index: number) => squadIds[index]!;
  return new Tactic({
    ...base,
    sourceTemplate: "My Chasing Shape",
    team: { ...base.team, passing: "long", focusPassing: "leftFlank", tackling: "hard", closingDown: "always", mentality: "gungHo", offsideTrap: true, zonalMarking: true, counterAttack: true, menBehindTheBall: true },
    teamSetPieces: { ...base.teamSetPieces, cornersLeft: "short", cornersRight: "farPost", freeKicksLeft: "long", freeKicksRight: "crossNear", throwInsLeft: "quick", throwInsRight: "long" },
    slots: base.slots.map((slot, index) =>
      index === 0
        ? { ...slot, instructions: { ...slot.instructions, distribution: "askDefendersToCollect" as const } }
        : index === 9
          ? {
              ...slot,
              run: { row: "F" as const, column: "C" as const },
              instructions: { ...slot.instructions, passing: "short" as const, closingDown: "standOff" as const, tackling: "easy" as const, marking: "man" as const, mentality: "attacking" as const, crossFrom: "deep" as const, crossAim: "farPost" as const, longShots: "often" as const, freeRole: "often" as const },
              setPieceRoles: { ...slot.setPieceRoles, defendFreeKick: "formWall" as const, attackCorner: "nearPostFlickOn" as const, attackingThrowInLeft: "lurkOutsideArea" as const },
            }
          : slot,
    ),
    takers: {
      captain: [at(4), at(5)],
      penalties: [at(9), at(8), at(7)],
      freeKicksLeft: [at(8)],
      freeKicksRight: [at(9), at(6)],
      cornersLeft: [at(7)],
      cornersRight: [at(6), at(7)],
      throwInsLeft: [at(2)],
      throwInsRight: [at(3), at(2)],
    },
  });
};

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

    const secondTactic = new Tactic({ ...tactic, team: { ...tactic.team, mentality: "attacking" } });
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
    const secondTactic = new Tactic({ ...tactic, team: { ...tactic.team, mentality: "attacking" } });
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
      assignments: tactic.assignments.map(() => tactic.assignments[0]!),
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
      assignments: buildTactic(before.squad.map((player) => player.id)).assignments.map(() => duplicatePlayerId),
    });

    const error = yield* refusal(changeTactics(savesDir, save.id, tactic, before.revision, rid("dup")));
    ok(error.problems.some((problem) => problem._tag === "PlayerTwice" && problem.playerId === duplicatePlayerId));
  }),
);

it.effect("changeTactics saves and re-reads a complete Tactic, every field of it", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTactics(savesDir, save.id);
    const complete = buildCompleteTactic(before.squad.map((player) => player.id));

    const accepted = yield* changeTactics(savesDir, save.id, complete, before.revision, rid("complete"));
    deepStrictEqual(accepted.tactic, complete);

    const reloaded = yield* getTactics(savesDir, save.id);
    deepStrictEqual(reloaded.tactic, complete);
    strictEqual(reloaded.tactic!.sourceTemplate, "My Chasing Shape");
    deepStrictEqual(reloaded.tactic!.takers.penalties, complete.takers.penalties);
  }),
);

it.effect("a second save replaces the first whole, leaving no slot instruction, run or taker of it behind", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTactics(savesDir, save.id);
    const ids = before.squad.map((player) => player.id);
    yield* changeTactics(savesDir, save.id, buildCompleteTactic(ids), 0, rid("complete"));

    const plain = buildTactic(ids);
    const second = yield* changeTactics(savesDir, save.id, plain, 1, rid("plain"));
    deepStrictEqual(second.tactic, plain);
    deepStrictEqual((yield* getTactics(savesDir, save.id)).tactic, plain);
  }),
);

/** The `InvalidTacticError` a refused save fails with. */
const refusal = <A>(effect: Effect.Effect<A, unknown>) =>
  Effect.gen(function* () {
    const error = yield* Effect.flip(effect);
    strictEqual((error as { readonly _tag: string })._tag, "InvalidTacticError");
    return error as InvalidTacticError;
  });

it.effect("changeTactics refuses an invalid Tactic with the rules' named problems, changing nothing", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTactics(savesDir, save.id);
    const ids = before.squad.map((player) => player.id);
    const tactic = buildTactic(ids);
    const broken = new Tactic({
      ...tactic,
      slots: tactic.slots.map((slot, index) => {
        if (index === 0) return { ...slot, cell: { row: "D" as const, column: "C" as const } };
        if (index === 2) return { ...slot, cell: tactic.slots[3]!.cell };
        if (index === 5) return { ...slot, instructions: { ...slot.instructions, distribution: "longKick" as const } };
        return slot;
      }),
      assignments: [...tactic.assignments.slice(0, 10), tactic.assignments[0]!],
      bench: [before.squad[20]!.id],
    });

    const error = yield* refusal(changeTactics(savesDir, save.id, broken, before.revision, rid("broken")));
    const tags = error.problems.map((problem) => problem._tag);
    for (const tag of ["GoalkeeperNotFirst", "DuplicateCell", "DistributionOffGoalkeeper", "PlayerTwice", "WrongBenchSize"]) {
      ok(tags.includes(tag as never), `expected ${tag} among ${tags.join(", ")}`);
    }
    ok(error.reason.length > 0);

    const reloaded = yield* getTactics(savesDir, save.id);
    strictEqual(reloaded.tactic, null);
    strictEqual(reloaded.revision, 0);
  }),
);

it.effect("changeTactics refuses a player who is not in the squad and a taker who is not either", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTactics(savesDir, save.id);
    const tactic = buildTactic(before.squad.map((player) => player.id));
    const stranger = PlayerId.make("not-in-this-squad");

    const asStarter = new Tactic({ ...tactic, assignments: [stranger, ...tactic.assignments.slice(1)] });
    const asTaker = new Tactic({ ...tactic, takers: { ...tactic.takers, penalties: [stranger] } });
    for (const [name, bad] of [["starter", asStarter], ["taker", asTaker]] as const) {
      const error = yield* refusal(changeTactics(savesDir, save.id, bad, before.revision, rid(name)));
      ok(error.problems.some((problem) => problem._tag === "PlayerNotInSquad" && problem.playerId === stranger));
    }
  }),
);

it.effect("a refused save leaves the revision alone and does not spend its request id", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTactics(savesDir, save.id);
    const tactic = buildTactic(before.squad.map((player) => player.id));
    const broken = new Tactic({ ...tactic, assignments: tactic.assignments.map(() => tactic.assignments[0]!) });

    yield* refusal(changeTactics(savesDir, save.id, broken, 0, rid("retry")));
    // The same request id, fixed: it was never accepted, so it is a fresh write and not a replay.
    const fixed = yield* changeTactics(savesDir, save.id, tactic, 0, rid("retry"));
    strictEqual(fixed.revision, 1);
    deepStrictEqual(fixed.tactic, tactic);
  }),
);

it.effect("the template table gives 29 distinct shapes that all save and re-read", () =>
  Effect.gen(function* () {
    strictEqual(new Set(BUILT_IN_TEMPLATES.map((template) => JSON.stringify(template.slots.map((slot) => [slot.cell, slot.run])))).size, 29);
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTactics(savesDir, save.id);
    const ids = before.squad.map((player) => player.id);
    let revision = before.revision;
    for (const template of BUILT_IN_TEMPLATES) {
      const tactic = tacticOf(ids, { template: template.name });
      const saved = yield* changeTactics(savesDir, save.id, tactic, revision, rid(`t-${template.name}`));
      revision = saved.revision;
      deepStrictEqual(saved.tactic, tactic, template.name);
    }
  }),
);

it.effect("changeTactics accepts a shape moved off its template, and the source template keeps its name", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTactics(savesDir, save.id);
    const tactic = buildTactic(before.squad.map((player) => player.id));
    // A 4-4-2 with one central midfielder dropped into the back line, next to the centre-backs.
    const custom = new Tactic({
      ...tactic,
      slots: tactic.slots.map((slot, index) => (index === 6 ? { ...slot, cell: { row: "D" as const, column: "C" as const } } : slot)),
    });

    const accepted = yield* changeTactics(savesDir, save.id, custom, before.revision, rid("custom"));
    deepStrictEqual(accepted.tactic, custom);
    strictEqual(accepted.tactic!.sourceTemplate, "4-4-2");
    const reloaded = yield* getTactics(savesDir, save.id);
    deepStrictEqual(reloaded.tactic, custom);
  }),
);

it.effect("changeTactics refuses a shape without the goalkeeper cell alone in slot 0", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const before = yield* getTactics(savesDir, save.id);
    const tactic = buildTactic(before.squad.map((player) => player.id));
    const noKeeper = new Tactic({
      ...tactic,
      slots: [{ ...tactic.slots[0]!, cell: { row: "F" as const, column: "C" as const } }, ...tactic.slots.slice(1)],
    });
    const twoKeepers = new Tactic({
      ...tactic,
      slots: [
        ...tactic.slots.slice(0, 1),
        { ...tactic.slots[1]!, cell: { row: "GK" as const, column: "C" as const } },
        ...tactic.slots.slice(2),
      ],
    });

    for (const [name, bad, tag] of [
      ["no-gk", noKeeper, "GoalkeeperNotFirst"],
      ["two-gk", twoKeepers, "GoalkeeperOutsideSlotZero"],
    ] as const) {
      const error = yield* refusal(changeTactics(savesDir, save.id, bad, before.revision, rid(name)));
      ok(error.problems.some((problem) => problem._tag === tag), `${name}: ${error.reason}`);
    }
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
      bench: [tactic.assignments[0]!, null, null, null, null, null, null],
    });

    const error = yield* refusal(changeTactics(savesDir, save.id, overlap, before.revision, rid("overlap")));
    ok(error.problems.some((problem) => problem._tag === "PlayerTwice"));
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

    const error = yield* refusal(changeTactics(savesDir, save.id, doubled, before.revision, rid("double")));
    ok(error.problems.some((problem) => problem._tag === "PlayerTwice"));
  }),
);