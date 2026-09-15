// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MatchId, SaveId } from "@cm-clone/contracts";
import { PostMatchSummary } from "../../../src/renderer/match/PostMatchSummary.js";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { MatchDayScreen } from "../../../src/renderer/match/MatchDayScreen.js";
import { clearActiveMatch, getActiveMatch, setActiveMatch } from "../../../src/renderer/match/session.js";
import { getScopeState, resetScopeState } from "../../../src/renderer/actions/scopeState.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";

const summary = (events: ReadonlyArray<Record<string, unknown>>) => ({
  matchId: "m1",
  homeClubId: "home",
  homeClubName: "Home FC",
  awayClubId: "away",
  awayClubName: "Away FC",
  homeScore: 2,
  awayScore: 1,
  events,
});

const EVENTS = [
  { minute: 12, kind: "Goal", clubId: "home", playerId: "p1", playerName: "Ada Stone" },
  { minute: 30, kind: "YellowCard", clubId: "away", playerId: "p2", playerName: "Ben Cole" },
  { minute: 44, kind: "Goal", clubId: "away", playerId: "p3", playerName: "Cy Moss" },
  { minute: 70, kind: "Injury", clubId: "home", playerId: "p4", playerName: "Dee Hart" },
  { minute: 88, kind: "Goal", clubId: "home", playerId: "p1", playerName: "Ada Stone" },
];

const mount = (impl: (method: string) => unknown) => {
  const calls: Array<string> = [];
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string) => {
      calls.push(method);
      return impl(method);
    },
  };
  render(<PostMatchSummary saveId={SaveId.make("s1")} matchId={MatchId.make("m1")} />);
  return calls;
};

afterEach(() => cleanup());

describe("Post-Match Summary (Screen 99)", () => {
  it("shows the final score, each side's goalscorers and the cards and injuries in words", async () => {
    mount(() => ({ _tag: "Success", value: summary(EVENTS) }));
    expect(screen.getByText("Loading the match summary...")).toBeTruthy();

    expect(await screen.findByRole("heading", { name: "Home FC 2 - 1 Away FC" })).toBeTruthy();
    const home = screen.getByRole("list", { name: "Home FC goalscorers" });
    expect(within(home).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Ada Stone 12'", "Ada Stone 88'"]);
    const away = screen.getByRole("list", { name: "Away FC goalscorers" });
    expect(within(away).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Cy Moss 44'"]);

    const incidents = screen.getByRole("list", { name: "Cards and injuries" });
    expect(within(incidents).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "30'Yellow card: Ben Cole (Away FC)",
      "70'Injury: Dee Hart (Home FC)",
    ]);
  });

  it("says so when a side did not score and nothing was booked", async () => {
    mount(() => ({ _tag: "Success", value: { ...summary([]), homeScore: 0, awayScore: 0 } }));
    expect(await screen.findByText("No cards or injuries.")).toBeTruthy();
    expect(screen.getAllByText("None")).toHaveLength(2);
  });

  it("surfaces a failed read with Retry, and Retry reads again", async () => {
    let failures = 1;
    const calls = mount(() =>
      failures-- > 0
        ? { _tag: "Failure", error: { _tag: "MatchNotFoundError", matchId: "m1" } }
        : { _tag: "Success", value: summary(EVENTS) },
    );
    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { name: "Home FC 2 - 1 Away FC" })).toBeTruthy();
    expect(calls.filter((method) => method === "getPostMatchSummary")).toHaveLength(2);
  });

  it("links to statistics, player ratings and the match report", async () => {
    const navigate = vi.fn();
    bindRouter({ navigate, history: { back: () => undefined, forward: () => undefined, canGoBack: () => false } } as never);
    mount(() => ({ _tag: "Success", value: summary(EVENTS) }));
    const review = await screen.findByRole("navigation", { name: "Post-match review" });
    for (const [label, to, params] of [
      ["Statistics", "/career/$saveId/match-stats", { saveId: "s1" }],
      ["Player ratings", "/career/$saveId/match-ratings", { saveId: "s1" }],
      ["Match report", "/career/$saveId/match-report/$matchId", { saveId: "s1", matchId: "m1" }],
    ] as const) {
      fireEvent.click(within(review).getByRole("button", { name: label }));
      expect(navigate).toHaveBeenLastCalledWith({ to, params });
    }
  });
});

describe("Match day holds the Post-Match Summary back until the result is accepted", () => {
  afterEach(() => {
    clearActiveMatch(SaveId.make("s1"));
    resetScopeState();
  });

  const mountMatchDay = (phase: "complete" | "committed", commitResult?: Record<string, unknown>) => {
    setActiveMatch({
      saveId: SaveId.make("s1"),
      match: {
        matchId: MatchId.make("m1"),
        fixtureId: 1,
        homeClubId: "home",
        homeClubName: "Home FC",
        awayClubId: "away",
        awayClubName: "Away FC",
        isHome: true,
      },
      cursor: 12,
      phase,
      streamComplete: true,
    } as never);
    const calls: Array<string> = [];
    (window as unknown as { cmClone: { call: unknown } }).cmClone = {
      call: async (method: string) => {
        calls.push(method);
        if (method === "getPostMatchSummary") return { _tag: "Success", value: summary(EVENTS) };
        if (method === "commitMatchday" && commitResult) return { _tag: "Success", value: commitResult };
        return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: "s1" } };
      },
    };
    render(
      <RegistryProvider>
        <MatchDayScreen saveId={SaveId.make("s1")} />
      </RegistryProvider>,
    );
    return calls;
  };

  it("shows neither the summary nor its review links at full time, before the result is accepted", async () => {
    const calls = mountMatchDay("complete");
    await screen.findByRole("button", { name: "Accept result" });
    expect(screen.queryByRole("region", { name: "Post-match summary" })).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Post-match review" })).toBeNull();
    expect(calls).not.toContain("getPostMatchSummary");
  });

  it("keeps an accepted result accepted — the pace ticker no longer flips it back to Accept result", async () => {
    const calls = mountMatchDay("complete", {
      fixtureId: 1,
      alreadyCommitted: false,
      homeClubId: "home",
      awayClubId: "away",
      homeGoals: 2,
      awayGoals: 1,
      otherFixturesResolved: 0,
      seasonConcluded: false,
    });
    fireEvent.click(await screen.findByRole("button", { name: "Accept result" }));
    expect(await screen.findByText("Result accepted. Continue to move on.")).toBeTruthy();
    // Several reveal ticks later the result is still accepted and the summary is up.
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(screen.queryByRole("button", { name: "Accept result" })).toBeNull();
    expect(await screen.findByRole("navigation", { name: "Post-match review" })).toBeTruthy();
    expect(calls.filter((method) => method === "commitMatchday")).toHaveLength(1);
    // Accepted means no longer in flight: Continue is no longer suspended and nothing restores it.
    expect(getScopeState().match).toBeUndefined();
    expect(getActiveMatch(SaveId.make("s1"))).toBeNull();
  });

  it("shows the summary and its review links once the result is accepted", async () => {
    mountMatchDay("committed");
    expect(await screen.findByRole("navigation", { name: "Post-match review" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Home FC 2 - 1 Away FC" })).toBeTruthy();
  });
});
