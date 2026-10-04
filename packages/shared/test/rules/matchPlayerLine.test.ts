import { describe, expect, it } from "vitest";
import {
  EMPTY_MATCH_PLAYER_LINE_COUNTS,
  foldMatchPlayerLineCounts,
  type MatchPlayerLineCounts,
  type MatchPlayerLineEvent,
} from "../../src/rules/matchPlayerLine.js";

const event = (tag: string, extra: Partial<MatchPlayerLineEvent> = {}): MatchPlayerLineEvent => ({
  _tag: tag,
  minute: 10,
  ...extra,
});

const fold = (
  events: ReadonlyArray<MatchPlayerLineEvent>,
  starters: ReadonlyArray<string> = [],
  revealedEvents: number | null = null,
) => foldMatchPlayerLineCounts(new Set(starters), events, revealedEvents);

const line = (events: ReadonlyArray<MatchPlayerLineEvent>, playerId: string, starters: ReadonlyArray<string> = []): MatchPlayerLineCounts =>
  fold(events, starters).get(playerId) ?? EMPTY_MATCH_PLAYER_LINE_COUNTS;

describe("foldMatchPlayerLineCounts — the Match Player Line, folded from recorded events", () => {
  it("counts a goal as a shot, a shot on target and a goal, and an assist only when the creator differs from the scorer", () => {
    const solo = line([event("Goal", { playerId: "a", assistPlayerId: "a" })], "a");
    expect(solo).toMatchObject({ goals: 1, shots: 1, shotsOnTarget: 1, assists: 0 });

    const withCreator = fold([event("Goal", { playerId: "a", assistPlayerId: "b" })]);
    expect(withCreator.get("a")).toMatchObject({ goals: 1, assists: 0 });
    expect(withCreator.get("b")).toMatchObject({ assists: 1, goals: 0 });
  });

  it("counts a penalty goal as a shot, a shot on target and a goal", () => {
    const events = [
      event("Penalty", { playerId: "a" }),
      event("Goal", { playerId: "a" }),
    ];
    expect(line(events, "a")).toMatchObject({ goals: 1, shots: 1, shotsOnTarget: 1 });
  });

  it("credits a keeper with a save on a shot on target, and its creator with a key pass and no assist", () => {
    const events = [
      event("ShotOnTarget", { playerId: "finisher", keeperId: "keeper", assistPlayerId: "creator" }),
      event("KeyPass", { playerId: "creator" }),
    ];
    const lines = fold(events);
    expect(lines.get("keeper")).toMatchObject({ saves: 1 });
    expect(lines.get("finisher")).toMatchObject({ shots: 1, shotsOnTarget: 1 });
    expect(lines.get("creator")).toMatchObject({ keyPasses: 1, assists: 0 });
  });

  it("counts a missed shot as a shot only", () => {
    expect(line([event("ShotMissed", { playerId: "a" })], "a")).toMatchObject({ shots: 1, shotsOnTarget: 0, goals: 0 });
  });

  it("counts a key pass, but not a self-created chance", () => {
    // The chance event precedes the KeyPass and names the same player as finisher: no key pass.
    const selfCreated = [
      event("ThroughBall", { playerId: "a" }),
      event("KeyPass", { playerId: "a" }),
    ];
    expect(line(selfCreated, "a").keyPasses).toBe(0);

    // The chance's finisher differs from the creator named on the KeyPass: it counts.
    const created = [
      event("ThroughBall", { playerId: "finisher" }),
      event("KeyPass", { playerId: "creator" }),
    ];
    expect(line(created, "creator").keyPasses).toBe(1);
  });

  it("counts fouls for the fouler and offsides for the flagged player", () => {
    const events = [event("Foul", { playerId: "a" }), event("Offside", { playerId: "b" })];
    expect(line(events, "a").fouls).toBe(1);
    expect(line(events, "b").offsides).toBe(1);
  });

  it("counts fouls suffered for the player brought down, only where the victim is recorded", () => {
    const named = fold([event("Foul", { playerId: "a", fouledPlayerId: "b" })]);
    expect(named.get("b")).toMatchObject({ foulsSuffered: 1, fouls: 0 });
    expect(named.get("a")).toMatchObject({ fouls: 1, foulsSuffered: 0 });

    const unnamed = fold([event("Foul", { playerId: "a" })]);
    expect(unnamed.get("a")).toMatchObject({ fouls: 1, foulsSuffered: 0 });
  });

  it("counts a credited tackle and interception for the defending player", () => {
    const events = [
      event("Tackle", { playerId: "d" }),
      event("Interception", { playerId: "d" }),
    ];
    expect(line(events, "d")).toMatchObject({ tacklesWon: 1, interceptions: 1 });
  });

  it("derives tackles attempted as tackles won plus fouls committed", () => {
    const events = [
      event("Tackle", { playerId: "d" }),
      event("Tackle", { playerId: "d" }),
      event("Foul", { playerId: "d" }),
      event("Foul", { playerId: "d" }),
      event("Foul", { playerId: "d" }),
    ];
    expect(line(events, "d")).toMatchObject({ tacklesWon: 2, fouls: 3, tacklesAttempted: 5 });
  });

  it("counts a header duel attempted for both players and won for the winner", () => {
    const events = [event("HeaderDuel", { winnerId: "w", loserId: "l" })];
    const lines = fold(events);
    expect(lines.get("w")).toMatchObject({ headers: 1, headersWon: 1 });
    expect(lines.get("l")).toMatchObject({ headers: 1, headersWon: 0 });
  });

  it("counts a run for the RunWithBall creator, not its finisher", () => {
    const events = [event("RunWithBall", { playerId: "finisher", assistPlayerId: "creator" })];
    const lines = fold(events);
    expect(lines.get("creator")).toMatchObject({ runs: 1 });
    expect(lines.get("finisher")).toBeUndefined();

    const solo = fold([event("RunWithBall", { playerId: "finisher" })]);
    expect(solo.get("finisher")).toBeUndefined();
  });

  it("counts a yellow and a red card so a red glyph can win", () => {
    const events = [event("YellowCard", { playerId: "a" }), event("RedCard", { playerId: "a" })];
    expect(line(events, "a")).toMatchObject({ yellowCards: 1, redCards: 1 });
  });

  it("writes on and off minutes for a real substitution", () => {
    const events = [event("Substitution", { minute: 53, inPlayerId: "sub", outPlayerId: "starter" })];
    const lines = fold(events, ["starter"]);
    expect(lines.get("sub")).toMatchObject({ cameOnMinute: 53, wentOffMinute: null });
    expect(lines.get("starter")).toMatchObject({ cameOnMinute: null, wentOffMinute: 53 });
  });

  it("writes nothing for a goalkeeper stand-in, a forced substitution bringing on someone already on", () => {
    const events = [event("Substitution", { minute: 70, inPlayerId: "outfielder", outPlayerId: "keeper" })];
    const lines = fold(events, ["keeper", "outfielder"]);
    expect(lines.get("outfielder")).toBeUndefined();
    expect(lines.get("keeper")).toBeUndefined();
  });

  it("cuts a live match at the revealed position and leaves an unused substitute with no line", () => {
    const events = [
      event("Goal", { minute: 12, playerId: "a" }),
      event("Goal", { minute: 80, playerId: "a" }),
    ];
    expect(line(events, "a", [])).toMatchObject({ goals: 2 });
    const cut = foldMatchPlayerLineCounts(new Set(), events, 1);
    expect(cut.get("a")).toMatchObject({ goals: 1 });
    expect(cut.get("unused")).toBeUndefined();
    expect(EMPTY_MATCH_PLAYER_LINE_COUNTS).toMatchObject({ goals: 0, keyPasses: 0, cameOnMinute: null });
  });
});
