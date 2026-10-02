import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SaveId, type CommentaryLineView } from "@cm-clone/contracts";
import { REVEAL_INTERVAL_MS, RegistryProvider } from "../../../src/renderer/rpc.js";
import { MatchProvider, useMatchContext } from "../../../src/renderer/match/MatchProvider.js";
import { CommentaryProvider, useCommentaryContext } from "../../../src/renderer/match/CommentaryProvider.js";
import { useMatchStreaming } from "../../../src/renderer/match/streaming.js";
import { clearActiveMatch } from "../../../src/renderer/match/session.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";
import {
  COMMENTARY_SPEED_STORAGE_KEY,
  resetCommentarySpeedCache,
  setCommentarySpeed,
} from "../../../src/renderer/match/commentarySpeed.js";
import { textSoFar } from "../../../src/renderer/match/engine/playback.js";
import { MATCH_COLOURS } from "./matchColours.js";

/**
 * cm-style-commentary 01: Match day plays a line the way Championship Manager did. A follow-on line
 * shows its build-up, holds, then its outcome, and only the outcome reveals it; a quiet line is
 * revealed without ever reaching the bar; the speed preference scales every authored delay.
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

const BUILD_MS = 1000;
const GOAL_MS = 2000;

const MATCH: ReadonlyArray<CommentaryLineView> = [
  { minute: 0, tag: "MatchStarted", text: "Kick-off." },
  { minute: 5, tag: "KeyPass", text: "Ada picks a pass.", parts: [{ text: "Ada picks a pass.", delayMs: 800 }], quiet: true },
  {
    minute: 6,
    tag: "Goal",
    text: "Ada shoots… GOAL!",
    parts: [
      { text: "Ada shoots…", delayMs: BUILD_MS },
      { text: "GOAL!", delayMs: GOAL_MS },
    ],
    flash: true,
    clubId: "home",
  },
] as ReadonlyArray<CommentaryLineView>;

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

const subs = { used: 0, remaining: 5, windowsUsed: 0, windowsRemaining: 3, capReached: false };

const viewAt = (cursor: number, revealed: number) => ({
  matchId: "m1",
  cursor: MATCH.length,
  isComplete: false,
  homeScore: MATCH.slice(0, revealed).filter((line) => line.tag === "Goal").length,
  awayScore: 0,
  lines: MATCH.slice(cursor),
  homeSubs: subs,
  awaySubs: subs,
  homePitch: { onPitch: [], substitutes: [] },
  awayPitch: { onPitch: [], substitutes: [] },
  injuredClubIds: [],
  injuries: [],
  homeOnPitchCount: 11,
  awayOnPitchCount: 11,
});

const mockSave = (): Array<{ method: string; payload: Record<string, unknown> }> => {
  const calls: Array<{ method: string; payload: Record<string, unknown> }> = [];
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string, payload: Record<string, unknown>) => {
      calls.push({ method, payload });
      if (method === "getLeagueTable") return { _tag: "Success", value: leagueTable };
      if (method === "startMatch") return { _tag: "Success", value: SUMMARY };
      const revealed = payload["revealedEvents"] as number;
      if (method === "resumeSimulation") return { _tag: "Success", value: viewAt(payload["cursor"] as number, revealed) };
      if (method === "submitMatchCommand") {
        return { _tag: "Success", value: { ...viewAt(revealed, revealed), lines: [], substitutionApplied: null, forceOffApplied: null } };
      }
      return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: s1 } };
    },
  };
  return calls;
};

const Probe = () => {
  useMatchStreaming();
  const { actions } = useMatchContext();
  const { state: comm, actions: commActions } = useCommentaryContext();
  const bar = comm.playing === null ? "" : textSoFar(comm.playing.parts, comm.playing.shown);
  return (
    <>
      <button type="button" onClick={() => actions.startMatch("play")}>
        Play
      </button>
      <button
        type="button"
        onClick={() => void commActions.submitCommand({ _tag: "ChangeTactics", clubId: "home", tactic: {} } as never, false)}
      >
        Command
      </button>
      <output data-testid="probe">
        {comm.revealed.length}|{comm.homeScore}|{bar}
      </output>
    </>
  );
};

const flush = async (times: number): Promise<void> => {
  if (times === 0) return;
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  await flush(times - 1);
};

const advance = async (ms: number): Promise<void> => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
  await flush(2);
};

const play = async () => {
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
    screen.getByRole("button", { name: "Play" }).click();
    await vi.advanceTimersByTimeAsync(0);
  });
  await flush(3);
};

const probe = () => screen.getByTestId("probe").textContent ?? "";

beforeEach(() => {
  cleanup();
  clearActiveMatch(s1);
  resetScopeState();
  window.localStorage.removeItem(COMMENTARY_SPEED_STORAGE_KEY);
  resetCommentarySpeedCache();
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  clearActiveMatch(s1);
  resetScopeState();
  vi.useRealTimers();
});

describe("Match day plays commentary like Championship Manager (cm-style-commentary 01)", () => {
  it("holds a shot's build-up, and reveals the goal and the score only with the outcome", async () => {
    mockSave();
    await play();

    // Kick-off has no parts: it plays on the old interval.
    await advance(REVEAL_INTERVAL_MS);
    expect(probe()).toBe("1|0|");

    // The quiet key pass is revealed at once, and the goal's build-up shows in the bar, unrevealed.
    await advance(REVEAL_INTERVAL_MS);
    expect(probe()).toBe("2|0|Ada shoots…");
    await advance(BUILD_MS - 1);
    expect(probe()).toBe("2|0|Ada shoots…");

    await advance(1);
    expect(probe()).toBe("3|1|");
  });

  it("scales the authored delays by the speed preference, and remembers it", async () => {
    setCommentarySpeed("fast");
    resetCommentarySpeedCache();
    mockSave();
    await play();
    await advance(REVEAL_INTERVAL_MS * 2);
    expect(probe()).toBe("2|0|Ada shoots…");

    await advance(BUILD_MS * 0.4);
    expect(probe()).toBe("3|1|");
  });

  it("drops a half-played line when a match command lands, so it is never revealed twice", async () => {
    const calls = mockSave();
    await play();
    await advance(REVEAL_INTERVAL_MS * 2);
    expect(probe()).toBe("2|0|Ada shoots…");

    await act(async () => {
      screen.getByRole("button", { name: "Command" }).click();
      await vi.advanceTimersByTimeAsync(0);
    });
    await flush(3);
    expect(probe()).toBe("2|0|");

    // The refetch from the revealed position sends the goal again, and it plays from its build-up.
    await advance(5000);
    expect(probe()).toBe("3|1|");
    const afterCommand = calls.slice(calls.findIndex((call) => call.method === "submitMatchCommand"));
    expect(afterCommand.some((call) => call.method === "resumeSimulation" && call.payload["cursor"] === 2)).toBe(true);
  });
});
