import { describe, expect, it } from "vitest";
import { ClubId, PlayerId, type InjuryView } from "@cm-clone/contracts";
import { REFETCH_THRESHOLD } from "../../../src/renderer/rpc.js";
import {
  nextPaceDecision,
  shouldPauseMatch,
  shouldPollMatch,
} from "../../../src/renderer/match/streaming.js";

const cid = (id: string) => ClubId.make(id);
const pid = (id: string) => PlayerId.make(id);

/** A typed orange knock, exactly as the engine emits one (schemas.ts InjuryView). */
const knock = (teamClubId: string): InjuryView => ({
  minute: 23,
  teamClubId: cid(teamClubId),
  playerId: pid("on-5"),
  trigger: "contact",
  severity: "medium",
  tier: "orange",
  type: "twistedAnkle",
});

describe("shouldPauseMatch — the no-subs injury decision holds the feed (ticket 11)", () => {
  it("pauses when her own club has a decision-pending injury and the cap is reached", () => {
    expect(shouldPauseMatch([knock("home")], cid("home"), true)).toBe(true);
  });

  it("does not pause while a substitution window remains", () => {
    expect(shouldPauseMatch([knock("home")], cid("home"), false)).toBe(false);
  });

  it("does not pause for an injury to the opponent, even at the cap", () => {
    expect(shouldPauseMatch([knock("away")], cid("home"), true)).toBe(false);
  });

  it("does not pause when no injury is pending", () => {
    expect(shouldPauseMatch([], cid("home"), true)).toBe(false);
  });
});

describe("shouldPollMatch — fetch ahead of the reveal pace (ADR-0007)", () => {
  const ready = {
    fetching: false,
    streamComplete: false,
    paused: false,
    bufferLength: 0,
  };

  it("polls when the buffer is drained", () => {
    expect(shouldPollMatch(ready)).toBe(true);
  });

  it("never overlaps two in-flight fetches", () => {
    expect(shouldPollMatch({ ...ready, fetching: true })).toBe(false);
  });

  it("stops once the stream is complete", () => {
    expect(shouldPollMatch({ ...ready, streamComplete: true })).toBe(false);
  });

  it("holds the feed while a no-subs decision is pending", () => {
    expect(shouldPollMatch({ ...ready, paused: true })).toBe(false);
  });

  it("polls up to the refetch threshold", () => {
    expect(shouldPollMatch({ ...ready, bufferLength: REFETCH_THRESHOLD })).toBe(true);
  });

  it("stays quiet while the buffer is ahead of the reveal pace", () => {
    expect(shouldPollMatch({ ...ready, bufferLength: REFETCH_THRESHOLD + 1 })).toBe(false);
  });
});

describe("nextPaceDecision — the reveal pacer reveals one line, then completes (ADR-0007)", () => {
  it("holds while a decision pauses the feed, even with a buffered line", () => {
    expect(nextPaceDecision({ paused: true, bufferLength: 3, streamComplete: false })).toBe("wait");
  });

  it("reveals exactly when one buffered line is waiting", () => {
    expect(nextPaceDecision({ paused: false, bufferLength: 1, streamComplete: false })).toBe(
      "reveal",
    );
  });

  it("marks the match complete when the stream ends and the buffer drains", () => {
    expect(nextPaceDecision({ paused: false, bufferLength: 0, streamComplete: true })).toBe(
      "complete",
    );
  });

  it("waits while the stream is live and the buffer is empty", () => {
    expect(nextPaceDecision({ paused: false, bufferLength: 0, streamComplete: false })).toBe(
      "wait",
    );
  });
});