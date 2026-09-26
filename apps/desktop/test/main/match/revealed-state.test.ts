import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import type { CommentaryLineView, MatchId, MatchSummary, ResumeSimulationView, SaveId } from "@cm-clone/contracts";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { afterEach, beforeEach } from "vitest";
import { resumeSimulation, submitMatchCommand } from "../../../src/main/match/index.js";
import { pitchAsOf } from "../../../src/main/match/pitch.js";
import { MATCH_STREAM_TYPE, deriveMatchEvents, matchStartedOf } from "../../../src/main/match/stream.js";
import { loadStreamEvents, withExistingSave } from "../../../src/main/season/decider.js";
import { atFirstFixture, humanClubOf, startSeededMatch } from "./seededMatch.js";

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-revealed-state-test-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

/**
 * A match seed on the first Fixture of `WORLD_SEED` where the opening chunk (lines 0-8, up to half
 * time) holds a Goal at line 1, and the second chunk (lines 9-18, to full time) opens with a red
 * card for the human club at line 9 and holds two Injuries. A score or head-count read from the end
 * of the chunk would show each before its line. The tests re-check the property from the Commentary
 * Lines and name this constant when it no longer holds.
 */
const SEED = 550;
const GOAL_LINE = 1;
const HALF_TIME_LINE = 8;
const RED_CARD_LINE = 9;

const repin = `repin SEED (${SEED})`;

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

const humanCount = (view: ResumeSimulationView, summary: MatchSummary): number =>
  summary.isHome ? view.homeOnPitchCount : view.awayOnPitchCount;

const humanPitchSize = (view: ResumeSimulationView, summary: MatchSummary): number =>
  (summary.isHome ? view.homePitch : view.awayPitch).onPitch.length;

const goals = (view: ResumeSimulationView): number => view.homeScore + view.awayScore;

const seededMatch = Effect.gen(function* () {
  const { save, fixtureId } = yield* atFirstFixture(savesDir);
  const match = yield* startSeededMatch(savesDir, save.id, fixtureId, SEED);
  const lines = yield* drainLines(save.id, match.matchId);
  strictEqual(lines[GOAL_LINE]?.tag, "Goal", repin);
  strictEqual(lines.filter((line) => line.tag === "Goal").length, 1, repin);
  strictEqual(lines[HALF_TIME_LINE]?.tag, "HalfTimeReached", repin);
  strictEqual(lines[RED_CARD_LINE]?.tag, "RedCard", repin);
  ok(lines[RED_CARD_LINE]!.text.includes(match.isHome ? match.homeClubName : match.awayClubName), `the red card is the human club's — ${repin}`);
  return { save, match, lines };
});

it.effect("a response's score counts only the goals revealed, not those later in its chunk", () =>
  Effect.gen(function* () {
    const { save, match, lines } = yield* seededMatch;
    const at = (cursor: number, revealedEvents: number | null) =>
      resumeSimulation(savesDir, save.id, match.matchId, cursor, revealedEvents);

    // The opening chunk carries the goal's line, but the goal is not yet revealed.
    const opening = yield* at(0, GOAL_LINE);
    ok(opening.lines.length > GOAL_LINE, `the opening chunk holds the goal line — ${repin}`);
    strictEqual(goals(opening), 0, "the score does not run ahead of the goal's line");

    const afterGoal = yield* at(0, GOAL_LINE + 1);
    strictEqual(goals(afterGoal), 1);

    // Null is the whole match; every line revealed reads the same.
    const whole = yield* at(0, null);
    const allRevealed = yield* at(0, lines.length);
    deepStrictEqual([whole.homeScore, whole.awayScore], [allRevealed.homeScore, allRevealed.awayScore]);
    deepStrictEqual([whole.homeScore, whole.awayScore], [afterGoal.homeScore, afterGoal.awayScore]);

    // A command response reads the same cut. A bring-off of a player not in the squad changes nothing.
    const commanded = yield* submitMatchCommand(savesDir, save.id, match.matchId, 0, GOAL_LINE, 1, false, {
      _tag: "ForceOff",
      clubId: humanClubOf(match),
      playerId: "not-a-player" as never,
    });
    strictEqual(commanded.lines[GOAL_LINE]?.tag, "Goal", `the no-op command leaves the goal in place — ${repin}`);
    strictEqual(goals(commanded), 0, "a command response does not show the unrevealed goal either");
  }),
);

