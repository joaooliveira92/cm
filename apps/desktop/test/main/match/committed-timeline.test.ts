import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, notDeepStrictEqual, ok, strictEqual } from "node:assert";
import type { MatchId, SaveId } from "@cm-clone/contracts";
import * as GameEngine from "@cm-clone/game-engine";
import { Effect } from "effect";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { afterEach, beforeEach, vi } from "vitest";
import { getMatchRatings, getMatchReport, getMatchStatistics, getPostMatchSummary, resumeSimulation } from "../../../src/main/match/index.js";
import { deriveStreamEvents } from "../../../src/main/match/aiPreferences.js";
import { MATCH_TIMELINE_TAG } from "../../../src/main/match/timeline.js";
import { commitMatchday } from "../../../src/main/season/commitMatchday.js";
import { loadStreamEvents, type StreamEvent } from "../../../src/main/season/decider.js";
import { atFirstFixture, startSeededMatch } from "./seededMatch.js";

/**
 * A committed match's stored timeline is immune to an engine-rule change, and a match that is not
 * committed is not (ticket group-g 31). The determinism tests cannot express this: they prove the
 * same engine gives the same answer, not that a different engine leaves history alone.
 *
 * The "rule change" is real engine output altered after the commit: with `rule.changed` on, every
 * event the simulation produces happens one minute later.
 */
const rule = vi.hoisted(() => ({ changed: false }));

vi.mock("@cm-clone/game-engine", async (importOriginal) => {
  const engine = await importOriginal<typeof GameEngine>();
  return {
    ...engine,
    deriveMatchEvents: (...args: Parameters<typeof engine.deriveMatchEvents>) => {
      const result = engine.deriveMatchEvents(...args);
      if (!rule.changed) return result;
      const events = result.events.map((event): GameEngine.MatchEvent =>
        event._tag === "MatchStarted" ? event : { ...event, minute: event.minute + 1 },
      );
      return { ...result, events };
    },
  };
});

const ANY_MATCH_SEED = 7;

let savesDir: string;

beforeEach(() => {
  rule.changed = false;
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-timeline-"));
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

const matchStream = (saveId: SaveId, matchId: MatchId) =>
  loadStreamEvents(GameEngine.MATCH_STREAM_TYPE, matchId).pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`), readonly: true })),
    Effect.scoped,
  );

/** What the engine derives for a stream now, under the AI preferences every match reader passes. */
const derivedNow = (saveId: SaveId, stream: ReadonlyArray<StreamEvent>) =>
  deriveStreamEvents(stream).pipe(
    Effect.map((derived) => derived.events),
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`), readonly: true })),
    Effect.scoped,
  );

it.effect("a committed match keeps its timeline through an engine-rule change; a fresh derivation does not", () =>
  Effect.gen(function* () {
    const { save, fixtureId } = yield* atFirstFixture(savesDir);
    const match = yield* startSeededMatch(savesDir, save.id, fixtureId, ANY_MATCH_SEED);
    yield* drain(save.id, match.matchId);
    yield* commitMatchday(savesDir, save.id, fixtureId);

    // Committing stored exactly one timeline, equal to what the engine derived at the time.
    const stream = yield* matchStream(save.id, match.matchId);
    const recorded = stream.filter((row) => row.tag === MATCH_TIMELINE_TAG);
    strictEqual(recorded.length, 1);
    const derivedAtCommit = yield* derivedNow(save.id, stream);
    deepStrictEqual((recorded[0]!.payload as { events: unknown }).events, derivedAtCommit);
    ok(derivedAtCommit.some((event) => event._tag !== "MatchStarted"), "the match produced events to move");

    const report = yield* getMatchReport(savesDir, save.id, match.matchId);
    const summary = yield* getPostMatchSummary(savesDir, save.id, match.matchId);
    const statistics = yield* getMatchStatistics(savesDir, save.id, match.matchId, null);
    const ratings = yield* getMatchRatings(savesDir, save.id, match.matchId, null);

    rule.changed = true;

    // The engine now answers differently for the very same seed and command journal...
    notDeepStrictEqual(yield* derivedNow(save.id, stream), derivedAtCommit);
    // ...and not one committed read moved.
    deepStrictEqual(yield* getMatchReport(savesDir, save.id, match.matchId), report);
    deepStrictEqual(yield* getPostMatchSummary(savesDir, save.id, match.matchId), summary);
    deepStrictEqual(yield* getMatchStatistics(savesDir, save.id, match.matchId, null), statistics);
    deepStrictEqual(yield* getMatchRatings(savesDir, save.id, match.matchId, null), ratings);

    // A repeat commit is answered from the fixture row and records nothing further.
    yield* commitMatchday(savesDir, save.id, fixtureId);
    const after = yield* matchStream(save.id, match.matchId);
    strictEqual(after.filter((row) => row.tag === MATCH_TIMELINE_TAG).length, 1);
  }),
);
