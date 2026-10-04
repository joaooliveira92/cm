import { describe, expect, it } from "@effect/vitest";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { ClubId, PlayerId } from "@cm-clone/contracts";
import type { MatchEvent } from "@cm-clone/game-engine";
import { matchEventsOf, timelineRecorded } from "../../../src/main/match/timeline.js";

/**
 * cm-style-commentary 07: a committed match's stored timeline reads back every field commentary
 * uses. Before, a stored build-up event lost its creator, so a committed match's key passes could
 * no longer name the finisher; saves and goals now also name the goalkeeper.
 */
const home = ClubId.make("home");
const p = (id: string) => PlayerId.make(id);

const EVENTS: ReadonlyArray<MatchEvent> = [
  { _tag: "MatchStarted", seed: 1, homeClubId: home, awayClubId: ClubId.make("away") },
  { _tag: "Cross", minute: 4, half: 1, teamClubId: home, playerId: p("nine"), assistPlayerId: p("seven") },
  { _tag: "KeyPass", minute: 4, half: 1, teamClubId: home, playerId: p("seven"), chanceType: "cross" },
  { _tag: "ShotOnTarget", minute: 4, half: 1, teamClubId: home, playerId: p("nine"), chanceType: "cross", assistPlayerId: p("seven"), keeperId: p("gk") },
  { _tag: "FreeKick", minute: 7, half: 1, teamClubId: home, playerId: p("seven"), side: "left", deliveryType: "crossFar" },
  { _tag: "Goal", minute: 9, half: 1, teamClubId: home, playerId: p("nine"), chanceType: "cross", homeScore: 1, awayScore: 0, keeperId: p("gk") },
];

describe("a stored timeline", () => {
  it.effect("reads back the build-up assist and the goalkeeper", () =>
    Effect.gen(function* () {
      const recorded = JSON.parse(JSON.stringify(timelineRecorded(EVENTS, [])));
      const events = yield* matchEventsOf([{ seq: 2, ...recorded }]);
      expect(events).toEqual(EVENTS);
    }).pipe(Effect.provide(SqliteClient.layer({ filename: ":memory:" }))),
  );
});
