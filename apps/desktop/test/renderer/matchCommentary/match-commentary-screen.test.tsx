// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MatchId, SaveId, type CommentaryLineView } from "@cm-clone/contracts";
import { MatchCommentaryScreen } from "../../../src/renderer/matchCommentary/MatchCommentaryScreen.js";
import {
  clearActiveMatch,
  recordFullTime,
  recordRevealedEvents,
  setActiveMatch,
} from "../../../src/renderer/match/session.js";
import { POLL_INTERVAL_MS, RegistryProvider } from "../../../src/renderer/rpc.js";

const s1 = SaveId.make("s1");

const leagueTable = (matchId: string) => ({
  season: {
    seasonNumber: 1,
    currentDate: "2026-08-01",
    phase: "in_season",
    awaitingFixture: {
      fixtureId: 1,
      date: "2026-08-01",
      competitionId: "league_1",
      opponentClubId: "away",
      opponentClubName: "Away FC",
      isHome: true,
      matchId,
      blockers: [],
    },
  },
  standings: [],
});

const LINES: ReadonlyArray<CommentaryLineView> = [
  { minute: 0, tag: "MatchStarted", text: "And we're off." },
  { minute: 12, tag: "ShotMissed", text: "Wide from distance." },
  { minute: 30, tag: "Goal", text: "Bell scores! 1-0 now." },
  { minute: 45, tag: "HalfTimeReached", text: "Half time — it's 1-0." },
  { minute: 90, tag: "FullTimeWhistle", text: "The final whistle — 1-0." },
];

/** The main process's chunking: every line after `cursor`, in one complete chunk. */
const chunkAfter = (cursor: number) => ({
  matchId: "m1",
  cursor: LINES.length,
  isComplete: true,
  homeScore: 0,
  awayScore: 0,
  lines: LINES.slice(cursor),
  homeSubs: { used: 0, remaining: 5, windowsUsed: 0, windowsRemaining: 3, capReached: false },
  awaySubs: { used: 0, remaining: 5, windowsUsed: 0, windowsRemaining: 3, capReached: false },
  homePitch: { onPitch: [], substitutes: [] },
  awayPitch: { onPitch: [], substitutes: [] },
  injuredClubIds: [],
  injuries: [],
  homeOnPitchCount: 11,
  awayOnPitchCount: 11,
});

const mount = async (matchId = "m1") => {
  const reads: Array<Record<string, unknown>> = [];
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string, payload: Record<string, unknown>) => {
      if (method === "getLeagueTable") return { _tag: "Success", value: leagueTable(matchId) };
      if (method === "resumeSimulation") {
        reads.push(payload);
        return { _tag: "Success", value: chunkAfter(payload.cursor as number) };
      }
      return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: s1 } };
    },
  };
  render(
    <RegistryProvider>
      <MatchCommentaryScreen saveId={s1} />
    </RegistryProvider>,
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  return reads;
};

const liveSession = () =>
  setActiveMatch({
    saveId: s1,
    match: {
      matchId: MatchId.make("m1"),
      fixtureId: 1,
      homeClubId: "home",
      homeClubName: "Home FC",
      awayClubId: "away",
      awayClubName: "Away FC",
      isHome: true,
    },
    cursor: 0,
    phase: "live",
    streamComplete: false,
  } as never);

const shown = () => screen.queryAllByText(/./, { selector: "p > span:last-child" }).map((node) => node.textContent);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  clearActiveMatch(s1);
  vi.useRealTimers();
});

describe("Match Commentary screen shows no more than Match day has revealed (group-g-match-day 22)", () => {
  it("during a live match, lists only the revealed lines, not a later goal or the result", async () => {
    liveSession();
    recordRevealedEvents(s1, 2);
    const reads = await mount();

    expect(shown()).toEqual(["And we're off.", "Wide from distance."]);
    expect(screen.queryByText(/Bell scores/)).toBeNull();
    expect(screen.queryByText(/final whistle/)).toBeNull();
    expect(reads[0]).toMatchObject({ matchId: "m1", cursor: 0, revealedEvents: 2 });

    // Match day reveals the goal: the screen follows on its next tick, and no further.
    recordRevealedEvents(s1, 3);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    });
    expect(shown()).toEqual(["And we're off.", "Wide from distance.", "Bell scores! 1-0 now."]);
    expect(screen.queryByText(/final whistle/)).toBeNull();
  });

  it("at full time watched in this renderer, lists the whole match", async () => {
    recordFullTime(s1, MatchId.make("m1"));
    const reads = await mount();

    expect(shown()).toHaveLength(LINES.length);
    expect(reads[0]).toMatchObject({ revealedEvents: null });
  });

  it("after a restart mid-match, with nothing revealed here, lists nothing of the match", async () => {
    // A match this renderer never watched: no session, no full time recorded for it.
    await mount("m7");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);
    });

    expect(shown()).toEqual([]);
    expect(screen.queryByText(/final whistle/)).toBeNull();
  });
});
