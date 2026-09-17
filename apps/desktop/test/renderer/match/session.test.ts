import { afterEach, describe, expect, it } from "vitest";
import { MatchId, SaveId, type CommentaryLineView } from "@cm-clone/contracts";
import {
  clearActiveMatch,
  getRevealedEvents,
  getRevealedFeed,
  recordRevealedLines,
  recordRevealedMinute,
} from "../../../src/renderer/match/session.js";

const s1 = SaveId.make("s1");
const m1 = MatchId.make("m1");
const m2 = MatchId.make("m2");
const lines: ReadonlyArray<CommentaryLineView> = [
  { minute: 1, tag: "MatchStarted", text: "Kick-off." },
  { minute: 12, tag: "ShotMissed", text: "Wide." },
];

afterEach(() => clearActiveMatch(s1));

describe("the live context belongs to one match (group-g-match-day 23)", () => {
  it("does not restore a previous match's feed into the next match", () => {
    recordRevealedLines(s1, m1, lines);
    recordRevealedMinute(s1, 12);
    clearActiveMatch(s1);
    // A write from the first match that lands after it was cleared.
    recordRevealedLines(s1, m1, lines);

    expect(getRevealedFeed(s1, m2).lines).toEqual([]);
    expect(getRevealedFeed(s1, m2).minute).toBe(0);
    expect(getRevealedFeed(s1, m1).lines).toEqual(lines);
  });

  it("starts afresh when the next match records its first line", () => {
    recordRevealedLines(s1, m1, lines);
    recordRevealedMinute(s1, 12);
    recordRevealedLines(s1, m2, lines.slice(0, 1));

    expect(getRevealedEvents(s1)).toBe(1);
    expect(getRevealedFeed(s1, m2)).toMatchObject({ lines: lines.slice(0, 1), minute: 0 });
  });
});
