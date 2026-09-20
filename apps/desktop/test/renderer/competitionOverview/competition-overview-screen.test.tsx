/**
 * Competition Overview (Screen 161, group-l ticket 08).
 *
 * The page links rather than lists, so the assertions are about exactly that: the three siblings
 * are reachable from it, nothing from the eleven `deferred` screens is, and it reads one RPC.
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CompetitionId, SaveId } from "@cm-clone/contracts";
import { CompetitionOverviewScreen } from "../../../src/renderer/competitionOverview/CompetitionOverviewScreen.js";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";

const saveId = SaveId.make("s1");
const competitionId = CompetitionId.make("comp_eng_1");

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const overview = (patch: Record<string, unknown> = {}) => ({
  competitionId,
  competitionName: "English First Division",
  nationName: "England",
  kind: "league",
  season: { seasonNumber: 1, currentDate: "2024-08-01", phase: "in_season", awaitingFixture: null },
  clubCount: 20,
  playedCount: 4,
  remainingCount: 376,
  ...patch,
});

const respondWith = (value: unknown) => {
  mockPreload(async (method) => {
    if (method !== "getCompetitionOverview") {
      return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: "s1" } } as never;
    }
    return { _tag: "Success", value } as never;
  });
};

let navigateSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  navigateSpy = vi.fn();
  bindRouter({
    navigate: navigateSpy,
    history: { back: vi.fn(), forward: vi.fn(), canGoBack: () => false },
  } as never);
});

afterEach(() => cleanup());

const renderScreen = () =>
  render(
    <RegistryProvider>
      <CompetitionOverviewScreen saveId={saveId} competitionId={competitionId} />
    </RegistryProvider>,
  );

describe("CompetitionOverviewScreen", () => {
  it("names the competition, its kind, its nation and its season", async () => {
    respondWith(overview());
    renderScreen();

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "English First Division", level: 1 })).toBeTruthy(),
    );
    expect(screen.getByText(/League · England · Season 1/)).toBeTruthy();
  });

  it("shows the card's shape without listing any of it", async () => {
    respondWith(overview());
    renderScreen();

    await waitFor(() => expect(screen.getByText("Played")).toBeTruthy());
    expect(screen.getByText("4")).toBeTruthy();
    expect(screen.getByText("376")).toBeTruthy();
    // No rows: the siblings own those, and reimplementing them here is the thing to avoid.
    expect(screen.queryByRole("table")).toBeNull();
  });

  /** A cup drawn from other competitions has no fixed field, and 0 would be a claim. */
  it("shows an em dash, not zero, when the club count is null", async () => {
    respondWith(overview({ clubCount: null, kind: "cup", nationName: null }));
    renderScreen();

    await waitFor(() => expect(screen.getByText("—")).toBeTruthy());
    expect(screen.getByText(/^Cup · Season 1$/)).toBeTruthy();
  });

  it.each([
    ["Table", "competitionTable", "/career/$saveId/competition/$competitionId/table"],
    ["Fixtures", "competitionFixturesDetail", "/career/$saveId/competition/$competitionId/fixtures"],
    ["Results", "competitionResults", "/career/$saveId/competition/$competitionId/results"],
  ])("reaches %s, which had no entry point before this screen", async (label, _type, to) => {
    respondWith(overview());
    renderScreen();

    fireEvent.click(await screen.findByRole("button", { name: label }));
    expect(navigateSpy).toHaveBeenLastCalledWith({ to, params: { saveId, competitionId } });
  });

  /**
   * Eleven Group L screens are deferred for want of a model. A dashboard invites a panel for each,
   * and a link to a screen that does not exist is worse than no link.
   */
  it("offers nothing for the deferred screens", async () => {
    respondWith(overview());
    renderScreen();

    await waitFor(() => expect(screen.getByRole("button", { name: "Table" })).toBeTruthy());
    for (const absent of ["Statistics", "Records", "Awards", "Stages", "Rules", "History", "Draw"]) {
      expect(screen.queryByRole("button", { name: new RegExp(absent, "i") })).toBeNull();
    }
  });

  it("reads one RPC and no other", async () => {
    const calls: string[] = [];
    mockPreload(async (method) => {
      calls.push(method);
      if (method !== "getCompetitionOverview") {
        return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: "s1" } } as never;
      }
      return { _tag: "Success", value: overview() } as never;
    });
    renderScreen();

    await waitFor(() => expect(screen.getByText("Played")).toBeTruthy());
    expect([...new Set(calls)]).toEqual(["getCompetitionOverview"]);
  });

  it("reports an unknown competition rather than rendering a blank page", async () => {
    mockPreload(
      async () =>
        ({
          _tag: "Failure",
          error: { _tag: "CompetitionNotFoundError", id: competitionId },
        }) as never,
    );
    renderScreen();

    await waitFor(() =>
      expect(screen.getByText("That competition could not be found.")).toBeTruthy(),
    );
  });
});
