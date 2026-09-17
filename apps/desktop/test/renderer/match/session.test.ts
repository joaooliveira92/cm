import { afterEach, describe, expect, it } from "vitest";
import { MatchId, SaveId, type CommentaryLineView } from "@cm-clone/contracts";
import {
  clearActiveMatch,
  getAtHalfTime,
  getHalfTimeRevealed,
  getLiveTactic,
  getRevealedEvents,
  getRevealedFeed,
  getRevealedMinute,
  getRevealedScore,
  recordHalfTimeRevealed,
  recordLiveTactic,
  recordRevealedLines,
  recordRevealedMinute,
  recordRevealedScore,
  setActiveMatch,
} from "../../../src/renderer/match/session.js";

const s1 = SaveId.make("s1");
const m1 = MatchId.make("m1");
const m2 = MatchId.make("m2");
const lines: ReadonlyArray<CommentaryLineView> = [
  { minute: 1, tag: "MatchStarted", text: "Kick-off." },
  { minute: 12, tag: "ShotMissed", text: "Wide." },
];

afterEach(() => clearActiveMatch(s1));

const sessionFor = (matchId: MatchId) =>
  ({ saveId: s1, match: { matchId, isHome: true }, phase: "live" }) as never;

describe("the live context belongs to one match (group-g-match-day 23)", () => {
  it("does not restore a previous match's feed into the next match", () => {
    setActiveMatch(sessionFor(m1));
    recordRevealedLines(s1, m1, lines);
    recordRevealedMinute(s1, m1, 12);
    expect(getRevealedFeed(s1, m1).lines).toEqual(lines);
    clearActiveMatch(s1);
    // A write from the first match that lands after it was cleared.
    recordRevealedLines(s1, m1, lines);

    setActiveMatch(sessionFor(m2));
    expect(getRevealedFeed(s1, m2).lines).toEqual([]);
    expect(getRevealedFeed(s1, m2).minute).toBe(0);
    expect(getRevealedFeed(s1, m1).lines).toEqual([]);
  });

  it("starts afresh when the next match records its first line", () => {
    setActiveMatch(sessionFor(m1));
    recordRevealedLines(s1, m1, lines);
    recordRevealedMinute(s1, m1, 12);
    setActiveMatch(sessionFor(m2));
    recordRevealedLines(s1, m2, lines.slice(0, 1));

    expect(getRevealedEvents(s1)).toBe(1);
    expect(getRevealedFeed(s1, m2)).toMatchObject({ lines: lines.slice(0, 1), minute: 0 });
  });
});

describe("session readers see only the match in play (group-g-match-day 28)", () => {
  it("shows the next match nothing a write for the committed match left behind", () => {
    setActiveMatch(sessionFor(m1));
    recordRevealedLines(s1, m1, lines);
    clearActiveMatch(s1);
    // Writes from reads in flight across Accept result, landing after it.
    recordRevealedScore(s1, m1, { homeScore: 2, awayScore: 1 });
    recordRevealedMinute(s1, m1, 45);
    recordHalfTimeRevealed(s1, m1);
    recordLiveTactic(s1, m1, { mentality: "attacking" } as never);

    setActiveMatch(sessionFor(m2));

    expect({
      events: getRevealedEvents(s1),
      minute: getRevealedMinute(s1),
      score: getRevealedScore(s1),
      halfTime: getHalfTimeRevealed(s1),
      atHalfTime: getAtHalfTime(s1),
      tactic: getLiveTactic(s1),
    }).toEqual({ events: 0, minute: 0, score: null, halfTime: false, atHalfTime: false, tactic: null });
  });

  it("keeps a late write for the previous match out of the next match's position", () => {
    setActiveMatch(sessionFor(m2));
    recordRevealedLines(s1, m2, lines.slice(0, 1));
    recordRevealedMinute(s1, m2, 12);
    // Writes from the first match that land after the second one started.
    recordRevealedLines(s1, m1, lines);
    recordRevealedMinute(s1, m1, 45);
    recordRevealedScore(s1, m1, { homeScore: 2, awayScore: 1 });
    recordHalfTimeRevealed(s1, m1);

    expect(getRevealedEvents(s1)).toBe(1);
    expect(getRevealedFeed(s1, m2).lines).toEqual(lines.slice(0, 1));
    expect(getRevealedMinute(s1)).toBe(12);
    expect(getRevealedScore(s1)).toBeNull();
    expect(getHalfTimeRevealed(s1)).toBe(false);
  });
});
