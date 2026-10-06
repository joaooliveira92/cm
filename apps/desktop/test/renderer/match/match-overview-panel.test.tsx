import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MatchId, SaveId } from "@cm-clone/contracts";
import { MatchOverviewPanel } from "../../../src/renderer/match/MatchOverviewPanel.js";
import {
  clearActiveMatch,
  recordRevealedLines,
  setActiveMatch,
} from "../../../src/renderer/match/session.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";

const s1 = SaveId.make("s1");

const view = (overrides: Record<string, unknown> = {}) => ({
  matchId: "m1",
  homeClubName: "Home FC",
  awayClubName: "Away FC",
  home: {
    scorers: [{ playerId: "p1", playerName: "Alice Okoronkwo", goals: [{ minute: 12, half: 1, penalty: true }, { minute: 70, half: 2, penalty: false }] }],
    sendOffs: [],
  },
  away: {
    scorers: [{ playerId: "p2", playerName: "Bob Striker", goals: [{ minute: 80, half: 2, penalty: false }] }],
    sendOffs: [{ playerId: "p3", playerName: "Carl Defender", minute: 63, half: 2 }],
  },
  halfTimeHomeScore: 1,
  halfTimeAwayScore: 0,
  fixture: { competitionName: "Premier League", round: 12, gameDate: "2026-08-01", venue: "Park, Town" },
  ...overrides,
});

const leagueTable = {
  season: { seasonNumber: 1, currentDate: "2026-08-01", phase: "in_season", awaitingFixture: null },
  standings: [],
};

const mount = (overrides: Record<string, unknown> = {}) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string) =>
      method === "getLeagueTable"
        ? { _tag: "Success", value: leagueTable }
        : { _tag: "Success", value: view(overrides) },
  };
  render(
    <RegistryProvider>
      <MatchOverviewPanel saveId={s1} />
    </RegistryProvider>,
  );
};

afterEach(() => {
  cleanup();
  clearActiveMatch(s1);
});

describe("MatchOverviewPanel (map ticket 15)", () => {
  it("lists a scorer's goals on one line, marking the penalty, and marks a sending-off", async () => {
    mount();
    const scorers = await screen.findByRole("list", { name: "Home FC scorers" });
    expect(scorers.textContent).toContain("Alice Okoronkwo");
    expect(scorers.textContent).toContain("12' (pen)");
    expect(scorers.textContent).toContain("70'");
    expect(screen.getByText(/Sent off: Carl Defender/)).toBeTruthy();
  });

  it("shows the half-time score once reached, and the fixture panel's occasion", async () => {
    mount();
    expect(await screen.findByText("Score at half time: 1-0")).toBeTruthy();
    expect(screen.getByText("Premier League")).toBeTruthy();
    expect(screen.getByText("Round 12")).toBeTruthy();
    expect(screen.getByText("2026-08-01")).toBeTruthy();
    expect(screen.getByText("Park, Town")).toBeTruthy();
  });

  it("draws no referee, weather or attendance", async () => {
    mount();
    await screen.findByRole("region", { name: "Fixture" });
    expect(screen.queryByText(/Referee/i)).toBeNull();
    expect(screen.queryByText(/Weather/i)).toBeNull();
    expect(screen.queryByText(/Attendance/i)).toBeNull();
  });

  it("omits the half-time line before half time is revealed", async () => {
    mount({ halfTimeHomeScore: null, halfTimeAwayScore: null });
    await screen.findByRole("region", { name: "Match incidents" });
    expect(screen.queryByText(/Score at half time/)).toBeNull();
  });

  it("re-reads as the live match reveals, so the incidents follow the feed", async () => {
    const calls: Array<Record<string, unknown>> = [];
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
      phase: "live",
    } as never);
    recordRevealedLines(s1, MatchId.make("m1"), Array.from({ length: 3 }, (_, minute) => ({ minute, tag: "ShotMissed", text: "Wide." })));
    (window as unknown as { cmClone: { call: unknown } }).cmClone = {
      call: async (method: string, payload: Record<string, unknown>) => {
        if (method === "getLeagueTable") {
          return { _tag: "Success", value: { season: { ...leagueTable.season, awaitingFixture: null }, standings: [] } };
        }
        calls.push(payload);
        return { _tag: "Success", value: view() };
      },
    };
    render(
      <RegistryProvider>
        <MatchOverviewPanel saveId={s1} />
      </RegistryProvider>,
    );
    await waitFor(() => expect(calls.length).toBeGreaterThanOrEqual(1));
    expect(calls[0]).toMatchObject({ matchId: "m1", revealedEvents: 3 });

    recordRevealedLines(s1, MatchId.make("m1"), Array.from({ length: 9 }, (_, minute) => ({ minute, tag: "ShotMissed", text: "Wide." })));
    await waitFor(() => expect(calls.at(-1)).toMatchObject({ matchId: "m1", revealedEvents: 9 }));
  });
});
