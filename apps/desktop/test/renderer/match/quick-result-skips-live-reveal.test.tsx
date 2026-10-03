import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SaveId, type CommentaryLineView } from "@cm-clone/contracts";
import { REVEAL_INTERVAL_MS, RegistryProvider } from "../../../src/renderer/rpc.js";
import { MatchProvider, useMatchContext } from "../../../src/renderer/match/MatchProvider.js";
import { CommentaryProvider, useCommentaryContext } from "../../../src/renderer/match/CommentaryProvider.js";
import { useMatchStreaming } from "../../../src/renderer/match/streaming.js";
import { clearActiveMatch, getActiveMatch } from "../../../src/renderer/match/session.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";
import { MATCH_COLOURS } from "./matchColours.js";

/**
 * group-g-match-day 42: a Quick result "skips only the live reveal" (CONTEXT.md). It runs the same
 * match as Play, but Match day reads the whole feed at once instead of pacing it, and never stops for
 * an injury decision: a quick-resulted match has an empty command journal.
 */

const s1 = SaveId.make("s1");

const SUMMARY = {
  matchId: "m1",
  fixtureId: 1,
  homeClubId: "home",
  homeClubName: "Home FC",
  awayClubId: "away",
  awayClubName: "Away FC",
  ...MATCH_COLOURS,
  isHome: true,
};

const at = (minute: number, tag: string, text: string): CommentaryLineView => ({ minute, tag, text });

const MATCH: ReadonlyArray<CommentaryLineView> = [
  at(1, "MatchStarted", "Kick-off."),
  at(20, "Injury", "Home player is hurt."),
  at(45, "HalfTimeReached", "Half time."),
  at(60, "Goal", "Home FC score! 1-0."),
  at(90, "FullTimeWhistle", "Full time."),
];

/** The feed arrives in two chunks, split at half time, as the server's boundary-cut chunks do. */
const CHUNK_END = 3;

const INJURY = {
  minute: 20,
  teamClubId: "home",
  playerId: "on-5",
  trigger: "contact",
  severity: "medium",
  tier: "orange",
  type: "twistedAnkle",
  replaced: false,
};

// Cap reached: under Play, the home injury waits on the manager's decision.
const capped = { used: 5, remaining: 0, windowsUsed: 3, windowsRemaining: 0, capReached: true };

const leagueTable = {
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
      matchId: null,
      blockers: [],
      advisories: [],
    },
  },
  standings: [],
};

const mockSave = (): Array<{ method: string; payload: Record<string, unknown> }> => {
  const calls: Array<{ method: string; payload: Record<string, unknown> }> = [];
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string, payload: Record<string, unknown>) => {
      calls.push({ method, payload });
      if (method === "getLeagueTable") return { _tag: "Success", value: leagueTable };
      if (method === "startMatch") return { _tag: "Success", value: SUMMARY };
      if (method === "resumeSimulation") {
        const cursor = payload["cursor"] as number;
        const revealed = payload["revealedEvents"] as number;
        const end = cursor < CHUNK_END ? CHUNK_END : MATCH.length;
        const lines = MATCH.slice(cursor, end);
        return {
          _tag: "Success",
          value: {
            matchId: "m1",
            cursor: end,
            isComplete: end === MATCH.length,
            homeScore: MATCH.slice(0, revealed).filter((line) => line.tag === "Goal").length,
            awayScore: 0,
            lines,
            homeSubs: capped,
            awaySubs: capped,
            homePitch: { onPitch: [{ playerId: "on-1", position: "DC" }], substitutes: [] },
            awayPitch: { onPitch: [], substitutes: [] },
            injuredClubIds: [],
            injuries: lines.some((line) => line.tag === "Injury") ? [INJURY] : [],
            homeOnPitchCount: 11,
            awayOnPitchCount: 11,
          },
        };
      }
      return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: s1 } };
    },
  };
  return calls;
};

const Probe = () => {
  useMatchStreaming();
  const { state, actions } = useMatchContext();
  const { state: comm } = useCommentaryContext();
  return (
    <>
      <button type="button" onClick={() => actions.startMatch("play")}>
        Play
      </button>
      <button type="button" onClick={() => actions.startMatch("quick")}>
        Quick result
      </button>
      <output data-testid="probe">
        {comm.revealed.length}|{comm.homeScore}-{comm.awayScore}|{state.phase}
      </output>
    </>
  );
};

/** Settles `times` rounds of queued RPC replies and the renders they cause, without moving the clock. */
const flush = async (times: number): Promise<void> => {
  if (times === 0) return;
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  await flush(times - 1);
};

const mountAndPress = async (name: "Play" | "Quick result") => {
  render(
    <RegistryProvider>
      <MatchProvider saveId={s1}>
        <CommentaryProvider>
          <Probe />
        </CommentaryProvider>
      </MatchProvider>
    </RegistryProvider>,
  );
  await flush(2);
  await act(async () => {
    screen.getByRole("button", { name }).click();
    await vi.advanceTimersByTimeAsync(0);
  });
  await flush(3);
};

const probe = () => screen.getByTestId("probe").textContent ?? "";

beforeEach(() => {
  cleanup();
  clearActiveMatch(s1);
  resetScopeState();
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  clearActiveMatch(s1);
  resetScopeState();
  vi.useRealTimers();
});

describe("Quick result skips the live reveal (group-g-match-day 42)", () => {
  it("reaches full time with the final score before a single reveal tick, past a capped injury", async () => {
    const calls = mockSave();
    await mountAndPress("Quick result");

    expect(calls.filter((call) => call.method === "startMatch").map((call) => call.payload)).toEqual([
      { saveId: "s1", fixtureId: 1, mode: "quick" },
    ]);
    expect(probe()).toBe(`${MATCH.length}|1-0|complete`);
    // The session records the mode, so a return to Match day mid-read keeps revealing at once.
    expect(getActiveMatch(s1)?.quick).toBe(true);
  });

  it("Play is unchanged: it reveals at pace and stops on the capped injury for a decision", async () => {
    mockSave();
    await mountAndPress("Play");
    expect(probe()).toBe("0|0-0|live");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(REVEAL_INTERVAL_MS * 2);
    });
    expect(probe()).toBe("2|0-0|paused");
  });
});
