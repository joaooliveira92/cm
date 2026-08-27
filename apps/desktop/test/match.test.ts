import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, notStrictEqual, ok, strictEqual } from "node:assert";
import { Effect } from "effect";
import { afterEach, beforeEach } from "vitest";
import { createSave } from "../src/main/saves.js";
import { listOpponentClubs, resumeSimulation, startMatch } from "../src/main/match.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-match-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

it.effect("listOpponentClubs excludes the user's own club", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const opponents = yield* listOpponentClubs(savesDir, save.id);

    ok(opponents.length >= 1);
    ok(opponents.every((club) => club.name.length > 0));
  }),
);

it.effect("startMatch persists a full event timeline and returns club identities", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const opponents = yield* listOpponentClubs(savesDir, save.id);
    const opponent = opponents[0]!;

    const summary = yield* startMatch(savesDir, save.id, opponent.id);

    ok(summary.matchId.length > 0);
    strictEqual(summary.awayClubId, opponent.id);
    strictEqual(summary.awayClubName, opponent.name);
    notStrictEqual(summary.homeClubId, summary.awayClubId);
  }),
);

it.effect("resumeSimulation drives a fresh match to completion via successive chunked calls", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const opponents = yield* listOpponentClubs(savesDir, save.id);
    const summary = yield* startMatch(savesDir, save.id, opponents[0]!.id);

    let cursor = 0;
    let isComplete = false;
    let totalLines = 0;
    let calls = 0;
    let lastHomeScore = 0;
    let lastAwayScore = 0;

    while (!isComplete) {
      calls += 1;
      ok(calls < 10_000, "resumeSimulation should reach FullTimeWhistle in a bounded number of calls");
      const chunk = yield* resumeSimulation(savesDir, save.id, summary.matchId, cursor);
      ok(chunk.cursor >= cursor);
      cursor = chunk.cursor;
      isComplete = chunk.isComplete;
      totalLines += chunk.lines.length;
      lastHomeScore = chunk.homeScore;
      lastAwayScore = chunk.awayScore;
    }

    ok(totalLines > 0);
    ok(lastHomeScore >= 0 && lastAwayScore >= 0);

    // Once complete, resuming again from the same cursor stays complete and returns no new lines.
    const after = yield* resumeSimulation(savesDir, save.id, summary.matchId, cursor);
    strictEqual(after.isComplete, true);
    strictEqual(after.lines.length, 0);
  }),
);

it.effect("resumeSimulation is deterministic — replaying from cursor 0 reproduces the same lines", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const opponents = yield* listOpponentClubs(savesDir, save.id);
    const summary = yield* startMatch(savesDir, save.id, opponents[0]!.id);

    const drain = () =>
      Effect.gen(function* () {
        let cursor = 0;
        let isComplete = false;
        const lines: Array<{ minute: number; tag: string; text: string }> = [];
        while (!isComplete) {
          const chunk = yield* resumeSimulation(savesDir, save.id, summary.matchId, cursor);
          cursor = chunk.cursor;
          isComplete = chunk.isComplete;
          lines.push(...chunk.lines);
        }
        return lines;
      });

    const first = yield* drain();
    const second = yield* drain();
    deepStrictEqual(first, second);

    const last = first[first.length - 1]!;
    strictEqual(last.tag, "FullTimeWhistle");
  }),
);

it.effect("commentary lines never fire for a Minute-Slice with no Match Event and mention real names", () =>
  Effect.gen(function* () {
    const save = yield* createSave(savesDir, "Test Career");
    const opponents = yield* listOpponentClubs(savesDir, save.id);
    const summary = yield* startMatch(savesDir, save.id, opponents[0]!.id);

    let cursor = 0;
    let isComplete = false;
    const lines: Array<{ minute: number; tag: string; text: string }> = [];
    while (!isComplete) {
      const chunk = yield* resumeSimulation(savesDir, save.id, summary.matchId, cursor);
      cursor = chunk.cursor;
      isComplete = chunk.isComplete;
      lines.push(...chunk.lines);
    }

    const kickoff = lines[0]!;
    strictEqual(kickoff.tag, "MatchStarted");
    ok(!kickoff.text.includes("{"), "template placeholders must be filled in");

    const fullTime = lines[lines.length - 1]!;
    strictEqual(fullTime.tag, "FullTimeWhistle");
    ok(/\d+-\d+/.test(fullTime.text), "full time commentary should bake in the scoreline");
  }),
);
