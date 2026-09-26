import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MatchId, SaveId, type CommentaryLineView } from "@cm-clone/contracts";
import { REVEAL_INTERVAL_MS, RegistryProvider, leagueTableAtom, useAtomValue } from "../../../src/renderer/rpc.js";
import { MatchProvider, useMatchContext } from "../../../src/renderer/match/MatchProvider.js";
import { CommentaryProvider, useCommentaryContext } from "../../../src/renderer/match/CommentaryProvider.js";
import { useMatchStreaming } from "../../../src/renderer/match/streaming.js";
import { clearActiveMatch, getActiveMatch, setActiveMatch } from "../../../src/renderer/match/session.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";

/**
 * group-g-match-day 41: starting a match and accepting its result refresh the season read, so the
 * pending view stops naming an accepted match without a Continue, and Match day decides whether a
 * started match is still awaited from that read rather than from what this renderer watched.
 */

const s1 = SaveId.make("s1");
const s2 = SaveId.make("s2");

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

/** What main holds: the Fixture awaited (or not) and the match started for it (or not). */
interface SaveState {
  awaiting: boolean;
  matchId: string | null;
}

const leagueTable = (state: SaveState) => ({
  season: {
    seasonNumber: 1,
    currentDate: "2026-08-01",
    phase: "in_season",
    awaitingFixture: state.awaiting
      ? {
          fixtureId: 1,
          date: "2026-08-01",
          competitionId: "league_1",
          opponentClubId: "away",
          opponentClubName: "Away FC",
          isHome: true,
          matchId: state.matchId,
          blockers: [],
          advisories: [],
        }
      : null,
  },
  standings: [],
});

interface Mocked {
  readonly calls: Array<{ method: string; payload: Record<string, unknown> }>;
  readonly state: SaveState;
  /** When set, the next season read waits for this before answering. */
  hold: Promise<void> | null;
}

const called = (mocked: Mocked, method: string) => mocked.calls.filter((call) => call.method === method);

/** A stateful main: `startMatch` links the Fixture to the match, `commitMatchday` clears it. */
const mockSave = (initial: SaveState): Mocked => {
  const mocked: Mocked = { calls: [], state: { ...initial }, hold: null };
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string, payload: Record<string, unknown>) => {
      mocked.calls.push({ method, payload });
      if (method === "getLeagueTable") {
        const hold = mocked.hold;
        if (hold !== null) {
          mocked.hold = null;
          await hold;
        }
        return { _tag: "Success", value: leagueTable(mocked.state) };
      }
      if (method === "startMatch") {
        mocked.state.matchId = "m1";
        return { _tag: "Success", value: SUMMARY };
      }
      if (method === "getAwaitingMatch") return { _tag: "Success", value: SUMMARY };
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
        mocked.state.awaiting = false;
        mocked.state.matchId = null;
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
      <button type="button" onClick={() => actions.startMatch("play")}>
        Play
      </button>
      <button type="button" onClick={() => actions.commitResult()}>
        Accept result
      </button>
      <output data-testid="probe">
        {state.match?.matchId ?? "none"}|{comm.revealed.map((line) => line.text).join(" / ")}|{state.phase}
      </output>
      <output data-testid="error">{state.error ?? ""}</output>
    </>
  );
};

/** The career chrome: it holds the season read across Match day mounts, as `CareerStateProvider` does. */
const SeasonProbe = () => {
  const table = useAtomValue(leagueTableAtom(s1));
  const pending = table._tag === "Success" ? table.value.season.awaitingFixture : undefined;
  return (
    <output data-testid="pending">
      {pending === undefined ? "loading" : pending === null ? "none" : `fixture:${pending.matchId ?? "unstarted"}`}
    </output>
  );
};

let showMatchDay: (show: boolean) => void = () => undefined;

const Host = () => {
  const [show, setShow] = useState(true);
  showMatchDay = setShow;
  return (
    <>
      <SeasonProbe />
      {show && (
        <MatchProvider saveId={s1}>
          <CommentaryProvider>
            <Probe />
          </CommentaryProvider>
        </MatchProvider>
      )}
    </>
  );
};

const flush = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
};

const tick = async (times = 1) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(REVEAL_INTERVAL_MS * times);
  });
};

const mount = async () => {
  render(
    <RegistryProvider>
      <Host />
    </RegistryProvider>,
  );
  await flush();
  await flush();
};

const remountMatchDay = async () => {
  act(() => showMatchDay(false));
  act(() => showMatchDay(true));
  await flush();
  await flush();
};

const click = async (name: string) => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
    await vi.advanceTimersByTimeAsync(0);
  });
};

const probe = () => screen.getByTestId("probe").textContent ?? "";
const pending = () => screen.getByTestId("pending").textContent ?? "";

