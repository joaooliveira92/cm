import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MatchId, SaveId } from "@cm-clone/contracts";
import { RESTARTED_FROM_KICKOFF } from "../../../src/renderer/match/MatchDayScreen.js";
import { clearActiveMatch, getActiveMatch, recordFullTime } from "../../../src/renderer/match/session.js";
import { resetActionHandlers } from "../../../src/renderer/actions/dispatch.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";
import { mountMatchDayWithSpine, rid, session } from "./liveMatchDayHarness.js";

/**
 * group-g-match-day 33: a match read back after an app restart replays from kickoff, so Match day says
 * so in one sentence, for the rest of that match. A match started in this process, or a return to one,
 * says nothing.
 */

const SUMMARY = {
  matchId: "m1",
  fixtureId: 1,
  homeClubId: "home",
  homeClubName: "Home FC",
  awayClubId: "away",
  awayClubName: "Away FC",
  isHome: true,
};

const leagueTable = (matchId: string | null) => ({
  _tag: "Success",
  value: {
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
  },
});

/** The save's pending Fixture names `matchId`; every call is counted by method. */
const save = (matchId: string | null, calls: Array<string>) => (method: string): Promise<unknown> | undefined => {
  calls.push(method);
  if (method === "getLeagueTable") return Promise.resolve(leagueTable(matchId));
  if (method === "getAwaitingMatch" || method === "startMatch") return Promise.resolve({ _tag: "Success", value: SUMMARY });
  // Everything else answers as the harness does: not found.
  return undefined;
};

const sentence = () => screen.queryByText(RESTARTED_FROM_KICKOFF);

beforeEach(() => {
  cleanup();
  clearActiveMatch(rid("s1"));
  // The full-time mark is module state nothing clears; moving it elsewhere forgets another spec's.
  recordFullTime(SaveId.make("elsewhere"), MatchId.make("m1"));
  resetActionHandlers();
  resetScopeState();
  window.scrollTo = () => undefined;
});

afterEach(() => {
  cleanup();
  clearActiveMatch(rid("s1"));
  resetActionHandlers();
  resetScopeState();
  window.localStorage.clear();
});

describe("a live match replayed after a restart says so (group-g-match-day 33)", () => {
  it("says the match restarted from kickoff, as a notice, and still says so on a same-session return", async () => {
    const calls: Array<string> = [];
    await mountMatchDayWithSpine(null, save("m1", calls));

    expect(calls).toContain("getAwaitingMatch");
    expect(screen.getAllByText(RESTARTED_FROM_KICKOFF)).toHaveLength(1);
    // It asks nothing of the manager, so it is a status, not an alert.
    expect(screen.getByRole("status").textContent).toBe(RESTARTED_FROM_KICKOFF);
    expect(getActiveMatch(rid("s1"))?.restoredAfterRestart).toBe(true);
    cleanup();

    // Leaving Match day and coming back continues the session, not a second read-back.
    const again: Array<string> = [];
    await mountMatchDayWithSpine(null, save("m1", again));
    expect(again).not.toContain("getAwaitingMatch");
    expect(sentence()).not.toBeNull();
  }, 10_000);

  it("says nothing on a return to a match started in this process", async () => {
    const calls: Array<string> = [];
    await mountMatchDayWithSpine(session(), save("m1", calls));

    expect(calls).not.toContain("getAwaitingMatch");
    expect(sentence()).toBeNull();
  });

  it("says nothing for a match started in this process, nor on a return to it", async () => {
    const calls: Array<string> = [];
    // The harness settles once the live panel shows, which only Play brings.
    const mounted = mountMatchDayWithSpine(null, save(null, calls));
    const play = await screen.findByRole("button", { name: "Play match" }, { timeout: 4000 });
    act(() => {
      fireEvent.click(play);
    });
    await mounted;

    expect(calls).toContain("startMatch");
    expect(calls).not.toContain("getAwaitingMatch");
    expect(sentence()).toBeNull();
    cleanup();

    // The save now names the started match; the session, not a read-back, restores it.
    const again: Array<string> = [];
    await mountMatchDayWithSpine(null, save("m1", again));
    expect(again).not.toContain("getAwaitingMatch");
    expect(sentence()).toBeNull();
  }, 10_000);
});
