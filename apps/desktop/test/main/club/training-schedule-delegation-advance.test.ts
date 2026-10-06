import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { strictEqual } from "node:assert";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { WriteRequestId, type SaveId } from "@cm-clone/contracts";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../../seeded-save.js";
import { advanceThroughBoundary, ensureHumanTactic } from "../boundary-helpers.js";
import { getNewsInbox } from "../../../src/main/career/news.js";
import {
  getTrainingSchedule,
  setTrainingScheduleDelegation,
} from "../../../src/main/club/trainingSchedule.js";

// training-schedule-and-delegation 05: the assistant plans each microcycle as the human's Matchday
// is committed, and only while delegated. One file, one expensive test: it plays two Matchdays.

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-schedule-delegation-advance-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const assistantWrites = (saveId: SaveId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ payload: string }>`SELECT payload FROM events WHERE tag = 'TrainingScheduleSet'`;
    return rows.filter((row) => (JSON.parse(row.payload) as { author: string }).author === "assistant").length;
  }).pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

it.effect(
  "an advance writes no schedule while the manager plans, and exactly one per Matchday while delegated",
  () =>
    Effect.gen(function* () {
      const save = yield* createSave(savesDir, "Test Career");
      yield* ensureHumanTactic(savesDir, save.id);

      yield* advanceThroughBoundary(savesDir, save.id);
      strictEqual(yield* assistantWrites(save.id), 0);

      const { revision } = yield* getTrainingSchedule(savesDir, save.id);
      const delegated = yield* setTrainingScheduleDelegation(savesDir, save.id, true, revision, WriteRequestId.make("d1"));
      strictEqual(yield* assistantWrites(save.id), 1);

      yield* advanceThroughBoundary(savesDir, save.id);
      strictEqual(yield* assistantWrites(save.id), 2);

      const after = yield* getTrainingSchedule(savesDir, save.id);
      strictEqual(after.delegated, true);
      strictEqual(after.revision, delegated.revision + 1);

      const inbox = yield* getNewsInbox(savesDir, save.id);
      const fromAssistant = inbox.messages.filter((message) =>
        message.subject.startsWith(`${after.assistantName} set a`),
      );
      strictEqual(fromAssistant.length, 2);
    }),
  900_000,
);
