import { cleanup, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MatchId } from "@cm-clone/contracts";
import {
  clearCommittedMatch,
  getCommittedMatch,
  setCommittedMatch,
} from "../../../src/renderer/match/session.js";
import { mountRoutedCareer, preload, resetCareerHarness, rid } from "./career-harness.js";

/**
 * The committed match's lifetime is owned by the always-mounted chrome, not by Match day, so
 * advancing the calendar from any screen ends the post-match context. Ticket 21: the bar and its
 * Possession strip must not outlive the match once a new Fixture is waiting.
 */

const summary = (matchId: string) =>
  ({
    matchId: MatchId.make(matchId),
    fixtureId: 1,
    homeClubId: "home",
    homeClubName: "Home FC",
    awayClubId: "away",
    awayClubName: "Away FC",
    isHome: true,
  }) as never;

/** A season read with an unstarted Fixture awaiting its kickoff. */
const awaitingFixturePayload = {
  _tag: "Success",
  value: {
    season: {
      seasonNumber: 3,
      currentDate: "2026-10-24",
      phase: "in_season",
      awaitingFixture: {
        fixtureId: 2,
        date: "2026-10-24",
        competitionId: "league",
        opponentClubId: rid("c2"),
        opponentClubName: "Eastfield",
        isHome: true,
        matchId: null,
        blockers: [],
        advisories: [],
      },
    },
    standings: [],
  },
} as never;

beforeEach(resetCareerHarness);

afterEach(() => {
  cleanup();
  clearCommittedMatch(rid("s1"));
});

describe("the committed match ends when a new Fixture awaits", () => {
  it("clears the committed match once the season names a different Fixture", async () => {
    setCommittedMatch(rid("s1"), summary("m1"));
    preload("in_season");
    const inner = (window as unknown as { cmClone: { call: (method: string, payload: unknown) => Promise<unknown> } }).cmClone.call;
    (window as unknown as { cmClone: { call: unknown } }).cmClone = {
      call: async (method: string, payload: unknown) =>
        method === "getLeagueTable" ? awaitingFixturePayload : inner(method, payload),
    };

    await mountRoutedCareer("league", undefined, /Go to Match/);

    await waitFor(() => expect(getCommittedMatch(rid("s1"))).toBeNull());
  });

  it("keeps the committed match while the season names no Fixture", async () => {
    setCommittedMatch(rid("s1"), summary("m1"));
    preload("in_season");

    await mountRoutedCareer("league");

    expect(getCommittedMatch(rid("s1"))?.match.matchId).toBe("m1");
  });
});
