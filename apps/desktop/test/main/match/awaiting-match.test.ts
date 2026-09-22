import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, strictEqual } from "node:assert";
import type { MatchId, SaveId } from "@cm-clone/contracts";
import { Effect } from "effect";
import { afterEach, beforeEach } from "vitest";
import { getAwaitingMatch, resumeSimulation } from "../../../src/main/match/index.js";
import { commitMatchday } from "../../../src/main/season/commitMatchday.js";
import { getLeagueTable } from "../../../src/main/season/index.js";
import { atFirstFixture, startSeededMatch } from "./seededMatch.js";

/**
 * group-g-match-day 37: after an app restart Match day has only `PendingFixtureView.matchId` to go on,
 * and `getAwaitingMatch` turns it back into the match `startMatch` answered with.
 */

const ANY_MATCH_SEED = 7;

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-awaiting-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const drain = (saveId: SaveId, matchId: MatchId) =>
  Effect.gen(function* () {
    let cursor = 0;
    let isComplete = false;
    while (!isComplete) {
      const chunk = yield* resumeSimulation(savesDir, saveId, matchId, cursor, null);
      cursor = chunk.cursor;
      isComplete = chunk.isComplete;
    }
  });

it.effect("answers a started, uncommitted match with the summary startMatch gave, found through the pending Fixture", () =>
  Effect.gen(function* () {
    const { save, fixtureId } = yield* atFirstFixture(savesDir);
    const started = yield* startSeededMatch(savesDir, save.id, fixtureId, ANY_MATCH_SEED);

    // What a relaunched renderer reads: the pending Fixture now names the started match.
    const table = yield* getLeagueTable(savesDir, save.id);
    const matchId = table.season.awaitingFixture?.matchId ?? null;
    strictEqual(matchId, started.matchId);

    const resumed = yield* getAwaitingMatch(savesDir, save.id, started.matchId);
    deepStrictEqual(resumed, started);
  }),
);

it.effect("refuses a match whose result was accepted, and one that was never started", () =>
  Effect.gen(function* () {
    const { save, fixtureId } = yield* atFirstFixture(savesDir);

    const unknown = yield* Effect.flip(getAwaitingMatch(savesDir, save.id, String(fixtureId) as MatchId));
    deepStrictEqual({ ...unknown }, { _tag: "MatchNotFoundError", matchId: String(fixtureId) });

    const started = yield* startSeededMatch(savesDir, save.id, fixtureId, ANY_MATCH_SEED);
    yield* drain(save.id, started.matchId);
    yield* commitMatchday(savesDir, save.id, fixtureId);

    const accepted = yield* Effect.flip(getAwaitingMatch(savesDir, save.id, started.matchId));
    deepStrictEqual({ ...accepted }, { _tag: "FixtureNotPendingError", fixtureId });
  }),
);

it.effect("names a missing save", () =>
  Effect.gen(function* () {
    const error = yield* Effect.flip(getAwaitingMatch(savesDir, "no-such-save" as SaveId, "1" as MatchId));
    strictEqual(error._tag, "SaveNotFoundError");
  }),
);
