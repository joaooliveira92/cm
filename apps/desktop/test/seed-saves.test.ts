import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { notStrictEqual, ok, strictEqual } from "node:assert";
import { Effect } from "effect";
import { afterEach, beforeEach } from "vitest";
import { seedBeforeSeasonEnd, seedConcluded, seedFresh } from "../e2e/seedSaves.js";
import { getSeasonSummary } from "../src/main/season/index.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-seed-saves-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

// Advancing a full season runs many in-process calendar steps (DB writes per matchday); give the
// heavy seeds a generous timeout so they hold up under parallel-suite load.
it.effect("concluded seed produces a save with a board verdict on the season just played", () =>
  Effect.gen(function* () {
    const saveId = yield* Effect.promise(() => seedConcluded(savesDir));
    const summary = yield* getSeasonSummary(savesDir, saveId);

    // The rollover opens the next season as soon as one concludes, so the save is not parked at
    // `season_complete` — the summary reports the season that was judged, which is the one the
    // player has just finished reading about.
    ok(summary.boardObjective?.verdict, "concluded season yields a board verdict");
    ok(summary.managerOutcome, "concluded season yields a manager outcome");
    strictEqual(summary.boardObjective!.seasonNumber, 1);
  }),
  30_000,
);

it.effect("before-season-end seed produces a season not yet concluded", () =>
  Effect.gen(function* () {
    const saveId = yield* Effect.promise(() => seedBeforeSeasonEnd(savesDir));
    const summary = yield* getSeasonSummary(savesDir, saveId);

    notStrictEqual(summary.season.phase, "season_complete");
    ok(summary.season.currentDate < "2100-01-01", "should sit before the season's last date");
  }),
  30_000,
);

it.effect("fresh seed produces a pre-season save", () =>
  Effect.gen(function* () {
    const saveId = yield* Effect.promise(() => seedFresh(savesDir));
    const summary = yield* getSeasonSummary(savesDir, saveId);

    strictEqual(summary.season.phase, "pre_season");
    // A fresh save stands in the pre-season, before the first fixture is played.
    ok(summary.season.currentDate.length === 10);
  }),
);