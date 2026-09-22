import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MatchId, SaveId } from "@cm-clone/contracts";
import { MatchStatsScreen } from "../../../src/renderer/matchStats/MatchStatsScreen.js";
import {
  clearActiveMatch,
  recordRevealedLines,
  setActiveMatch,
} from "../../../src/renderer/match/session.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";

const s1 = SaveId.make("s1");

const view = (throughMinute: number | null) => ({
  matchId: "m1",
  homeClubName: "Home FC",
  awayClubName: "Away FC",
  throughMinute,
  rows: [
    { key: "goals", home: 2, away: 1 },
    { key: "attempts", home: 11, away: 7 },
    { key: "redCards", home: 0, away: 1 },
  ],
  unavailable: ["possession", "corners", "fouls", "offsides"],
});

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
      <MatchStatsScreen saveId={s1} />
    </RegistryProvider>,
  );
  return calls;
};

const liveSession = (phase = "live", matchId = "m1", saveId = s1) =>
  setActiveMatch({
    saveId,
    match: {
      matchId: MatchId.make(matchId),
      fixtureId: 1,
      homeClubId: "home",
      homeClubName: "Home FC",
      awayClubId: "away",
      awayClubName: "Away FC",
      isHome: true,
    },
    phase,
  } as never);

afterEach(() => {
  cleanup();
  clearActiveMatch(s1);
  clearActiveMatch(SaveId.make("s2"));
});

describe("Match Statistics screen (Screens 95/100)", () => {
  it("after a match, asks for the last played match in full and renders both sides as a table", async () => {
    const calls = mount((method) =>
      method === "getLeagueTable" ? { _tag: "Success", value: leagueTable(null) } : { _tag: "Success", value: view(null) },
    );
    expect(screen.getByText("Loading statistics...")).toBeTruthy();
    const table = await screen.findByRole("table");
    expect(calls.filter((c) => c.method === "getMatchStatistics").at(-1)).toMatchObject({
      payload: { matchId: null, revealedEvents: null },
    });
    const goals = within(table).getByRole("rowheader", { name: /^Goals/ }).closest("tr")!;
    expect(within(goals).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["2", "1"]);
    expect(screen.getByText("Full match")).toBeTruthy();
    expect(screen.getByText(/Not tracked by the match model: Possession, Corners, Fouls, Offsides/)).toBeTruthy();
  });

  it("during a live match, asks for the match in play cut after the revealed events", async () => {
    liveSession();
    recordRevealedLines(s1, MatchId.make("m1"), Array.from({ length: 37 }, (_, minute) => ({ minute, tag: "ShotMissed", text: "Wide." })));
    const calls = mount((method) =>
      method === "getLeagueTable" ? { _tag: "Success", value: leagueTable("m1") } : { _tag: "Success", value: view(63) },
    );
    expect(await screen.findByText("Up to 63'")).toBeTruthy();
    expect(calls.find((c) => c.method === "getMatchStatistics")!.payload).toMatchObject({ matchId: "m1", revealedEvents: 37 });
  });

  it("at full time before the result is accepted, shows that match in full rather than an older one", async () => {
    liveSession("complete", "m9");
    const calls = mount((method) =>
      method === "getLeagueTable" ? { _tag: "Success", value: leagueTable("m9") } : { _tag: "Success", value: view(null) },
    );
    await screen.findByRole("table");
    await waitFor(() =>
      expect(calls.filter((c) => c.method === "getMatchStatistics").at(-1)!.payload).toMatchObject({
        matchId: "m9",
        revealedEvents: null,
      }),
    );
  });

  it("after a restart mid-match — awaiting match set, nothing revealed here — shows nothing of it yet", async () => {
    const calls = mount((method) =>
      method === "getLeagueTable" ? { _tag: "Success", value: leagueTable("m7") } : { _tag: "Success", value: view(0) },
    );
    await screen.findByRole("table");
    const requests = calls.filter((c) => c.method === "getMatchStatistics");
    expect(requests).toHaveLength(1);
    expect(requests[0]!.payload).toMatchObject({ matchId: "m7", revealedEvents: 0 });
  });

  it("a match another save's session took over is shown only as far as Match day reveals it again (group-g-match-day 41)", async () => {
    // Watched to full time in s1, then a match started in another save: the session is single-slot.
    liveSession("live", "m2", SaveId.make("s2"));
    const calls = mount((method) =>
      method === "getLeagueTable" ? { _tag: "Success", value: leagueTable("m9") } : { _tag: "Success", value: view(0) },
    );
    await screen.findByRole("table");
    expect(calls.find((c) => c.method === "getMatchStatistics")!.payload).toMatchObject({ matchId: "m9", revealedEvents: 0 });
  });

  it("says no match has been played when there is none", async () => {
    mount((method) =>
      method === "getLeagueTable" ? { _tag: "Success", value: leagueTable(null) } : { _tag: "Success", value: null },
    );
    expect(await screen.findByText("No match played yet.")).toBeTruthy();
  });

  it("surfaces a failed read with Retry, and Retry reads again", async () => {
    let failures = 1;
    const calls = mount((method) => {
      if (method === "getLeagueTable") return { _tag: "Success", value: leagueTable(null) };
      return failures-- > 0
        ? { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: "s1" } }
        : { _tag: "Success", value: view(null) };
    });
    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("table")).toBeTruthy();
    expect(calls.filter((c) => c.method === "getMatchStatistics").length).toBeGreaterThanOrEqual(2);
  });
});
