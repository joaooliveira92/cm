import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it } from "@effect/vitest";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import type { MatchId, SaveId } from "@cm-clone/contracts";
import * as GameEngine from "@cm-clone/game-engine";
import { Effect } from "effect";
import { SqliteClient } from "@effect/sql-sqlite-node";
import type { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach, vi } from "vitest";
import { getTactics } from "../../../src/main/club/index.js";
import { resumeSimulation, submitMatchCommand } from "../../../src/main/match/index.js";
import { deriveStreamEvents } from "../../../src/main/match/aiPreferences.js";
import { MATCH_TIMELINE_TAG, matchTimelineOf } from "../../../src/main/match/timeline.js";
import { commitMatchday } from "../../../src/main/season/commitMatchday.js";
import { loadStreamEvents, type StreamEvent } from "../../../src/main/season/decider.js";
import { atFirstFixture, humanClubOf, startSeededMatch } from "./seededMatch.js";

/**
 * Ticket 04: the committed timeline carries the Lineup Journal additively, and a committed read
 * materialises the run's frames from it without simulating. A stored timeline that predates the
 * journal has none and re-derives once, the fallback an old save takes.
 */
const rule = vi.hoisted(() => ({ forbidDerive: false }));

vi.mock("@cm-clone/game-engine", async (importOriginal) => {
  const engine = await importOriginal<typeof GameEngine>();
  return {
    ...engine,
    deriveMatchEvents: (...args: Parameters<typeof engine.deriveMatchEvents>) => {
      if (rule.forbidDerive) throw new Error("deriveMatchEvents must not run for a stored timeline with a journal");
      return engine.deriveMatchEvents(...args);
    },
  };
});

/** Injury- and red-card-free, so the manager's substitution at minute 2 always finds its player on. */
const INJURY_FREE_SEED = 510;

let savesDir: string;

beforeEach(() => {
  rule.forbidDerive = false;
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-committed-lineup-"));
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

/** Run an effect that needs the save's DB, as the committed readers do. */
const withSave = <A, E>(saveId: SaveId, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`), readonly: true })),
    Effect.scoped,
  );

/** A career at its first Fixture, a match played with one manager substitution, committed. */
const committedMatch = () =>
  Effect.gen(function* () {
    const { save, fixtureId } = yield* atFirstFixture(savesDir);
    const match = yield* startSeededMatch(savesDir, save.id, fixtureId, INJURY_FREE_SEED);
    const tactic = (yield* getTactics(savesDir, save.id)).tactic;
    ok(tactic !== null, "a seeded match starts with a Tactic set (`atFirstFixture`)");
    const outPlayerId = tactic.assignments[0]!;
    const inPlayerId = tactic.bench[0]!;
    const response = yield* submitMatchCommand(savesDir, save.id, match.matchId, 0, null, 2, false, {
      _tag: "MakeSubstitution",
      clubId: humanClubOf(match),
      outPlayerId,
      inPlayerId,
    });
    ok(response.substitutionApplied, "the manager's substitution took effect");

    yield* drain(save.id, match.matchId);
    yield* commitMatchday(savesDir, save.id, fixtureId);
    return { save, match };
  });

it.effect("a committed match stores its Lineup Journal and reads back the run's frames without simulating", () =>
  Effect.gen(function* () {
    const { save, match } = yield* committedMatch();

    const stream = yield* matchStream(save.id, match.matchId);
    const recorded = stream.filter((row) => row.tag === MATCH_TIMELINE_TAG);
    strictEqual(recorded.length, 1);
    const payload = recorded[0]!.payload as { readonly events: unknown; readonly lineup: unknown };
    // Additive JSON in the existing column: the payload grew a `lineup` field, nothing else.
    deepStrictEqual(Object.keys(payload).sort(), ["events", "lineup"]);
    ok(Array.isArray(payload.lineup), "the Lineup Journal is stored as an array");
    ok((payload.lineup as ReadonlyArray<unknown>).length > 0, "the manager's substitution was journaled");

    const live = yield* withSave(save.id, deriveStreamEvents(stream));
    const read = yield* withSave(save.id, matchTimelineOf(stream));
    expect(read.events).toEqual(live.events);
    expect(read.journal).toEqual(live.journal);
    expect(read.frames).toEqual(live.frames);

    // With the journal present, a committed read never reaches the simulation.
    rule.forbidDerive = true;
    const reread = yield* withSave(save.id, matchTimelineOf(stream));
    expect(reread.frames).toEqual(live.frames);
    expect(reread.journal).toEqual(live.journal);
    rule.forbidDerive = false;
  }),
);

it.effect("a stored timeline without the journal re-derives once and reads identically", () =>
  Effect.gen(function* () {
    const { save, match } = yield* committedMatch();

    const stream = yield* matchStream(save.id, match.matchId);
    const live = yield* withSave(save.id, deriveStreamEvents(stream));
    // An old save's timeline: the events, with no journal field at all.
    const legacy = stream.map((row): StreamEvent =>
      row.tag === MATCH_TIMELINE_TAG
        ? { seq: row.seq, tag: row.tag, payload: { events: (row.payload as { readonly events: unknown }).events } }
        : row,
    );
    const read = yield* withSave(save.id, matchTimelineOf(legacy));
    expect(read.events).toEqual(live.events);
    expect(read.journal).toEqual(live.journal);
    expect(read.frames).toEqual(live.frames);
  }),
);
