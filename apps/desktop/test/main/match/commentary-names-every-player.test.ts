import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import type { CommentaryLineView, MatchId, SaveId } from "@cm-clone/contracts";
import { Effect } from "effect";
import { afterEach, beforeEach, expect } from "vitest";
import { resumeSimulation } from "../../../src/main/match/index.js";
import { atFirstFixture, startSeededMatch } from "./seededMatch.js";

/**
 * cm-style-commentary 14: a Match day screenshot read "Jack Wilson is one on one with a player". The
 * keeper, like a chance's creator and a corner's taker, was named in commentary but never loaded,
 * because only each event's main player was. Every name a whole seeded match mentions must resolve.
 */
let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-commentary-names-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const drainLines = (saveId: SaveId, matchId: MatchId) =>
  Effect.gen(function* () {
    const lines: Array<CommentaryLineView> = [];
    let cursor = 0;
    let isComplete = false;
    while (!isComplete) {
      const chunk = yield* resumeSimulation(savesDir, saveId, matchId, cursor, null);
      lines.push(...chunk.lines);
      cursor = chunk.cursor;
      isComplete = chunk.isComplete;
    }
    return lines;
  });

for (const seed of [1301, 7, 42]) {
  it.effect(
    `names every player and club a whole match's commentary mentions (seed ${seed})`,
    () =>
      Effect.gen(function* () {
        const { save, fixtureId } = yield* atFirstFixture(savesDir);
        const match = yield* startSeededMatch(savesDir, save.id, fixtureId, seed);
        const lines = yield* drainLines(save.id, match.matchId);
        expect(lines.some((line) => line.tag === "ShotOnTarget" || line.tag === "Goal")).toBe(true);
        for (const line of lines) {
          expect(line.text, line.tag).not.toMatch(/\ba player\b|Unknown side|\{\w+\}/);
        }
      }),
    120_000,
  );
}
