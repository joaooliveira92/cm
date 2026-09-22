import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MatchId, SaveId, type CommentaryLineView } from "@cm-clone/contracts";
import { REVEAL_INTERVAL_MS, RegistryProvider } from "../../../src/renderer/rpc.js";
import { MatchProvider, useMatchContext } from "../../../src/renderer/match/MatchProvider.js";
import { CommentaryProvider, useCommentaryContext } from "../../../src/renderer/match/CommentaryProvider.js";
import { useMatchStreaming } from "../../../src/renderer/match/streaming.js";
import {
  clearActiveMatch,
  getActiveMatch,
  recordFullTime,
  recordRevealedLines,
  recordRevealedMinute,
  setActiveMatch,
} from "../../../src/renderer/match/session.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";

/**
 * group-g-match-day 37: an app restart loses the renderer's match session while the save still awaits
 * the started match. Match day reads that match back from `PendingFixtureView.matchId` and plays it
 * live from kickoff, where a same-session return (ticket 23) keeps continuing from the revealed position.
 */

const s1 = SaveId.make("s1");
const m1 = MatchId.make("m1");

const SUMMARY = {
  matchId: "m1",
  fixtureId: 1,
  homeClubId: "home",
  homeClubName: "Home FC",
  awayClubId: "away",
  awayClubName: "Away FC",
  isHome: true,
};

const at = (minute: number, tag: string, text: string): CommentaryLineView => ({ minute, tag, text });

const MATCH: ReadonlyArray<CommentaryLineView> = [
  at(1, "MatchStarted", "Kick-off."),
  at(30, "Goal", "Home FC score! 1-0."),
  at(90, "FullTimeWhistle", "Full time."),
];

const subs = { used: 0, remaining: 5, windowsUsed: 0, windowsRemaining: 3, capReached: false };

const leagueTable = (matchId: string | null) => ({
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
      advisories: [],
    },
  },
  standings: [],
});

interface Mocked {
  readonly calls: Array<{ method: string; payload: Record<string, unknown> }>;
}

const reads = (mocked: Mocked) => mocked.calls.filter((call) => call.method === "resumeSimulation").map((call) => call.payload);
const called = (mocked: Mocked, method: string) => mocked.calls.filter((call) => call.method === method);

/** The save awaits `m1`; `awaiting` answers `getAwaitingMatch`. */
const mockSave = (awaiting: unknown = { _tag: "Success", value: SUMMARY }): Mocked => {
  const mocked: Mocked = { calls: [] };
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string, payload: Record<string, unknown>) => {
      mocked.calls.push({ method, payload });
      if (method === "getLeagueTable") return { _tag: "Success", value: leagueTable("m1") };
      if (method === "getAwaitingMatch") return awaiting;
      if (method === "resumeSimulation") {
        const cursor = payload["cursor"] as number;
        const revealed = payload["revealedEvents"] as number;
        return {
          _tag: "Success",
          value: {
            matchId: "m1",
            cursor: MATCH.length,
            isComplete: true,
            homeScore: MATCH.slice(0, revealed).filter((line) => line.tag === "Goal").length,
            awayScore: 0,
            lines: MATCH.slice(cursor),
            homeSubs: subs,
            awaySubs: subs,
            homePitch: { onPitch: [{ playerId: "on-1", position: "DC" }], substitutes: [] },
            awayPitch: { onPitch: [], substitutes: [] },
            injuredClubIds: [],
            injuries: [],
            homeOnPitchCount: 11,
            awayOnPitchCount: 11,
          },
        };
      }
      if (method === "commitMatchday") {
        return {
          _tag: "Success",
          value: {
            fixtureId: 1,
            alreadyCommitted: false,
            homeClubId: "home",
            awayClubId: "away",
            homeGoals: 1,
            awayGoals: 0,
            otherFixturesResolved: 0,
            seasonConcluded: false,
          },
        };
      }
      return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: s1 } };
    },
  };
  return mocked;
};

