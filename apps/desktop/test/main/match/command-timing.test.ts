import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "@effect/vitest";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import type { MatchId, SaveId } from "@cm-clone/contracts";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { afterEach, beforeEach } from "vitest";
import { submitMatchCommand } from "../../../src/main/match/index.js";
import { MATCH_STREAM_TYPE, deriveMatchEvents, type PersistedForcedOff } from "../../../src/main/match/stream.js";
import { loadStreamEvents } from "../../../src/main/season/decider.js";
import { atFirstFixture, humanClubOf, startSeededMatch } from "./seededMatch.js";

/**
 * group-g-match-day ticket 20: a live command never re-simulates play the manager has been shown. The
 * renderer stamps a command at the minute after the last revealed event; main holds to that whatever
 * a caller sends, so a command stamped at the revealed minute itself is journaled a minute later.
 */

let savesDir: string;

beforeEach(() => {
  savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-command-timing-"));
});

afterEach(() => rm(savesDir, { recursive: true, force: true }));

const matchStream = (saveId: SaveId, matchId: MatchId) =>
  loadStreamEvents(MATCH_STREAM_TYPE, matchId).pipe(
    Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${saveId}.sqlite`), readonly: true })),
    Effect.scoped,
  );

it.effect("a command stamped at the revealed minute is journaled at the next one, and every revealed event survives it", () =>
  Effect.gen(function* () {
    const { save, fixtureId } = yield* atFirstFixture(savesDir);
    const match = yield* startSeededMatch(savesDir, save.id, fixtureId, 7);
    const clubId = humanClubOf(match);
    const before = deriveMatchEvents(yield* matchStream(save.id, match.matchId)).events;

    // Reveal up to and including the human club's first event that names one of its players, then
    // bring that player off, stamped with the minute that event is shown at.
    const index = before.findIndex((event) => "playerId" in event && event.teamClubId === clubId);
    ok(index > 0, "the seeded match gives the human club an event that names a player");
    const shown = before[index]!;
    ok("playerId" in shown);
    const revealedEvents = index + 1;

    yield* submitMatchCommand(savesDir, save.id, match.matchId, 0, revealedEvents, shown.minute, false, {
      _tag: "ForceOff",
      clubId,
      playerId: shown.playerId,
    });

    const stream = yield* matchStream(save.id, match.matchId);
    const journaled = stream.at(-1)!.payload as PersistedForcedOff;
    strictEqual(journaled.minute, shown.minute + 1);
    deepStrictEqual(deriveMatchEvents(stream).events.slice(0, revealedEvents), before.slice(0, revealedEvents));
  }),
);