it.effect("a response's on-pitch count reflects a red card only once revealed, whatever chunk it reads", () =>
  Effect.gen(function* () {
    const { save, match } = yield* seededMatch;

    // Reading the second chunk, which opens with the red card, before revealing it.
    const beforeRed = yield* resumeSimulation(savesDir, save.id, match.matchId, RED_CARD_LINE, RED_CARD_LINE);
    ok(beforeRed.lines[0]?.tag === "RedCard", `the chunk holds the red card — ${repin}`);
    strictEqual(humanCount(beforeRed, match), 11);
    strictEqual(humanCount(beforeRed, match), humanPitchSize(beforeRed, match));

    const afterRed = yield* resumeSimulation(savesDir, save.id, match.matchId, RED_CARD_LINE, RED_CARD_LINE + 1);
    strictEqual(humanCount(afterRed, match), 10);
    strictEqual(humanCount(afterRed, match), humanPitchSize(afterRed, match));

    const opponent = match.isHome ? afterRed.awayOnPitchCount : afterRed.homeOnPitchCount;
    strictEqual(opponent, 11);
  }),
);

it.effect("a chunk's injuries are its own Injury lines, one per line in order, revealed or not", () =>
  Effect.gen(function* () {
    const { save, match } = yield* seededMatch;

    // Injuries travel with the lines they belong to: the renderer pairs them and reveals both together.
    const opening = yield* resumeSimulation(savesDir, save.id, match.matchId, 0, 0);
    strictEqual(opening.lines.filter((line) => line.tag === "Injury").length, 0, repin);
    deepStrictEqual(opening.injuries, []);
    deepStrictEqual(opening.injuredClubIds, []);

    const second = yield* resumeSimulation(savesDir, save.id, match.matchId, RED_CARD_LINE, RED_CARD_LINE);
    const injuryLines = second.lines.filter((line) => line.tag === "Injury");
    ok(injuryLines.length === 2, `the second chunk holds two Injury lines — ${repin}`);
    deepStrictEqual(second.injuries.map((injury) => injury.minute), injuryLines.map((line) => line.minute));
  }),
);

it.effect("the pitch-derived head-count agrees with the engine's own count at full time", () =>
  Effect.gen(function* () {
    const { save, match } = yield* atFirstFixture(savesDir).pipe(
      Effect.flatMap(({ save, fixtureId }) =>
        startSeededMatch(savesDir, save.id, fixtureId, SEED).pipe(Effect.map((match) => ({ save, match }))),
      ),
    );
    const stream = yield* withExistingSave(savesDir, save.id, (filename) =>
      loadStreamEvents(MATCH_STREAM_TYPE, match.matchId).pipe(
        Effect.provide(SqliteClient.layer({ filename, readonly: true })),
        Effect.scoped,
      ),
    );
    const started = matchStartedOf(stream);
    let shorthanded = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const reseeded = [{ ...stream[0]!, payload: { ...started, seed } }];
      const { events, counts } = deriveMatchEvents(reseeded);
      const final = counts[counts.length - 1]!;
      const home = pitchAsOf(started.homeSetup, events, [], null).onPitch.length;
      const away = pitchAsOf(started.awaySetup, events, [], null).onPitch.length;
      deepStrictEqual([home, away], [final.homeCount, final.awayCount], `seed ${seed}`);
      if (home < 11 || away < 11) shorthanded += 1;
    }
    ok(shorthanded > 0, "some seeds end a side short, so the comparison covers a drop");
  }),
);
