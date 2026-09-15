// @vitest-environment jsdom
import { PlayerId } from "@cm-clone/contracts";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PlayerCoachReportScreen } from "../../../src/renderer/playerCoachReport/PlayerCoachReportScreen.js";
import {
  attributeLabel,
  describeAttributeChange,
  describeComparison,
} from "../../../src/renderer/playerCoachReport/developmentProgress.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { mockPreload, rid, trainingPlanSquad } from "../training/fixtures.js";

afterEach(() => cleanup());

const renderScreen = (playerId = "p1") =>
  render(
    <RegistryProvider>
      <PlayerCoachReportScreen saveId={rid("s1")} playerId={PlayerId.make(playerId)} />
    </RegistryProvider>,
  );

interface SeasonWire {
  readonly seasonNumber: number;
  readonly comparedWithSeason: number | null;
  readonly changes: ReadonlyArray<{ readonly attribute: string; readonly from: number; readonly to: number }>;
}

const failure = (error: unknown) => ({ _tag: "Failure", error });

/** `getSquad` is trainingPlanSquad (p1 Technical, p2 None); `getPlayerDevelopmentHistory` answers `history`. */
const fakeMain = ({
  seasons = [],
  history,
  squad,
}: {
  readonly seasons?: readonly SeasonWire[];
  readonly history?: (playerId: string) => unknown;
  readonly squad?: () => unknown;
} = {}) => {
  const calls: Array<{ method: string; payload: unknown }> = [];
  mockPreload(async (method, payload) => {
    calls.push({ method, payload });
    const input = payload as { playerId?: string };
    if (method === "getSquad") return squad?.() ?? { _tag: "Success", value: trainingPlanSquad() };
    if (method === "getPlayerDevelopmentHistory") {
      return history?.(input.playerId ?? "") ?? { _tag: "Success", value: { playerId: input.playerId, seasons } };
    }
    return failure({ _tag: "SaveNotFoundError", id: rid("s1") });
  });
  return calls;
};

describe("ticket 07 — Performance Report (Screen 113)", () => {
  it("shows the player's Training Focus on the shared plan summary card", async () => {
    fakeMain();
    renderScreen("p1");

    expect(await screen.findByRole("heading", { level: 1, name: "Rui Costa — Performance Report" })).toBeTruthy();
    const card = screen.getByRole("region", { name: "Rui Costa training plan" });
    expect(within(card).getByText("Training Focus: Technical")).toBeTruthy();
    expect(screen.queryByText(/Placeholder/)).toBeNull();
  });

  it("shows None as a Training Focus, not a blank", async () => {
    fakeMain();
    renderScreen("p2");

    const card = await screen.findByRole("region", { name: "Vitor Baia training plan" });
    expect(within(card).getByText("Training Focus: None")).toBeTruthy();
  });

  it("lists recorded development newest Season first, with each Attribute change in words", async () => {
    const calls = fakeMain({
      seasons: [
        {
          seasonNumber: 3,
          comparedWithSeason: 2,
          changes: [
            { attribute: "firstTouch", from: 10, to: 12 },
            { attribute: "pace", from: 16, to: 15 },
          ],
        },
        { seasonNumber: 2, comparedWithSeason: 1, changes: [] },
        { seasonNumber: 1, comparedWithSeason: null, changes: [] },
      ],
    });
    renderScreen("p1");

    const list = await screen.findByRole("list", { name: "Development by Season" });
    const seasons = within(list).getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);
    expect(seasons).toEqual(["Season 3", "Season 2", "Season 1"]);

    const changes = screen.getByRole("list", { name: "Season 3 Attribute changes" });
    expect(within(changes).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "First Touch 10 to 12 (+2)",
      "Pace 16 to 15 (-1)",
    ]);
    expect(screen.getByText("No Attribute changed since Season 1.")).toBeTruthy();
    expect(screen.getByText(/First recorded Season at your club/)).toBeTruthy();

    // The read is for this player on this save — the progress is theirs, not the squad's.
    expect(calls.find((call) => call.method === "getPlayerDevelopmentHistory")?.payload).toEqual({
      saveId: "s1",
      playerId: "p1",
    });
  });

  it("says no development is recorded before any Season has concluded", async () => {
    fakeMain({ seasons: [] });
    renderScreen("p1");

    expect(await screen.findByText(/No Season has concluded with this player at your club yet/)).toBeTruthy();
    expect(screen.queryByRole("list", { name: "Development by Season" })).toBeNull();
  });

  it("keeps the Training Focus when the development read fails, and says why progress is missing", async () => {
    fakeMain({ history: () => failure({ _tag: "NotYourPlayerError", playerId: "p1" }) });
    renderScreen("p1");

    expect(await screen.findByRole("region", { name: "Rui Costa training plan" })).toBeTruthy();
    const progress = screen.getByRole("region", { name: "Development Progress" });
    expect(await within(progress).findByText("That player does not belong to your club.")).toBeTruthy();
  });

  it("covers own players only: a player outside the squad gets a message and no development read", async () => {
    const calls = fakeMain();
    renderScreen("elsewhere");

    expect(
      await screen.findByText("That player does not belong to your club. The performance report covers your own players."),
    ).toBeTruthy();
    expect(calls.some((call) => call.method === "getPlayerDevelopmentHistory")).toBe(false);
  });

  it("shows the squad read's failure", async () => {
    fakeMain({ squad: () => failure({ _tag: "SaveNotFoundError", id: "s1" }) });
    renderScreen("p1");

    expect(await screen.findByText("That save could not be found.")).toBeTruthy();
  });
});

describe("development progress wording", () => {
  it.each([
    ["passing", "Passing"],
    ["firstTouch", "First Touch"],
    ["naturalFitness", "Natural Fitness"],
    ["gkHandling", "GK Handling"],
    ["gkCommandOfArea", "GK Command Of Area"],
  ])("labels %s as %s", (attribute, label) => {
    expect(attributeLabel(attribute)).toBe(label);
  });

  it("carries the direction in text, not colour: a sign on every non-zero change", () => {
    expect(describeAttributeChange({ attribute: "pace", from: 14, to: 15 })).toBe("Pace 14 to 15 (+1)");
    expect(describeAttributeChange({ attribute: "pace", from: 15, to: 13 })).toBe("Pace 15 to 13 (-2)");
  });

  it("names the Season a change is measured from, including across a gap", () => {
    expect(describeComparison({ comparedWithSeason: 2, changes: [{}] })).toBe("Changes since Season 2:");
    expect(describeComparison({ comparedWithSeason: 2, changes: [] })).toBe("No Attribute changed since Season 2.");
    expect(describeComparison({ comparedWithSeason: null, changes: [] })).toMatch(/No earlier Attributes/);
  });
});
