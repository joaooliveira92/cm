import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MatchId, SaveId } from "@cm-clone/contracts";
import { PossessionBar } from "../../../src/renderer/match/PossessionBar.js";
import {
  clearActiveMatch,
  clearCommittedMatch,
  recordRevealedLines,
  setActiveMatch,
  setCommittedMatch,
} from "../../../src/renderer/match/session.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { MATCH_COLOURS } from "./matchColours.js";

const s1 = SaveId.make("s1");

const matchSummary = (matchId = "m1") => ({
  matchId: MatchId.make(matchId),
  fixtureId: 1,
  homeClubId: "home",
  homeClubName: "Home FC",
  awayClubId: "away",
  awayClubName: "Away FC",
  ...MATCH_COLOURS,
  isHome: true,
});

const liveSession = (phase = "live", matchId = "m1") =>
  setActiveMatch({
    saveId: s1,
    match: matchSummary(matchId),
    phase,
  } as never);

const leagueTable = (matchId: string | null) => ({
  season: {
    seasonNumber: 1,
    currentDate: "2026-08-01",
    phase: "in_season",
    awaitingFixture:
      matchId === null
        ? null
        : {
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

const statistics = (homePossession: number | null, awayPossession: number | null) => ({
  matchId: "m1",
  homeClubName: "Home FC",
  awayClubName: "Away FC",
  throughMinute: null,
  rows: [
    { key: "goals", home: 1, away: 0 },
    ...(homePossession === null ? [] : [{ key: "possession", home: homePossession, away: awayPossession }]),
  ],
  unavailable: homePossession === null ? ["possession"] : [],
  homeAttackShare: null,
  awayAttackShare: null,
  chancesByType: null,
});

const mount = (impl: (method: string, payload: Record<string, unknown>) => unknown) => {
  const calls: Array<{ method: string; payload: Record<string, unknown> }> = [];
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string, payload: Record<string, unknown>) => {
      calls.push({ method, payload });
      return impl(method, payload);
    },
  };
  render(
    <RegistryProvider>
      <PossessionBar saveId={s1} />
    </RegistryProvider>,
  );
  return calls;
};

afterEach(() => {
  cleanup();
  clearActiveMatch(s1);
  clearCommittedMatch(s1);
});

describe("Possession bar", () => {
  it("prints both sides' possession under the live tabs, cut after the revealed events", async () => {
    liveSession();
    recordRevealedLines(s1, MatchId.make("m1"), [
      { minute: 1, tag: "MatchStarted", text: "Kick-off." },
      { minute: 12, tag: "ShotMissed", text: "Wide." },
      { minute: 20, tag: "Cross", text: "Out wide." },
    ]);
    const calls = mount((method) =>
      method === "getLeagueTable"
        ? { _tag: "Success", value: leagueTable("m1") }
        : { _tag: "Success", value: statistics(67, 33) },
    );

    expect(await screen.findByText("67%")).toBeTruthy();
    expect(screen.getByText("33%")).toBeTruthy();
    expect(screen.getByText("Possession")).toBeTruthy();
    expect(calls.find((call) => call.method === "getMatchStatistics")?.payload).toMatchObject({
      matchId: "m1",
      revealedEvents: 3,
    });
  });

  it("shows a neutral track reading 'Not tracked' before any tally, never 50-50", async () => {
    liveSession();
    mount((method) =>
      method === "getLeagueTable"
        ? { _tag: "Success", value: leagueTable("m1") }
        : { _tag: "Success", value: statistics(null, null) },
    );

    expect(await screen.findByText("Not tracked")).toBeTruthy();
    expect(screen.queryByText("50%")).toBeNull();
  });

  it("does not claim 'Not tracked' when the read has not landed", async () => {
    liveSession();
    const calls = mount((method) =>
      method === "getLeagueTable"
        ? { _tag: "Success", value: leagueTable("m1") }
        : { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: s1 } },
    );

    await waitFor(() => expect(calls.some((call) => call.method === "getMatchStatistics")).toBe(true));
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText("Possession")).toBeTruthy();
    expect(screen.queryByText("Not tracked")).toBeNull();
  });

  it("moves with the revealed position as Match day reveals more of the match", async () => {
    liveSession();
    recordRevealedLines(s1, MatchId.make("m1"), [
      { minute: 1, tag: "MatchStarted", text: "Kick-off." },
    ]);
    mount((method, payload) => {
      if (method === "getLeagueTable") return { _tag: "Success", value: leagueTable("m1") };
      const revealed = payload.revealedEvents as number;
      return { _tag: "Success", value: statistics(revealed === 1 ? 100 : 40, revealed === 1 ? 0 : 60) };
    });

    expect(await screen.findByText("100%")).toBeTruthy();
    act(() =>
      recordRevealedLines(s1, MatchId.make("m1"), [
        { minute: 1, tag: "MatchStarted", text: "Kick-off." },
        { minute: 12, tag: "ShotMissed", text: "Wide." },
      ]),
    );
    expect(await screen.findByText("40%")).toBeTruthy();
    expect(screen.getByText("60%")).toBeTruthy();
  });

  it("keeps the bar at full time, before the result is accepted", async () => {
    liveSession("complete", "m9");
    mount((method) =>
      method === "getLeagueTable"
        ? { _tag: "Success", value: leagueTable("m9") }
        : { _tag: "Success", value: statistics(40, 60) },
    );

    expect(await screen.findByText("40%")).toBeTruthy();
    expect(screen.getByText("60%")).toBeTruthy();
  });

  it("renders no bar pre-match, when no match session is on", () => {
    mount((method) =>
      method === "getLeagueTable"
        ? { _tag: "Success", value: leagueTable(null) }
        : { _tag: "Success", value: statistics(50, 50) },
    );

    expect(screen.queryByText("Possession")).toBeNull();
  });

  it("reads the accepted match's full-time possession once the live session is gone", async () => {
    setCommittedMatch(s1, matchSummary("m7") as never);
    const calls = mount((method) =>
      method === "getLeagueTable"
        ? { _tag: "Success", value: leagueTable(null) }
        : { _tag: "Success", value: statistics(55, 45) },
    );

    expect(await screen.findByText("55%")).toBeTruthy();
    expect(screen.getByText("45%")).toBeTruthy();
    expect(calls.find((call) => call.method === "getMatchStatistics")?.payload).toMatchObject({
      matchId: "m7",
      revealedEvents: null,
    });
  });
});
