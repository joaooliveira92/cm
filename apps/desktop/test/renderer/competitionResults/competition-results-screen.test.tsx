/**
 * Competition Results (Screen 164, group-l ticket 07).
 *
 * The screen reads the *same* RPC as Screen 163 and differs only in what it keeps and how it
 * orders. So the assertions worth making are exactly those two things — that unplayed fixtures are
 * gone and that the played ones are newest first — plus that it adds no read of its own, which a
 * responder failing every other method proves.
 */
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ClubId, CompetitionId, FixtureId, SaveId } from "@cm-clone/contracts";
import { CompetitionResultsScreen } from "../../../src/renderer/competitionResults/CompetitionResultsScreen.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const fixture = (
  id: number,
  date: string,
  played: boolean,
  home: string,
  away: string,
  goals: readonly [number, number] | null,
) => ({
  id: FixtureId.make(id),
  round: id,
  date,
  homeClubId: ClubId.make(`club-${id}a`),
  homeClubName: home,
  awayClubId: ClubId.make(`club-${id}b`),
  awayClubName: away,
  homeGoals: goals?.[0] ?? null,
  awayGoals: goals?.[1] ?? null,
  played,
});

/** Date-ascending, as `getCompetitionFixtures` returns it — two played, one not. */
const card = [
  fixture(1, "2024-08-10", true, "Ashford Athletic", "Bridgeport City", [3, 1]),
  fixture(2, "2024-08-17", true, "Carrow Town", "Dunmore Rangers", [0, 2]),
  fixture(3, "2024-08-24", false, "Ashford Athletic", "Carrow Town", null),
];

/** Answer only the fixtures read; anything else fails, so a second read would be caught. */
const respondWith = (fixtures: ReadonlyArray<unknown>) => {
  mockPreload(async (method) => {
    if (method !== "getCompetitionFixtures") {
      return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: "s1" } } as never;
    }
    return {
      _tag: "Success",
      value: {
        season: {
          seasonNumber: 1,
          currentDate: "2024-08-20",
          phase: "in_season",
          awaitingFixture: null,
        },
        fixtures,
      },
    } as never;
  });
};

const renderScreen = () =>
  render(
    <RegistryProvider>
      <CompetitionResultsScreen
        saveId={SaveId.make("s1")}
        competitionId={CompetitionId.make("comp_eng_1")}
      />
    </RegistryProvider>,
  );

afterEach(() => cleanup());

describe("CompetitionResultsScreen", () => {
  it("shows only played fixtures, and counts them", async () => {
    respondWith(card);
    renderScreen();

    await waitFor(() => expect(screen.getByText(/2 results/)).toBeTruthy());
    expect(screen.getByText("Ashford Athletic")).toBeTruthy();
    // The unplayed fixture's wording must not appear at all — it is filtered, not styled away.
    expect(screen.queryByText("Unplayed")).toBeNull();
  });

  /** The one thing a results list orders differently from a calendar. */
  it("orders newest first, reversing the read's date-ascending card", async () => {
    respondWith(card);
    renderScreen();

    const table = await screen.findByRole("table", { name: "Competition Results" });
    const rows = within(table).getAllByRole("row").slice(1); // drop the header
    expect(rows).toHaveLength(2);
    expect(rows[0]!.textContent).toContain("Carrow Town");
    expect(rows[1]!.textContent).toContain("Ashford Athletic");
  });

  it("says so when nothing has been played, rather than showing an empty table", async () => {
    respondWith([fixture(3, "2024-08-24", false, "Ashford Athletic", "Carrow Town", null)]);
    renderScreen();

    await waitFor(() =>
      expect(
        screen.getByText("No fixture in this competition has been played yet."),
      ).toBeTruthy(),
    );
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("reads one RPC and no other", async () => {
    const calls: string[] = [];
    mockPreload(async (method) => {
      calls.push(method);
      if (method !== "getCompetitionFixtures") {
        return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: "s1" } } as never;
      }
      return {
        _tag: "Success",
        value: {
          season: { seasonNumber: 1, currentDate: "2024-08-20", phase: "in_season", awaitingFixture: null },
          fixtures: card,
        },
      } as never;
    });
    renderScreen();

    await waitFor(() => expect(screen.getByText(/2 results/)).toBeTruthy());
    expect([...new Set(calls)]).toEqual(["getCompetitionFixtures"]);
  });

  it("reports a failed read instead of an empty results list", async () => {
    mockPreload(
      async () =>
        ({ _tag: "Failure", error: { _tag: "SaveNotFoundError", id: "s1" } }) as never,
    );
    renderScreen();

    await waitFor(() => expect(screen.getByRole("main", { name: "Competition Results" })).toBeTruthy());
    expect(screen.queryByRole("table")).toBeNull();
  });
});
