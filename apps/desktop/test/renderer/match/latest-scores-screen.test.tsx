import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SaveId } from "@cm-clone/contracts";
import { MatchLatestScoresScreen } from "../../../src/renderer/match/screens/LatestScoresScreen.js";

const view = (overrides: Record<string, unknown> = {}) => ({
  date: "2026-08-01",
  resolved: true,
  groups: [
    {
      competitionId: "league-eng-1",
      competitionName: "English League One",
      fixtures: [
        { id: 2, homeClubId: "b", homeClubName: "Beta FC", awayClubId: "c", awayClubName: "Gamma FC", homeGoals: 2, awayGoals: 1, homePenalties: null, awayPenalties: null },
      ],
    },
    {
      competitionId: "cup-eng",
      competitionName: "English Cup",
      fixtures: [
        { id: 3, homeClubId: "d", homeClubName: "Delta FC", awayClubId: "e", awayClubName: "Epsilon FC", homeGoals: 1, awayGoals: 1, homePenalties: 4, awayPenalties: 3 },
      ],
    },
  ],
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
  render(<MatchLatestScoresScreen saveId={SaveId.make("s1")} />);
  return calls;
};

afterEach(() => cleanup());

describe("Latest Scores", () => {
  it("groups the day's other fixtures by competition and shows full-time scores", async () => {
    const calls = mount(() => ({ _tag: "Success", value: view() }));

    expect(await screen.findByRole("heading", { name: "Latest Scores" })).toBeTruthy();
    expect(calls).toEqual([{ method: "getLatestScores", payload: { saveId: "s1" } }]);

    const league = screen.getByRole("region", { name: "English League One" });
    expect(within(league).getByText("2 - 1")).toBeTruthy();
    expect(within(league).getByRole("listitem").textContent).toBe("Beta FC 2 - 1 Gamma FC");

    const cup = screen.getByRole("region", { name: "English Cup" });
    expect(within(cup).getByText("1 - 1 (4-3 pens)")).toBeTruthy();
    expect(screen.queryByText("Results come in at full time.")).toBeNull();
  });

  it("shows no score and the full-time caption until the result is accepted", async () => {
    mount(() => ({
      _tag: "Success",
      value: view({
        resolved: false,
        groups: [
          {
            competitionId: "league-eng-1",
            competitionName: "English League One",
            fixtures: [
              { id: 2, homeClubId: "b", homeClubName: "Beta FC", awayClubId: "c", awayClubName: "Gamma FC", homeGoals: null, awayGoals: null, homePenalties: null, awayPenalties: null },
            ],
          },
        ],
      }),
    }));

    expect(await screen.findByText("Results come in at full time.")).toBeTruthy();
    expect(screen.getByText("v")).toBeTruthy();
    expect(screen.queryByText("2 - 1")).toBeNull();
  });

  it("says so when no other fixture shares the date", async () => {
    mount(() => ({ _tag: "Success", value: view({ groups: [] }) }));
    expect(await screen.findByText("No other fixtures on this date.")).toBeTruthy();
  });

  it("surfaces a failed read with Retry, and Retry reads again", async () => {
    let failures = 1;
    const calls = mount(() =>
      failures-- > 0
        ? { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: "s1" } }
        : { _tag: "Success", value: view() },
    );
    expect(await screen.findByText("That save could not be found.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { name: "Latest Scores" })).toBeTruthy();
    expect(calls).toHaveLength(2);
  });
});
