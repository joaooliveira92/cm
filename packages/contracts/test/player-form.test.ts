import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { AppRpcs } from "../src/rpc.js";
import { PlayerFormView } from "../src/index.js";

/**
 * Player Form (match-screen ticket 19/20): the request carries a nullable Team selector choice, and
 * the view round-trips a played row with the recorded-defending counts, a row with none, and a
 * season block whose counters are nullable.
 */
const wire = {
  playerId: "p1",
  clubs: [{ clubId: "club_eng_1_01", clubName: "Castlemere United" }],
  selectedClubId: "club_eng_1_01",
  games: [
    {
      fixtureId: 7,
      date: "2026-08-10",
      opponentClubName: "Northgate Athletic",
      isHome: true,
      state: "played",
      result: "win",
      card: "none",
      started: true,
      cameOnMinute: null,
      wentOffMinute: null,
      keyPasses: 2,
      offsides: 0,
      fouls: 1,
      assists: 1,
      shots: 3,
      shotsOnTarget: 2,
      saves: 0,
      goals: 1,
      tacklesWon: 2,
      tacklesAttempted: 3,
      headers: 1,
      headersWon: 1,
      interceptions: 2,
      runs: 1,
      foulsSuffered: 2,
      rating: 7.8,
      matchId: "7",
    },
    {
      fixtureId: 8,
      date: "2026-08-17",
      opponentClubName: "Wanderers",
      isHome: false,
      state: "notSelected",
      result: "draw",
      card: "none",
      started: false,
      cameOnMinute: null,
      wentOffMinute: null,
      keyPasses: 0,
      offsides: 0,
      fouls: 0,
      assists: 0,
      shots: 0,
      shotsOnTarget: 0,
      saves: 0,
      goals: 0,
      tacklesWon: null,
      tacklesAttempted: null,
      headers: null,
      headersWon: null,
      interceptions: null,
      runs: null,
      foulsSuffered: null,
      rating: null,
      matchId: "8",
    },
  ],
  formRatings: [7.8],
  goalkeeper: false,
  season: [
    {
      kind: "overall",
      label: "Overall",
      starts: 1,
      subs: 0,
      goals: 1,
      assists: 1,
      mom: 1,
      yellowCards: 0,
      redCards: 0,
      shots: 3,
      shotsOnTarget: 2,
      fouls: 1,
      tackles: 3,
      foulsSuffered: 2,
      averageRating: 7.8,
    },
    {
      kind: "league",
      label: "League",
      starts: 0,
      subs: 0,
      goals: 0,
      assists: 0,
      mom: 0,
      yellowCards: 0,
      redCards: 0,
      shots: 0,
      shotsOnTarget: 0,
      fouls: 0,
      tackles: null,
      foulsSuffered: null,
      averageRating: null,
    },
  ],
};

describe("Player Form (map tickets 19/20)", () => {
  it("PlayerFormView round-trips the nullable defending counts and the season block", () => {
    expect(Schema.encodeSync(PlayerFormView)(Schema.decodeUnknownSync(PlayerFormView)(wire))).toEqual(wire);
  });

  it("the request accepts a null Team selector choice and a set one", () => {
    const decode = Schema.decodeUnknownSync(AppRpcs.getPlayerForm.payload);
    expect(decode({ saveId: "s1", playerId: "p1", clubId: null })).toEqual({
      saveId: "s1",
      playerId: "p1",
      clubId: null,
    });
    expect(decode({ saveId: "s1", playerId: "p1", clubId: "club_eng_1_01" })).toEqual({
      saveId: "s1",
      playerId: "p1",
      clubId: "club_eng_1_01",
    });
  });

  it("rejects a row state the view does not list", () => {
    const games = [{ ...wire.games[0], state: "benched" }];
    expect(() => Schema.decodeUnknownSync(PlayerFormView)({ ...wire, games })).toThrow();
  });
});
