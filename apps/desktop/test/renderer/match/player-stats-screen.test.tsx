import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SaveId } from "@cm-clone/contracts";
import { MatchPlayerStatsScreen } from "../../../src/renderer/match/screens/PlayerStatsScreen.js";
import { clearActiveMatch } from "../../../src/renderer/match/session.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";

const s1 = SaveId.make("s1");

const row = (overrides: Record<string, unknown>) => ({
  playerId: "p1",
  playerName: "Alice Keeper",
  number: "1",
  captain: false,
  card: "none",
  started: true,
  played: true,
  cameOnMinute: null,
  wentOffMinute: null,
  keyPasses: 0,
  offsides: 0,
  fouls: 0,
  assists: 0,
  shots: 0,
  shotsOnTarget: 0,
  saves: 0,
  goals: 0,
  condition: null,
  rating: null,
  ...overrides,
});

const view = (homeShowSaves = true) => ({
  matchId: "m1",
  homeClubName: "Home FC",
  awayClubName: "Away FC",
  throughMinute: null,
  home: {
    clubId: "home",
    clubName: "Home FC",
    showSaves: homeShowSaves,
    rows: [
      row({ playerId: "p1", playerName: "Alice Keeper", number: "1", captain: true, card: "yellow", keyPasses: 2, assists: 1, shots: 3, shotsOnTarget: 2, saves: 4, goals: 1, condition: 88, rating: 7.8 }),
      row({ playerId: "p2", playerName: "Bob Bench", number: "SB1", started: false, played: false, rating: null }),
    ],
  },
  away: {
    clubId: "away",
    clubName: "Away FC",
    showSaves: false,
    rows: [row({ playerId: "p3", playerName: "Away Star", number: "1", card: "red", started: true, played: true, goals: 2, shots: 2, shotsOnTarget: 2, rating: 8.1 })],
  },
});

const leagueTable = {
  season: { seasonNumber: 1, currentDate: "2026-08-01", phase: "in_season", awaitingFixture: null },
  standings: [],
};

const mount = (homeShowSaves = true) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string) =>
      method === "getLeagueTable"
        ? { _tag: "Success", value: leagueTable }
        : { _tag: "Success", value: view(homeShowSaves) },
  };
  render(
    <RegistryProvider>
      <MatchPlayerStatsScreen saveId={s1} side="home" />
    </RegistryProvider>,
  );
};

afterEach(() => {
  cleanup();
  clearActiveMatch(s1);
});

describe("Match Player Stats screen (map ticket 12)", () => {
  it("names the club in the heading and states the fold rule once", async () => {
    mount();
    expect(await screen.findByRole("heading", { name: "Home FC Stats" })).toBeTruthy();
    expect(screen.getByText("Only what the match records is shown.")).toBeTruthy();
  });

  it("exposes full column names while drawing the abbreviation", async () => {
    mount();
    await screen.findByRole("table");
    expect(screen.getByRole("columnheader", { name: /Key passes/ })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: /Shots on target/ })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: /Match Rating/ })).toBeTruthy();
  });

  it("writes a card glyph's meaning as text, and dims an unused substitute empty rather than zero", async () => {
    mount();
    await screen.findByRole("table");
    expect(screen.getAllByRole("img", { name: "Booked" }).length).toBeGreaterThan(0);

    const bench = screen.getByRole("button", { name: /Bob Bench/ }).closest("tr")!;
    const cells = within(bench).getAllByRole("cell").map((cell) => cell.textContent?.trim() ?? "");
    expect(cells.some((text) => text === "0")).toBe(false);
  });

  it("shows the saves column only when a goalkeeper has one, per side", async () => {
    mount(true);
    await screen.findByRole("table");
    expect(screen.queryByRole("columnheader", { name: /Saves/ })).toBeTruthy();
  });

  it("drops the saves column for a side whose keeper made none", async () => {
    mount(false);
    await screen.findByRole("table");
    expect(screen.queryByRole("columnheader", { name: /Saves/ })).toBeNull();
  });
});
