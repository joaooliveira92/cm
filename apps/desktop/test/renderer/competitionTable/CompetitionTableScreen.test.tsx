// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClubId, CompetitionId, SaveId } from "@cm-clone/contracts";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { CompetitionTableScreen } from "../../../src/renderer/competitionTable/CompetitionTableScreen.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const standing = (clubId: string, clubName: string) => ({
  clubId: ClubId.make(clubId),
  clubName,
  played: 4,
  won: 3,
  drawn: 1,
  lost: 0,
  goalsFor: 8,
  goalsAgainst: 2,
  goalDifference: 6,
  points: 10,
});

const successFixture = {
  _tag: "Success" as const,
  value: {
    season: {
      seasonNumber: 1,
      currentDate: "2024-08-15",
      phase: "in_season" as const,
      awaitingFixture: null,
    },
    standings: [standing("club-1", "Ashford Athletic"), standing("club-4", "Bridgeport City")],
  },
};

const mount = (overrides?: { readonly method: string; readonly result: unknown }[]) => {
  mockPreload((method) => {
    const override = overrides?.find((o) => o.method === method);
    if (override) return Promise.resolve(override.result);
    if (method === "getCompetitionTable") return Promise.resolve(successFixture);
    return Promise.resolve({ _tag: "Success", value: null });
  });
  return render(
    <RegistryProvider>
      <CompetitionTableScreen
        saveId={SaveId.make("s1")}
        competitionId={CompetitionId.make("league-1")}
      />
    </RegistryProvider>,
  );
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

describe("CompetitionTableScreen", () => {
  it("shows the competition table heading", async () => {
    mount();
    expect(await screen.findByRole("heading", { name: "Competition Table" })).toBeDefined();
  });

  it("renders standings rows from mock data", async () => {
    mount();
    expect(await screen.findByText("Ashford Athletic")).toBeDefined();
    expect(await screen.findByText("Bridgeport City")).toBeDefined();
    // Club navigation buttons
    expect(
      screen.getByRole("button", { name: "Ashford Athletic — club staff" }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Ashford Athletic — scout report" }),
    ).toBeDefined();
  });

  it("handles error state", async () => {
    mount([
      {
        method: "getCompetitionTable",
        result: {
          _tag: "Failure" as const,
          error: { _tag: "SaveNotFoundError", id: SaveId.make("s1") },
        },
      },
    ]);
    expect(await screen.findByText("That save could not be found.")).toBeDefined();
  });

  // `getCompetitionTable` folds `toSeasonView`, which raises this. Until its error union declared
  // it, the failure did not decode at the client and the screen fell back to the generic
  // "unexpected response" line instead of the sentence describeRpcError already had for it.
  it("describes a pending-fixture integrity failure in its own words", async () => {
    mount([
      {
        method: "getCompetitionTable",
        result: {
          _tag: "Failure" as const,
          error: {
            _tag: "PendingFixtureIntegrityError",
            fixtureId: 1,
            reason: "awaiting fixture is not in the current season",
          },
        },
      },
    ]);
    expect(
      await screen.findByText("This career's next fixture is inconsistent and cannot be opened."),
    ).toBeDefined();
  });

  // The branch for a failure that carries no typed error at all — a preload answer the client
  // cannot read as either wire branch. Reachable only as a defect, which is why it says nothing
  // specific; it exists so the screen never renders a blank region.
  // Coupled to `call.ts` having no envelope-shape guard: `raw._tag` throws inside its `Effect.gen`,
  // which is what makes this a defect. Add such a guard and this test reaches the contract-decode
  // copy instead, for a reason unrelated to the branch under test.
  it("falls back to a generic message when the failure carries no typed error", async () => {
    mockPreload((method) =>
      method === "getCompetitionTable"
        ? Promise.resolve(undefined)
        : Promise.resolve({ _tag: "Success", value: null }),
    );
    render(
      <RegistryProvider>
        <CompetitionTableScreen
          saveId={SaveId.make("s1")}
          competitionId={CompetitionId.make("league-1")}
        />
      </RegistryProvider>,
    );
    expect(await screen.findByText("Failed to load competition table")).toBeDefined();
  });

  it("each club's row navigates to club staff", async () => {
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Ashford Athletic — club staff" }));
    expect(navigateSpy).toHaveBeenLastCalledWith({
      to: "/career/$saveId/club/$clubId/staff",
      params: { saveId: SaveId.make("s1"), clubId: ClubId.make("club-1") },
    });

    fireEvent.click(screen.getByRole("button", { name: "Bridgeport City — club staff" }));
    expect(navigateSpy).toHaveBeenLastCalledWith({
      to: "/career/$saveId/club/$clubId/staff",
      params: { saveId: SaveId.make("s1"), clubId: ClubId.make("club-4") },
    });
  });

  it("each club's row navigates to scout report", async () => {
    mount();
    fireEvent.click(
      await screen.findByRole("button", { name: "Ashford Athletic — scout report" }),
    );
    expect(navigateSpy).toHaveBeenLastCalledWith({
      to: "/career/$saveId/club/$clubId/scout-report",
      params: { saveId: SaveId.make("s1"), clubId: ClubId.make("club-1") },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Bridgeport City — scout report" }),
    );
    expect(navigateSpy).toHaveBeenLastCalledWith({
      to: "/career/$saveId/club/$clubId/scout-report",
      params: { saveId: SaveId.make("s1"), clubId: ClubId.make("club-4") },
    });
  });
});