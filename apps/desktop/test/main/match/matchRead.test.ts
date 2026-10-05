import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { ok, strictEqual } from "node:assert";
import type { MatchId, SaveId } from "@cm-clone/contracts";
import { Effect } from "effect";
import { SqliteClient } from "@effect/sql-sqlite-node";
import type { SqlClient } from "effect/unstable/sql/SqlClient";
import { afterEach, beforeEach } from "vitest";
import { loadMatchRead, loadMatchReadIfPresent, loadMatchReadOf } from "../../../src/main/match/matchRead.js";
import { resumeSimulation } from "../../../src/main/match/index.js";
import { commitMatchday } from "../../../src/main/season/commitMatchday.js";
import { atFirstFixture, startSeededMatch } from "./seededMatch.js";

/**
 * The shared match-read seam: which match a read loads, its kickoff snapshot, and the failure when a
 * named match keeps no stream. Every save-scoped reader delegates here, so these invariants are
 * pinned once rather than per reader.
 */
const ANY_MATCH_SEED = 7;

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-match-read-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const withSave = <A, E>(saveId: SaveId, effect: Effect.Effect<A, E, SqlClient>) =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`) })),
    Effect.scoped,
  );

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

it.effect("a named read of a match with no stream fails MatchNotFoundError", () =>
  Effect.gen(function* () {
    const { save } = yield* atFirstFixture(savesDir);
    const error = yield* withSave(
      save.id,
      Effect.flip(loadMatchReadOf("no-such-match" as MatchId)),
    );
    strictEqual(error._tag, "MatchNotFoundError");
  }),
);

it.effect("a named read that may be absent returns null for a fixture with no stream", () =>
  Effect.gen(function* () {
    const { save } = yield* atFirstFixture(savesDir);
    const read = yield* withSave(
      save.id,
      loadMatchReadIfPresent("no-such-match" as MatchId, () => "x"),
    );
    strictEqual(read, null);
  }),
);

it.effect("the just-played read is null before a match is played, then names the committed match", () =>
  Effect.gen(function* () {
    const { save, fixtureId } = yield* atFirstFixture(savesDir);

    const before = yield* withSave(save.id, loadMatchRead(null));
    strictEqual(before, null, "no match has been played yet");

    const match = yield* startSeededMatch(savesDir, save.id, fixtureId, ANY_MATCH_SEED);
    yield* drain(save.id, match.matchId);
    yield* commitMatchday(savesDir, save.id, fixtureId);

    const read = yield* withSave(save.id, loadMatchRead(null));
    ok(read !== null, "the just-played match now resolves");
    strictEqual(read.matchId, match.matchId);
    ok(read.stream.length > 0, "the read carries the match stream");
    ok(read.started.homeSetup.squad.length > 0, "the read carries the kickoff snapshot");
  }),
);
