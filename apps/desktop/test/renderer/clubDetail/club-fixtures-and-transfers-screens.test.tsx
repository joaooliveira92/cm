/**
 * Club Fixtures (Screen 40) and Club Transfers (Screen 42), group-c ticket 07.
 *
 * Both render the same list component as their own-club siblings, so what is worth asserting here
 * is the part that differs: the page names the club, marks one that is not the manager's, and has
 * an empty state that is a sentence rather than a blank table.
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClubId, SaveId } from "@cm-clone/contracts";
import { ClubFixturesDetailScreen } from "../../../src/renderer/clubFixturesDetail/ClubFixturesDetailScreen.js";
import { ClubTransfersDetailScreen } from "../../../src/renderer/clubTransfersDetail/ClubTransfersDetailScreen.js";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";

const rid = (id: string): SaveId => SaveId.make(id);
const cid = (id: string): ClubId => ClubId.make(id);

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>): void => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const respondTo = (method: string, value: unknown): void => {
  mockPreload(async (called) => {
    if (called === method) return { _tag: "Success", value } as never;
    return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: rid("s1") } } as never;
  });
};

const club = { id: cid("club-7"), name: "Northport Rovers", statureTier: "mid" };

const fixturesView = (options: { readonly isUserClub?: boolean; readonly empty?: boolean } = {}) => ({
  club,
  isUserClub: options.isUserClub ?? true,
  season: { seasonNumber: 1, currentDate: "2024-08-01", phase: "in_season", awaitingFixture: null },
  fixtures: options.empty
    ? []
    : [
        {
          id: 1,
          round: 1,
          date: "2024-08-10",
          homeClubId: cid("club-7"),
          homeClubName: "Northport Rovers",
          awayClubId: cid("club-9"),
          awayClubName: "Eastvale United",
          homeGoals: null,
          awayGoals: null,
          played: false,
        },
      ],
});

const transfersView = (options: { readonly isUserClub?: boolean; readonly empty?: boolean } = {}) => ({
  club,
  isUserClub: options.isUserClub ?? true,
  entries: options.empty
    ? []
    : [
        {
          id: 1,
          transferredOn: "2024-07-01",
          playerFirstName: "Ada",
          playerLastName: "Keeper",
          fromClubName: null,
          toClubName: "Northport Rovers",
          fee: 0,
        },
      ],
});

beforeEach(() => {
  bindRouter({
    navigate: vi.fn(),
    history: { back: vi.fn(), forward: vi.fn(), canGoBack: () => false },
  } as never);
});

afterEach(() => cleanup());

const renderFixtures = () =>
  render(
    <RegistryProvider>
      <ClubFixturesDetailScreen saveId={rid("s1")} clubId={cid("club-7")} />
    </RegistryProvider>,
  );

const renderTransfers = () =>
  render(
    <RegistryProvider>
      <ClubTransfersDetailScreen saveId={rid("s1")} clubId={cid("club-7")} />
    </RegistryProvider>,
  );

describe("ClubFixturesDetailScreen", () => {
  it("titles the page with the club and lists its fixtures", async () => {
    respondTo("getClubFixtures", fixturesView());
    renderFixtures();

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Northport Rovers", level: 1 })).toBeTruthy(),
    );
    expect(screen.getByText(/Northport Rovers vs Eastvale United/)).toBeTruthy();
    // The shared list's wording for a fixture not yet played.
    expect(screen.getByText("Unplayed")).toBeTruthy();
  });

  it("marks a club that is not the manager's", async () => {
    respondTo("getClubFixtures", fixturesView({ isUserClub: false }));
    renderFixtures();

    await waitFor(() => expect(screen.getByText("[Not your club]")).toBeTruthy());
  });

  /** A `results-only` club plays no dated fixture, so empty is an answer rather than a failure. */
  it("says so when a club has no fixtures, rather than showing a blank page", async () => {
    respondTo("getClubFixtures", fixturesView({ empty: true }));
    renderFixtures();

    await waitFor(() =>
      expect(screen.getByText("This club has no fixtures this season.")).toBeTruthy(),
    );
  });

  it("reports a failed read instead of an empty list", async () => {
    mockPreload(
      async () =>
        ({ _tag: "Failure", error: { _tag: "ClubNotFoundError", id: cid("club-7") } }) as never,
    );
    renderFixtures();

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Club Fixtures", level: 1 })).toBeTruthy(),
    );
  });
});

describe("ClubTransfersDetailScreen", () => {
  it("titles the page with the club and lists its transfers", async () => {
    respondTo("getClubTransfers", transfersView());
    renderTransfers();

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Northport Rovers", level: 1 })).toBeTruthy(),
    );
    expect(screen.getByRole("table", { name: "Club Transfers" })).toBeTruthy();
    // The shared table's Free Agent wording for a null selling club.
    expect(screen.getByText("Free Agent")).toBeTruthy();
  });

  it("marks a club that is not the manager's", async () => {
    respondTo("getClubTransfers", transfersView({ isUserClub: false }));
    renderTransfers();

    await waitFor(() => expect(screen.getByText("[Not your club]")).toBeTruthy());
  });

  it("says so when a club has completed no transfer", async () => {
    respondTo("getClubTransfers", transfersView({ empty: true }));
    renderTransfers();

    await waitFor(() =>
      expect(screen.getByText("This club has completed no transfer yet.")).toBeTruthy(),
    );
  });

  it("reports a failed read instead of an empty table", async () => {
    mockPreload(
      async () =>
        ({ _tag: "Failure", error: { _tag: "ClubNotFoundError", id: cid("club-7") } }) as never,
    );
    renderTransfers();

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Club Transfers", level: 1 })).toBeTruthy(),
    );
    expect(screen.queryByRole("table")).toBeNull();
  });
});
