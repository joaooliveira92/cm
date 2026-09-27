import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MatchId, SaveId } from "@cm-clone/contracts";
import { MatchRatingsScreen } from "../../../src/renderer/matchRatings/MatchRatingsScreen.js";
import { clearActiveMatch, recordRevealedLines, setActiveMatch } from "../../../src/renderer/match/session.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";

/**
 * group-g-match-day ticket 10: Player Ratings (Screens 96/101) binds to a match as Match Statistics does,
 * and shows each participant's Match Rating with what happened to them, in words.
 */

const s1 = SaveId.make("s1");

const row = (overrides: Record<string, unknown>) => ({
  playerId: "p",
  playerName: "Someone",
  position: "MC",
  rating: 6,
  started: true,
  cameOnMinute: null,
  wentOffMinute: null,
  sentOff: false,
  injured: false,
  ...overrides,
});

const view = (throughMinute: number | null) => ({
  matchId: "m1",
  homeClubName: "Home FC",
  awayClubName: "Away FC",
  throughMinute,
  home: [
    row({ playerId: "h1", playerName: "Ada Keeper", position: "GK", rating: 7.4 }),
    row({ playerId: "h2", playerName: "Bo Striker", position: "ST", rating: 8, wentOffMinute: 70 }),
    row({ playerId: "h3", playerName: "Cy Sub", position: "ST", rating: 6.3, started: false, cameOnMinute: 70 }),
  ],
  away: [row({ playerId: "a1", playerName: "Dee Back", position: "DC", rating: 4.5, sentOff: true, wentOffMinute: 33, injured: false })],
});

const leagueTable = {
  season: { seasonNumber: 1, currentDate: "2026-08-01", phase: "in_season", awaitingFixture: null },
  standings: [],
};

const mount = (ratings: unknown) => {
  const calls: Array<{ method: string; payload: Record<string, unknown> }> = [];
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string, payload: Record<string, unknown>) => {
      calls.push({ method, payload });
      if (method === "getLeagueTable") return { _tag: "Success", value: leagueTable };
      if (method === "getMatchRatings") return ratings;
      return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: s1 } };
    },
  };
  render(
    <RegistryProvider>
      <MatchRatingsScreen saveId={s1} />
    </RegistryProvider>,
  );
  return calls;
};

afterEach(() => {
  cleanup();
  clearActiveMatch(s1);
});

describe("MatchRatingsScreen", () => {
  it("rates a live match up to what Match day has revealed", async () => {
    setActiveMatch({
      saveId: s1,
      match: { matchId: MatchId.make("m1"), fixtureId: 1, homeClubId: "home", homeClubName: "Home FC", awayClubId: "away", awayClubName: "Away FC", isHome: true },
      phase: "live",
    } as never);
    recordRevealedLines(s1, MatchId.make("m1"), [
      { minute: 1, tag: "MatchStarted", text: "Kick-off." },
      { minute: 12, tag: "ShotMissed", text: "Wide." },
    ]);
    const calls = mount({ _tag: "Success", value: view(12) });

    await screen.findByText("Up to 12'");
    expect(calls.find((call) => call.method === "getMatchRatings")?.payload).toEqual({ saveId: "s1", matchId: "m1", revealedEvents: 2 });
  });

  it("shows each side's ratings to one decimal, and says in words who came on, went off or was sent off", async () => {
    mount({ _tag: "Success", value: view(null) });

    const home = await screen.findByRole("table", { name: "Home FC" });
    expect(within(home).getByRole("row", { name: /Bo Striker/ }).textContent).toContain("8.0");
    expect(within(home).getByRole("row", { name: /Bo Striker/ }).textContent).toContain("Off 70'");
    expect(within(home).getByRole("row", { name: /Cy Sub/ }).textContent).toContain("On 70'");
    const away = screen.getByRole("table", { name: "Away FC" });
    expect(within(away).getByRole("row", { name: /Dee Back/ }).textContent).toContain("Sent off 33'");
    expect(screen.getByText("Full match")).toBeTruthy();
  });

  it("says so when the club has played no match, and offers a retry when the read fails", async () => {
    mount({ _tag: "Success", value: null });
    await screen.findByText("No match played yet.");
    cleanup();

    mount({ _tag: "Failure", error: { _tag: "SaveNotFoundError", id: s1 } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy());
  });
});
