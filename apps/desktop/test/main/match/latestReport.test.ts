import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, strictEqual } from "node:assert";
import type { MatchId, SaveId } from "@cm-clone/contracts";
import { Effect } from "effect";
import { getLatestMatchReport, getMatchReport, resumeSimulation } from "../../../src/main/match/index.js";
import { commitMatchday } from "../../../src/main/season/commitMatchday.js";
import { atFirstFixture, startSeededMatch } from "./seededMatch.js";

const drain = (savesDir: string, saveId: SaveId, matchId: MatchId) =>
  Effect.gen(function* () {
    let cursor = 0;
    let isComplete = false;
    while (!isComplete) {
      const chunk = yield* resumeSimulation(savesDir, saveId, matchId, cursor, null);
      cursor = chunk.cursor;
      isComplete = chunk.isComplete;
    }
  });

it.effect("the save-scoped report resolves the match just played once the result is committed", () =>
  Effect.gen(function* () {
    const savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-latest-report-"));
    const { save, fixtureId } = yield* atFirstFixture(savesDir);

    // Nothing played yet: the save-scoped report has no match to name.
    strictEqual(yield* getLatestMatchReport(savesDir, save.id), null);

    const match = yield* startSeededMatch(savesDir, save.id, fixtureId, 7);
    yield* drain(savesDir, save.id, match.matchId);
    yield* commitMatchday(savesDir, save.id, fixtureId);

    const latest = yield* getLatestMatchReport(savesDir, save.id);
    const named = yield* getMatchReport(savesDir, save.id, match.matchId);
    deepStrictEqual(latest, named);
    strictEqual(latest?.matchId, match.matchId);

    yield* Effect.promise(() => rm(savesDir, { recursive: true, force: true }));
  }),
);
