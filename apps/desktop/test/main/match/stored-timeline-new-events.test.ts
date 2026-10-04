import { describe, expect, it } from "@effect/vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { ClubId, PlayerId } from "@cm-clone/contracts";
import type { MatchEvent } from "@cm-clone/game-engine";
import { matchEventsOf, timelineRecorded } from "../../../src/main/match/timeline.js";

/**
 * map ticket 12/13: the stored-timeline union decodes the four events the engine started recording,
 * and `Foul`'s optional `fouledPlayerId`, so a committed match's account of how it happened survives
 * a read-back. A timeline stored before the new events still decodes.
 */
const home = ClubId.make("home");
const p = (id: string) => PlayerId.make(id);

const NEW_EVENTS: ReadonlyArray<MatchEvent> = [
  { _tag: "MatchStarted", seed: 1, homeClubId: home, awayClubId: ClubId.make("away") },
  { _tag: "Tackle", minute: 5, half: 1, teamClubId: home, playerId: p("dc") },
  { _tag: "Interception", minute: 8, half: 1, teamClubId: home, playerId: p("dm") },
  { _tag: "HeaderDuel", minute: 12, half: 1, teamClubId: home, winnerId: p("nine"), loserId: p("their-dc"), attacking: true },
  { _tag: "Foul", minute: 15, half: 1, teamClubId: home, playerId: p("dc"), isYellowCard: false, fouledPlayerId: p("nine") },
  { _tag: "PossessionTally", minute: 15, half: 1, homeSlices: 9, awaySlices: 6 },
];

const read = (events: ReadonlyArray<MatchEvent>) =>
  Effect.gen(function* () {
    const recorded = JSON.parse(JSON.stringify(timelineRecorded(events)));
    return yield* matchEventsOf([{ seq: 2, ...recorded }]);
  }).pipe(Effect.provide(SqliteClient.layer({ filename: ":memory:" })));

describe("the stored-timeline union", () => {
  it.effect("reads back every new tag and the optional fouled player", () =>
    Effect.gen(function* () {
      expect(yield* read(NEW_EVENTS)).toEqual(NEW_EVENTS);
    }),
  );

  it.effect("reads a Foul with no recorded victim", () =>
    Effect.gen(function* () {
      const events: ReadonlyArray<MatchEvent> = [
        NEW_EVENTS[0]!,
        { _tag: "Foul", minute: 15, half: 1, teamClubId: home, playerId: p("dc"), isYellowCard: false },
      ];
      expect(yield* read(events)).toEqual(events);
    }),
  );

  it.effect("still decodes a timeline stored before the new events, with no possession tally", () =>
    Effect.gen(function* () {
      const old: ReadonlyArray<MatchEvent> = [
        NEW_EVENTS[0]!,
        { _tag: "Goal", minute: 9, half: 1, teamClubId: home, playerId: p("nine"), homeScore: 1, awayScore: 0, chanceType: "cross" },
      ];
      expect(yield* read(old)).toEqual(old);
    }),
  );
});
