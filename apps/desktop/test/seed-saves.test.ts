import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { notStrictEqual, ok, strictEqual } from "node:assert";
import { Effect } from "effect";
import { afterEach, beforeEach } from "vitest";
import { seedBeforeSeasonEnd, seedConcluded, seedFresh } from "../e2e/seedSaves.js";
import { getSeasonSummary } from "../src/main/season.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-seed-saves-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

// Advancing a full season runs many in-process calendar steps (DB writes per matchday); give the
// heavy seeds a generous timeout so they hold up under parallel-suite load.
it.effect("concluded seed produces a season_complete save with a board verdict", () =>
  Effect.gen(function* () {
    const saveId = yield* Effect.promise(() => seedConcluded(savesDir));
    const summary = yield* getSeasonSummary(savesDir, saveId);

    strictEqual(summary.season.phase, "season_complete");
    ok(summary.boardObjective?.verdict, "concluded season yields a board verdict");
    ok(summary.managerOutcome, "concluded season yields a manager outcome");
  }),
  30_000,
);

it.effect("before-season-end seed produces a season not yet concluded", () =>
  Effect.gen(function* () {
    const saveId = yield* Effect.promise(() => seedBeforeSeasonEnd(savesDir));
    const summary = yield* getSeasonSummary(savesDir, saveId);

    notStrictEqual(summary.season.phase, "season_complete");
    ok(summary.season.currentMatchday < 38, "should sit before the final matchday");
  }),
  30_000,
);

it.effect("fresh seed produces a pre-season save", () =>
  Effect.gen(function* () {
    const saveId = yield* Effect.promise(() => seedFresh(savesDir));
    const summary = yield* getSeasonSummary(savesDir, saveId);

    strictEqual(summary.season.phase, "pre_season");
    strictEqual(summary.season.currentMatchday, 0);
  }),
);