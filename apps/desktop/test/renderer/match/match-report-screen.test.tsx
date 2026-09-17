// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MatchId, SaveId } from "@cm-clone/contracts";
import { MatchReportScreen } from "../../../src/renderer/matchReport/MatchReportScreen.js";

const report = (overrides: Record<string, unknown> = {}) => ({
  matchId: "m1",
  homeClubId: "home",
  homeClubName: "Home FC",
  awayClubId: "away",
  awayClubName: "Away FC",
  homeScore: 2,
  awayScore: 1,
  halfTimeHomeScore: 1,
  halfTimeAwayScore: 1,
  events: [
    { minute: 12, half: 1, kind: "Goal", clubId: "home", playerId: "p1", playerName: "Ada Stone", replaced: null },
    { minute: 30, half: 1, kind: "YellowCard", clubId: "away", playerId: "p2", playerName: "Ben Cole", replaced: null },
    { minute: 44, half: 1, kind: "Goal", clubId: "away", playerId: "p3", playerName: "Cy Moss", replaced: null },
    { minute: 70, half: 2, kind: "Injury", clubId: "home", playerId: "p4", playerName: "Dee Hart", replaced: null },
    {
      minute: 71,
      half: 2,
      kind: "Substitution",
      clubId: "home",
      playerId: "p5",
      playerName: "Eli Park",
      replaced: { playerId: "p4", playerName: "Dee Hart", forcedByInjury: true },
    },
    {
      minute: 80,
      half: 2,
      kind: "GoalkeeperStandIn",
      clubId: "away",
      playerId: "p6",
      playerName: "Fay Lund",
      replaced: { playerId: "p7", playerName: "Gus Ward", forcedByInjury: false },
    },
    {
      minute: 85,
      half: 2,
      kind: "GoalkeeperStandIn",
      clubId: "away",
      playerId: "p2",
      playerName: "Ben Cole",
      replaced: { playerId: "p6", playerName: "Fay Lund", forcedByInjury: true },
    },
    { minute: 88, half: 2, kind: "Goal", clubId: "home", playerId: "p1", playerName: "Ada Stone", replaced: null },
  ],
  statistics: {
    matchId: "m1",
    homeClubName: "Home FC",
    awayClubName: "Away FC",
    throughMinute: null,
    rows: [{ key: "goals", home: 2, away: 1 }],
    unavailable: ["possession", "corners", "fouls", "offsides"],
  },
  ...overrides,
});

const mount = (impl: (method: string, payload: Record<string, unknown>) => unknown) => {
  const calls: Array<{ method: string; payload: Record<string, unknown> }> = [];
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string, payload: Record<string, unknown>) => {
      calls.push({ method, payload });
      return impl(method, payload);
    },
  };
  render(<MatchReportScreen saveId={SaveId.make("s1")} matchId={MatchId.make("m1")} />);
  return calls;
};

afterEach(() => cleanup());

describe("Match Report (Screen 103)", () => {
  it("reads the named match and reports the result, goalscorers, timeline and statistics", async () => {
    const calls = mount(() => ({ _tag: "Success", value: report() }));
    expect(screen.getByText("Loading the match report...")).toBeTruthy();

    expect(await screen.findByRole("heading", { name: "Home FC 2 - 1 Away FC" })).toBeTruthy();
    expect(calls).toEqual([{ method: "getMatchReport", payload: { saveId: "s1", matchId: "m1" } }]);
    expect(screen.getByText("Home FC beat Away FC 2-1.")).toBeTruthy();
    expect(screen.getByText("Half time: Home FC 1 - 1 Away FC")).toBeTruthy();

    const home = screen.getByRole("list", { name: "Home FC goalscorers" });
    expect(within(home).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Ada Stone 12'", "Ada Stone 88'"]);
    expect(within(screen.getByRole("list", { name: "Away FC goalscorers" })).getAllByRole("listitem")).toHaveLength(1);

    const timeline = screen.getByRole("list", { name: "Match timeline" });
    expect(within(timeline).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "12'Goal: Ada Stone (Home FC)",
      "30'Yellow card: Ben Cole (Away FC)",
      "44'Goal: Cy Moss (Away FC)",
      "70'Injury: Dee Hart (Home FC)",
      "71'Substitution: Eli Park on for the injured Dee Hart (Home FC)",
      "80'Goalkeeper stand-in: Fay Lund moves into goal for Gus Ward (Away FC)",
      "85'Goalkeeper stand-in: Ben Cole moves into goal for the injured Fay Lund (Away FC)",
      "88'Goal: Ada Stone (Home FC)",
    ]);

    const statistics = screen.getByRole("region", { name: "Match statistics" });
    expect(within(statistics).getByText("Full match")).toBeTruthy();
  });

  it("words an away win and a draw as whole sentences", async () => {
    mount(() => ({ _tag: "Success", value: report({ homeScore: 0, awayScore: 3 }) }));
    expect(await screen.findByText("Away FC won 3-0 away at Home FC.")).toBeTruthy();
    cleanup();
    mount(() => ({ _tag: "Success", value: report({ homeScore: 1, awayScore: 1, events: [] }) }));
    expect(await screen.findByText("Home FC and Away FC drew 1-1.")).toBeTruthy();
    expect(screen.getByText("No goals, cards, injuries or substitutions.")).toBeTruthy();
    expect(screen.getAllByText("None")).toHaveLength(2);
  });

  it("says a match awaiting its result has no report yet, without offering Retry", async () => {
    mount(() => ({ _tag: "Failure", error: { _tag: "MatchNotCompleteError", matchId: "m1" } }));
    expect(await screen.findByText("The match report is available once the result has been accepted.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });

  it("surfaces a failed read with Retry, and Retry reads again", async () => {
    let failures = 1;
    const calls = mount(() =>
      failures-- > 0
        ? { _tag: "Failure", error: { _tag: "MatchNotFoundError", matchId: "m1" } }
        : { _tag: "Success", value: report() },
    );
    expect(await screen.findByText("That match could not be found.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { name: "Home FC 2 - 1 Away FC" })).toBeTruthy();
    expect(calls).toHaveLength(2);
  });
});