const FULL_TIME = "m1|Kick-off. / Home FC score! 1-0. / Full time.|complete";

/** Plays the started match to full time from kickoff. */
const playToFullTime = async () => {
  await tick(4);
  expect(probe()).toBe(FULL_TIME);
};

beforeEach(() => {
  cleanup();
  clearActiveMatch(s1);
  clearActiveMatch(s2);
  resetScopeState();
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  clearActiveMatch(s1);
  clearActiveMatch(s2);
  resetScopeState();
  vi.useRealTimers();
});

describe("starting a match and accepting its result refresh the season read (group-g-match-day 41)", () => {
  it("Play re-reads the season without resetting the match, and Accept result stops the pending view naming it", async () => {
    const mocked = mockSave({ awaiting: true, matchId: null });
    await mount();
    expect(pending()).toBe("fixture:unstarted");

    await click("Play");
    await flush();
    // The season now names the started match, and the match in play carries on from where it is.
    expect(pending()).toBe("fixture:m1");
    expect(called(mocked, "getLeagueTable")).toHaveLength(2);
    expect(probe()).toBe("m1||live");
    await playToFullTime();
    expect(called(mocked, "resumeSimulation")[0]?.payload).toMatchObject({ cursor: 0 });

    await click("Accept result");
    await flush();
    expect(called(mocked, "getLeagueTable")).toHaveLength(3);
    expect(pending()).toBe("none");
    expect(probe()).toBe("m1|Kick-off. / Home FC score! 1-0. / Full time.|committed");
    // No Continue in between, and nothing read the accepted match back.
    expect(called(mocked, "advanceCalendar")).toEqual([]);
    expect(called(mocked, "getAwaitingMatch")).toEqual([]);
  });

  it("a Match day mounted while the refreshed read is in flight does not read the accepted match back", async () => {
    const mocked = mockSave({ awaiting: true, matchId: null });
    await mount();
    await click("Play");
    await flush();
    await playToFullTime();

    let release: () => void = () => undefined;
    mocked.hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    await click("Accept result");
    // The refresh is in flight: the stale view still names the match, and the session is gone.
    expect(pending()).toBe("fixture:m1");
    expect(getActiveMatch(s1)).toBeNull();

    await remountMatchDay();
    expect(called(mocked, "getAwaitingMatch")).toEqual([]);
    expect(probe()).toBe("none||awaiting-kickoff");

    await act(async () => {
      release();
      await vi.advanceTimersByTimeAsync(0);
    });
    await flush();
    expect(pending()).toBe("none");
    expect(called(mocked, "getAwaitingMatch")).toEqual([]);
    expect(probe()).toBe("none||awaiting-kickoff");
  });

  it("a return after Accept result, with the season read refreshed, does not read the match back", async () => {
    const mocked = mockSave({ awaiting: true, matchId: null });
    await mount();
    await click("Play");
    await flush();
    await playToFullTime();
    await click("Accept result");
    await flush();

    await remountMatchDay();
    expect(called(mocked, "getAwaitingMatch")).toEqual([]);
    expect(probe()).toBe("none||awaiting-kickoff");
  });

  it("a match left at full time while another save's match took the session is restored, not taken as accepted", async () => {
    const mocked = mockSave({ awaiting: true, matchId: null });
    await mount();
    await click("Play");
    await flush();
    await playToFullTime();

    // Switch to another save and start its match: the session is single-slot, so it now holds that one.
    act(() => showMatchDay(false));
    setActiveMatch({ saveId: s2, match: { ...SUMMARY, matchId: MatchId.make("m2") }, phase: "live" } as never);
    act(() => showMatchDay(true));
    await flush();
    await flush();

    // Back in s1, the season still awaits m1: it is read back and replayed, and its result can be accepted.
    expect(called(mocked, "getAwaitingMatch").map((call) => call.payload)).toEqual([{ saveId: "s1", matchId: "m1" }]);
    expect(probe()).toBe("m1||live");
    await playToFullTime();
    await click("Accept result");
    await flush();
    expect(called(mocked, "commitMatchday")).toHaveLength(1);
    expect(pending()).toBe("none");
  });

  it("a match left at full time while the other save started nothing is restored at full time", async () => {
    const mocked = mockSave({ awaiting: true, matchId: null });
    await mount();
    await click("Play");
    await flush();
    await playToFullTime();

    await remountMatchDay();
    expect(called(mocked, "getAwaitingMatch")).toEqual([]);
    expect(probe()).toBe(FULL_TIME);
    await click("Accept result");
    await flush();
    expect(called(mocked, "commitMatchday")).toHaveLength(1);
    expect(pending()).toBe("none");
  });
});
