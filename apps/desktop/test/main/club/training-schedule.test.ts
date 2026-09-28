import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, strictEqual } from "node:assert";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { WriteRequestId, type SaveId } from "@cm-clone/contracts";
import { TRAINING_SCHEDULE_TEMPLATES, type TrainingSession } from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../../seeded-save.js";
import {
  changeTrainingSchedule,
  getTrainingSchedule,
  setTrainingScheduleDelegation,
} from "../../../src/main/club/trainingSchedule.js";

// training-schedule-and-delegation 03: the schedule is stored against a revision, replays are
// no-ops, and every accepted write appends a `TrainingScheduleSet` event naming the manager.

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-training-schedule-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const rid = (s: string) => WriteRequestId.make(s);
const { balanced, heavy, recovery } = TRAINING_SCHEDULE_TEMPLATES;

const scheduleEvents = (saveId: SaveId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    return yield* sql<{ payload: string }>`SELECT payload FROM events WHERE tag = 'TrainingScheduleSet' ORDER BY seq`;
  }).pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

const assistantEvents = (saveId: SaveId) =>
  scheduleEvents(saveId).pipe(
    Effect.map((rows) =>
      rows.map((row) => JSON.parse(row.payload) as { author: string; template: string; assistantName?: string }),
    ),
    Effect.map((payloads) => payloads.filter((payload) => payload.author === "assistant")),
  );

it.effect("a club that never saved a schedule reads as Balanced at revision 0, planning for its next Fixture", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const view = yield* getTrainingSchedule(savesDir, save.id);

    deepStrictEqual(view.sessions, balanced);
    strictEqual(view.template, "balanced");
    strictEqual(view.revision, 0);
    strictEqual(view.nextFixture !== null, true);
    strictEqual(view.nextFixture!.opponentClubName.length > 0, true);
  }),
);

it.effect("a save replaces the sessions, raises the revision by one, and survives a fresh read", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");

    const saved = yield* changeTrainingSchedule(savesDir, save.id, heavy, 0, rid("r1"));
    strictEqual(saved.revision, 1);
    strictEqual(saved.template, "heavy");

    const custom: TrainingSession[] = [...recovery];
    custom[0] = { type: "physical", intensity: "high" };
    const second = yield* changeTrainingSchedule(savesDir, save.id, custom, 1, rid("r2"));
    strictEqual(second.revision, 2);
    strictEqual(second.template, null);

    const reloaded = yield* getTrainingSchedule(savesDir, save.id);
    deepStrictEqual(reloaded.sessions, custom);
    strictEqual(reloaded.revision, 2);
  }),
);

it.effect("a stale revision is refused with a typed conflict naming the current one, and changes nothing", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* changeTrainingSchedule(savesDir, save.id, heavy, 0, rid("first"));

    const error = yield* Effect.flip(changeTrainingSchedule(savesDir, save.id, recovery, 0, rid("second")));
    strictEqual(error._tag, "TrainingScheduleRevisionConflictError");
    if (error._tag === "TrainingScheduleRevisionConflictError") strictEqual(error.currentRevision, 1);

    const reloaded = yield* getTrainingSchedule(savesDir, save.id);
    strictEqual(reloaded.template, "heavy");
    strictEqual(reloaded.revision, 1);
  }),
);

it.effect("replaying an accepted request id is a no-op success, however stale its revision", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* changeTrainingSchedule(savesDir, save.id, heavy, 0, rid("accepted"));

    const replay = yield* changeTrainingSchedule(savesDir, save.id, heavy, 0, rid("accepted"));
    strictEqual(replay.revision, 1);
    strictEqual((yield* scheduleEvents(save.id)).length, 1);
  }),
);

it.effect("a schedule with the wrong number of sessions is refused, writing nothing", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");

    const error = yield* Effect.flip(changeTrainingSchedule(savesDir, save.id, balanced.slice(0, 4), 0, rid("r1")));
    strictEqual(error._tag, "InvalidTrainingScheduleError");
    strictEqual((yield* getTrainingSchedule(savesDir, save.id)).revision, 0);
    strictEqual((yield* scheduleEvents(save.id)).length, 0);
  }),
);

it.effect("every accepted write appends one TrainingScheduleSet event naming the manager and the template", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* changeTrainingSchedule(savesDir, save.id, recovery, 0, rid("r1"));

    const events = yield* scheduleEvents(save.id);
    strictEqual(events.length, 1);
    const payload = JSON.parse(events[0]!.payload) as { author: string; template: string };
    strictEqual(payload.author, "manager");
    strictEqual(payload.template, "recovery");
  }),
);

it.effect("a fresh schedule is the manager's, and names the club's Assistant Manager", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const view = yield* getTrainingSchedule(savesDir, save.id);
    strictEqual(view.delegated, false);
    strictEqual(view.assistantName.split(" ").length >= 2, true);
    strictEqual(view.assistantReason, null);
  }),
);

it.effect("delegating hands the schedule to the assistant, who plans at once and never picks Heavy", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const delegated = yield* setTrainingScheduleDelegation(savesDir, save.id, true, 0, rid("d1"));

    strictEqual(delegated.delegated, true);
    strictEqual(delegated.revision, 1);
    strictEqual(delegated.template !== null && delegated.template !== "heavy", true);
    strictEqual(typeof delegated.assistantReason, "string");

    const events = yield* assistantEvents(save.id);
    strictEqual(events.length, 1);
    strictEqual(events[0]!.assistantName, delegated.assistantName);

    const reloaded = yield* getTrainingSchedule(savesDir, save.id);
    strictEqual(reloaded.delegated, true);
  }),
);

it.effect("taking the schedule back keeps the assistant's sessions as the manager's", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const delegated = yield* setTrainingScheduleDelegation(savesDir, save.id, true, 0, rid("d1"));
    const taken = yield* setTrainingScheduleDelegation(savesDir, save.id, false, 1, rid("d2"));

    strictEqual(taken.delegated, false);
    strictEqual(taken.revision, 2);
    deepStrictEqual(taken.sessions, delegated.sessions);
    strictEqual(taken.assistantReason, null);
    strictEqual((yield* assistantEvents(save.id)).length, 1);
  }),
);

it.effect("a manager save takes the schedule back, so the assistant never overwrites it", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* setTrainingScheduleDelegation(savesDir, save.id, true, 0, rid("d1"));
    const saved = yield* changeTrainingSchedule(savesDir, save.id, heavy, 1, rid("m1"));

    strictEqual(saved.delegated, false);
    strictEqual(saved.template, "heavy");
  }),
);

it.effect("delegation is revision-guarded like a schedule save", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* changeTrainingSchedule(savesDir, save.id, heavy, 0, rid("m1"));

    const error = yield* Effect.flip(setTrainingScheduleDelegation(savesDir, save.id, true, 0, rid("d1")));
    strictEqual(error._tag, "TrainingScheduleRevisionConflictError");
    strictEqual((yield* getTrainingSchedule(savesDir, save.id)).delegated, false);
  }),
);