const Probe = () => {
  useMatchStreaming();
  const { state, actions } = useMatchContext();
  const { state: comm } = useCommentaryContext();
  return (
    <>
      <button type="button" onClick={() => actions.commitResult()}>
        Accept result
      </button>
      <output data-testid="probe">
        {state.match?.matchId ?? "none"}|{comm.revealed.map((line) => line.text).join(" / ")}|{comm.homeScore}-{comm.awayScore}|{state.phase}
      </output>
      <output data-testid="error">{state.error ?? ""}</output>
    </>
  );
};

const flush = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
};

const mountMatchDay = async () => {
  render(
    <RegistryProvider>
      <MatchProvider saveId={s1}>
        <CommentaryProvider>
          <Probe />
        </CommentaryProvider>
      </MatchProvider>
    </RegistryProvider>,
  );
  await flush();
  await flush();
};

const tick = async (times = 1) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(REVEAL_INTERVAL_MS * times);
  });
};

const probe = () => screen.getByTestId("probe").textContent ?? "";

beforeEach(() => {
  cleanup();
  clearActiveMatch(s1);
  // The full-time mark is module state nothing clears; moving it to another save forgets the last
  // test's.
  recordFullTime(SaveId.make("elsewhere"), m1);
  resetScopeState();
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  clearActiveMatch(s1);
  resetScopeState();
  vi.useRealTimers();
});

describe("Match day resumes a started match after an app restart (group-g-match-day 37)", () => {
  it("reads the awaiting match back, replays it from kickoff, and plays it to an accepted result", async () => {
    const mocked = mockSave();
    await mountMatchDay();

    expect(called(mocked, "getAwaitingMatch").map((call) => call.payload)).toEqual([{ saveId: "s1", matchId: "m1" }]);
    expect(called(mocked, "startMatch")).toEqual([]);
    expect(probe()).toBe("m1||0-0|live");
    expect(reads(mocked)[0]).toMatchObject({ matchId: "m1", cursor: 0, revealedEvents: 0 });
    // Recorded as the session, so a later return within this run continues from where it got to.
    expect(getActiveMatch(s1)?.match.matchId).toBe("m1");

    await tick();
    expect(probe()).toBe("m1|Kick-off.|0-0|live");
    await tick(3);
    expect(probe()).toBe("m1|Kick-off. / Home FC score! 1-0. / Full time.|1-0|complete");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Accept result" }));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(called(mocked, "commitMatchday").map((call) => call.payload)).toEqual([{ saveId: "s1", fixtureId: 1 }]);
    expect(probe()).toMatch(/\|committed$/);
  });

  it("a same-session return continues from the revealed position without reading the match back (ticket 23)", async () => {
    setActiveMatch({ saveId: s1, match: SUMMARY, phase: "live" } as never);
    recordRevealedLines(s1, m1, MATCH.slice(0, 2));
    recordRevealedMinute(s1, m1, 30);

    const mocked = mockSave();
    await mountMatchDay();

    expect(called(mocked, "getAwaitingMatch")).toEqual([]);
    expect(probe()).toMatch(/^m1\|Kick-off\. \/ Home FC score! 1-0\.\|/);
    expect(reads(mocked)[0]).toMatchObject({ cursor: 2, revealedEvents: 2 });
  });

  it("stays at kickoff and says why when the awaiting match cannot be read", async () => {
    const mocked = mockSave({ _tag: "Failure", error: { _tag: "MatchNotFoundError", matchId: "m1" } });
    await mountMatchDay();

    expect(called(mocked, "getAwaitingMatch")).toHaveLength(1);
    expect(probe()).toBe("none||0-0|awaiting-kickoff");
    expect(screen.getByTestId("error").textContent).not.toBe("");
    expect(reads(mocked)).toEqual([]);
  });

  it("does not read back a match this run already watched to full time and accepted", async () => {
    // Accept result clears the session but leaves the full-time mark; a cached pending view may still
    // name the match.
    recordFullTime(s1, m1);
    const mocked = mockSave();
    await mountMatchDay();

    expect(called(mocked, "getAwaitingMatch")).toEqual([]);
    expect(probe()).toBe("none||0-0|awaiting-kickoff");
  });
});

