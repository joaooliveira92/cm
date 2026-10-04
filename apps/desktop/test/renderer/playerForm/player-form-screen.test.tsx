import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlayerId } from "@cm-clone/contracts";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { PlayerFormScreen } from "../../../src/renderer/playerForm/PlayerFormScreen.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { mockPreload, profileFigures, rid, squadPlayer, trainingPlanSquad } from "../training/fixtures.js";

/**
 * The Form tab (match-screen ticket 19): the four row states render as their own text, the form
 * strip shows the rounded ratings, and a played row shows the Match Rating. The read is the main
 * process's; here the preload bridge is faked so the screen's rendering is what is under test.
 */
const saveId = rid("s1");
const playerId = PlayerId.make("p-1");
const me = "club_eng_1_01";

const profileOf = () => {
  const player = squadPlayer("p1", "Rui", "Costa", null);
  return {
    id: "p1",
    firstName: "Rui",
    lastName: "Costa",
    age: player.age,
    nationality: player.nationality,
    birthplace: "Porto",
    positions: player.positions,
    positionLabel: player.positionLabel,
    canPlay: player.canPlay,
    positionOrder: player.positionOrder,
    attributes: profileFigures(player.attributes),
    overallRating: { _tag: "exact", value: player.overallRating },
    transferValue: { _tag: "exact", value: 1_000_000 },
    club: trainingPlanSquad().club,
    contractExpiry: "Season 2",
    injuryStatus: "fit",
  };
};

const emptyLine = {
  keyPasses: 0,
  offsides: 0,
  fouls: 0,
  assists: 0,
  shots: 0,
  shotsOnTarget: 0,
  saves: 0,
  goals: 0,
  tacklesWon: null,
  tacklesAttempted: null,
  headers: null,
  headersWon: null,
  interceptions: null,
  runs: null,
  foulsSuffered: null,
};

const formView = () => ({
  playerId,
  clubs: [{ clubId: me, clubName: "Test FC" }],
  selectedClubId: me,
  games: [
    {
      fixtureId: 1,
      date: "2024-08-10",
      opponentClubName: "Rivals",
      isHome: true,
      state: "played",
      result: "win",
      card: "none",
      started: true,
      cameOnMinute: null,
      wentOffMinute: null,
      ...emptyLine,
      keyPasses: 1,
      goals: 1,
      rating: 7.8,
      matchId: null,
    },
    { fixtureId: 2, date: "2024-08-17", opponentClubName: "Wanderers", isHome: false, state: "unusedSubstitute", result: "draw", card: "none", started: false, cameOnMinute: null, wentOffMinute: null, ...emptyLine, rating: null, matchId: null },
    { fixtureId: 3, date: "2024-08-24", opponentClubName: "Athletic", isHome: true, state: "notSelected", result: "loss", card: "none", started: false, cameOnMinute: null, wentOffMinute: null, ...emptyLine, rating: null, matchId: null },
    { fixtureId: 4, date: "2024-08-31", opponentClubName: "Town", isHome: true, state: "noRecord", result: null, card: "none", started: false, cameOnMinute: null, wentOffMinute: null, ...emptyLine, rating: null, matchId: null },
  ],
  formRatings: [7.8, 5.4],
  goalkeeper: false,
  season: [
    { kind: "overall", label: "Overall", starts: 1, subs: 1, goals: 1, assists: 0, mom: 1, yellowCards: 0, redCards: 0, tackles: 3, shots: 0, shotsOnTarget: 0, fouls: 2, foulsSuffered: 1, averageRating: null },
  ],
});

const install = () => {
  mockPreload(async (method: string) => {
    switch (method) {
      case "getPlayerProfile":
        return { _tag: "Success", value: profileOf() };
      case "getPlayerContract":
        return {
          _tag: "Success",
          value: {
            playerId,
            clubId: me,
            wage: 900,
            lengthYears: 1,
            startDate: "Season 1",
            expiryDate: "Season 2",
          },
        };
      case "getPlayerForm":
        return { _tag: "Success", value: formView() };
      default:
        return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: saveId } };
    }
  });
};

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  install();
  bindRouter({
    navigate: () => {},
    history: { back: () => {}, forward: () => {}, canGoBack: () => false },
  } as never);
});

afterEach(cleanup);

describe("PlayerFormScreen", () => {
  it("renders each non-appearance state as its own text and the form strip rounded", async () => {
    render(
      <RegistryProvider>
        <PlayerFormScreen saveId={saveId} playerId={playerId} />
      </RegistryProvider>,
    );

    expect(await screen.findByText("Unused substitute")).toBeDefined();
    expect(screen.getByText("Not selected")).toBeDefined();
    expect(screen.getByText("No player record")).toBeDefined();
    expect(screen.getByText("Form: 8 5")).toBeDefined();
    expect(screen.getByText("7.8")).toBeDefined();
    expect(screen.getByText("Rivals")).toBeDefined();

    // The recorded-defending columns read "-" when the line's timeline predates them.
    const games = screen.getByRole("table", { name: "Recent games" });
    expect(within(games).getByRole("row", { name: /Rivals/ }).textContent).toContain("-");

    // The season block draws "starts (sub)", the MoM count, and "-" for Sh Tar and Av R with no shots.
    const season = await screen.findByRole("region", { name: "Season totals" });
    expect(within(season).getByRole("row", { name: /Overall/ }).textContent).toContain("1 (1)");
    expect(within(season).getAllByText("-")).toHaveLength(2);
  });
});
