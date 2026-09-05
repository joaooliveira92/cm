import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, strictEqual } from "node:assert";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import type { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../../../src/main/world/index.js";
import { appendStreamEvents, loadStreamEvents, nextStreamSeq } from "../../../src/main/season/decider.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-decider-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

it.effect("appendStreamEvents assigns sequential seq numbers a stream can be replayed in order", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");

    yield* withSave(
      save.id,
      Effect.gen(function* () {
        const startSeq = yield* nextStreamSeq("match", "fixture-1");
        strictEqual(startSeq, 1);

        yield* appendStreamEvents("match", "fixture-1", startSeq, [
          { tag: "MatchStarted", payload: { seed: 42 } },
          { tag: "Goal", payload: { minute: 10 } },
        ]);

        const events = yield* loadStreamEvents("match", "fixture-1");
        deepStrictEqual(
          events.map((event) => ({ seq: event.seq, tag: event.tag, payload: event.payload })),
          [
            { seq: 1, tag: "MatchStarted", payload: { seed: 42 } },
            { seq: 2, tag: "Goal", payload: { minute: 10 } },
          ],
        );

        const next = yield* nextStreamSeq("match", "fixture-1");
        strictEqual(next, 3);
      }),
    );
  }),
);

it.effect("streams are isolated by stream_type and stream_id", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");

    yield* withSave(
      save.id,
      Effect.gen(function* () {
        yield* appendStreamEvents("match", "fixture-1", 1, [{ tag: "MatchStarted", payload: {} }]);
        // "season"/save.id is real state here — `createSave` seeds it via `startSeason` (ticket 15) —
        // so isolation is exercised against an unrelated stream type instead.
        yield* appendStreamEvents("club", save.id, 1, [{ tag: "ClubCreated", payload: {} }]);

        const matchEvents = yield* loadStreamEvents("match", "fixture-1");
        const clubEvents = yield* loadStreamEvents("club", save.id);
        strictEqual(matchEvents.length, 1);
        strictEqual(clubEvents.length, 1);
        strictEqual(matchEvents[0]!.tag, "MatchStarted");
        strictEqual(clubEvents[0]!.tag, "ClubCreated");
      }),
    );
  }),
);
