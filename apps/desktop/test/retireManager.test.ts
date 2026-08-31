import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { it } from "@effect/vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { loadStreamEvents } from "../src/main/decider.js";
import { getManagerProfileScreen } from "../src/main/managerProfile.js";
import { createSave, listSaves } from "../src/main/saves.js";
import { getSeasonSummary, retireManager } from "../src/main/season.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-retire-manager-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: string, effect: Effect.Effect<A, E>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

const loadSeasonStreamEvents = (saveId: string) =>
  withSave(saveId, loadStreamEvents("season", saveId));

const managerStatusRow = (saveId: string) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const rows = yield* sql<{
        archivedCause: string | null;
        lastOutcome: string;
        consecutiveMisses: number;
      }>`SELECT archived_cause as "archivedCause", last_outcome as "lastOutcome",
                consecutive_misses as "consecutiveMisses" FROM manager_status WHERE id = 1`;
      return rows[0]!;
    }),
  );

/** Puts the save one missed objective from the sack without running two Seasons of fixtures — the
 * state that makes `last_outcome`'s survival across retirement observable. */
const warnTheManager = (saveId: string) =>
  withSave(
    saveId,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql`UPDATE manager_status SET consecutive_misses = 1, last_outcome = 'warned' WHERE id = 1`;
    }),
  );

it.effect("retiring archives the save with cause 'retired' and appends ManagerRetired", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");

    yield* retireManager(savesDir, save.id);

    strictEqual((yield* managerStatusRow(save.id)).archivedCause, "retired");

    const retiredEvents = (yield* loadSeasonStreamEvents(save.id)).filter(
      (event) => event.tag === "ManagerRetired",
    );
    strictEqual(retiredEvents.length, 1);
    // The payload carries the Season the career ended in, and deliberately not the
    // Consecutive-Miss Counter: that number explains a sacking, never a retirement.
    deepStrictEqual(retiredEvents[0]!.payload, { seasonNumber: 1 });
  }),
);

it.effect("retiring never writes last_outcome — a warned manager who retires keeps the warning", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* warnTheManager(save.id);

    yield* retireManager(savesDir, save.id);

    const status = yield* managerStatusRow(save.id);
    strictEqual(status.archivedCause, "retired");
    strictEqual(status.lastOutcome, "warned");
    strictEqual(status.consecutiveMisses, 1);

    // And the same is true through the read model the screen actually renders.
    const summary = yield* getSeasonSummary(savesDir, save.id);
    strictEqual(summary.archivedCause, "retired");
    strictEqual(summary.managerOutcome, "warned");
    strictEqual(summary.consecutiveMisses, 1);
  }),
);

it.effect("a retired save is archived on Manager Profile and marked archived in the Save List", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    strictEqual((yield* getManagerProfileScreen(savesDir, save.id)).archived, false);
    strictEqual((yield* listSaves(savesDir))[0]!.archivedCause, null);

    yield* retireManager(savesDir, save.id);

    strictEqual((yield* getManagerProfileScreen(savesDir, save.id)).archived, true);
    strictEqual((yield* listSaves(savesDir))[0]!.archivedCause, "retired");
  }),
);

it.effect("retiring twice is rejected by the archived guard, and appends no second event", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* retireManager(savesDir, save.id);

    const failure = yield* Effect.flip(retireManager(savesDir, save.id));
    strictEqual((failure as { readonly _tag: string })._tag, "SaveArchivedError");
    strictEqual((failure as { readonly cause: string }).cause, "retired");

    const retiredEvents = (yield* loadSeasonStreamEvents(save.id)).filter(
      (event) => event.tag === "ManagerRetired",
    );
    strictEqual(retiredEvents.length, 1);
  }),
);

it.effect("retiring a sacked save is rejected, and the refusal names the sacking as the cause", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    yield* withSave(
      save.id,
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        yield* sql`UPDATE manager_status SET archived_cause = 'sacked', last_outcome = 'sacked' WHERE id = 1`;
      }),
    );

    const failure = yield* Effect.flip(retireManager(savesDir, save.id));
    strictEqual((failure as { readonly _tag: string })._tag, "SaveArchivedError");
    // The cause is the one that already archived the save, not the one the player just attempted.
    strictEqual((failure as { readonly cause: string }).cause, "sacked");

    ok((yield* loadSeasonStreamEvents(save.id)).every((event) => event.tag !== "ManagerRetired"));
  }),
);

it.effect("a well-formed but missing save fails typed, not as a defect", () =>
  Effect.gen(function* () {
    const result = yield* Effect.result(retireManager(savesDir, "no-such-save" as never));
    ok(result._tag === "Failure");
    strictEqual(result.failure._tag, "SaveNotFoundError");
  }),
);
