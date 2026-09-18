// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ClubId, CompetitionId, FixtureId, SaveId } from "@cm-clone/contracts";
import { CompetitionFixturesDetailScreen } from "../../../src/renderer/competitionFixturesDetail/CompetitionFixturesDetailScreen.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const playedFixture = {
  id: FixtureId.make(1),
  round: 1,
  date: "2024-08-10",
  homeClubId: ClubId.make("club-1"),
  homeClubName: "Ashford Athletic",
  awayClubId: ClubId.make("club-4"),
  awayClubName: "Bridgeport City",
  homeGoals: 3,
  awayGoals: 1,
  played: true,
};

const unplayedFixture = {
  id: FixtureId.make(2),
  round: 2,
  date: "2024-08-17",
  homeClubId: ClubId.make("club-4"),
  homeClubName: "Bridgeport City",
  awayClubId: ClubId.make("club-1"),
  awayClubName: "Ashford Athletic",
  homeGoals: null,
  awayGoals: null,
  played: false,
};

const successFixture = {
  _tag: "Success" as const,
  value: {
    season: {
      seasonNumber: 1,
      currentDate: "2024-08-15",
      phase: "in_season" as const,
      awaitingFixture: null,
    },
    fixtures: [playedFixture, unplayedFixture],
  },
};

/** Payloads the screen actually sent, so a read scoped to the wrong Competition cannot pass. */
const sentPayloads: { readonly method: string; readonly payload: unknown }[] = [];

const mount = (overrides?: { readonly method: string; readonly result: unknown }[]) => {
  sentPayloads.length = 0;
  mockPreload((method, payload) => {
    sentPayloads.push({ method, payload });
    const override = overrides?.find((o) => o.method === method);
    if (override) return Promise.resolve(override.result);
    if (method === "getCompetitionFixtures") return Promise.resolve(successFixture);
    return Promise.resolve({ _tag: "Success", value: null });
  });
  return render(
    <RegistryProvider>
      <CompetitionFixturesDetailScreen
        saveId={SaveId.make("s1")}
        competitionId={CompetitionId.make("league-1")}
      />
    </RegistryProvider>,
  );
};

/** Every body row the screen rendered, in fixture order. `data-played` is the marker the screen
 *  puts on fixture rows, so it also excludes the header row. */
const fixtureRows = async () => {
  await screen.findByRole("heading", { name: "Competition Fixtures" });
  return await waitFor(() => {
    const rows = screen.getAllByRole("row").filter((row) => row.hasAttribute("data-played"));
    expect(rows.length).toBeGreaterThan(0);
    return rows;
  });
};

afterEach(() => cleanup());

describe("CompetitionFixturesDetailScreen", () => {
  it("shows the competition fixtures heading", async () => {
    mount();
    expect(await screen.findByRole("heading", { name: "Competition Fixtures" })).toBeDefined();
  });

  it("lists each fixture with its date, home club and away club", async () => {
    mount();
    const rows = await fixtureRows();
    expect(rows).toHaveLength(2);
    // Dates are rendered through the shared calendar formatter, so assert on the row text rather
    // than a hard-coded display string.
    expect(rows[0]?.textContent).toContain("Ashford Athletic");
    expect(rows[0]?.textContent).toContain("Bridgeport City");
    expect(rows[0]?.textContent).toContain("10");
    // Home and away are separate columns, in the order the fixture fixes them.
    const [, , home, away] = [...(rows[0]?.children ?? [])];
    expect(home?.textContent).toBe("Ashford Athletic");
    expect(away?.textContent).toBe("Bridgeport City");
  });

  it("distinguishes played from unplayed fixtures and fabricates no score", async () => {
    mount();
    const [played, unplayed] = await fixtureRows();

    expect(played?.dataset.played).toBe("true");
    expect(played?.textContent).toContain("3 - 1");

    expect(unplayed?.dataset.played).toBe("false");
    expect(unplayed?.textContent).toContain("Unplayed");
    expect(unplayed?.textContent).not.toContain("null");
    expect(unplayed?.textContent).not.toContain("0 - 0");
    expect(unplayed?.className).not.toBe(played?.className);
  });

  it("shows a loading state while the read is in flight", () => {
    mockPreload(() => new Promise(() => {}));
    render(
      <RegistryProvider>
        <CompetitionFixturesDetailScreen
          saveId={SaveId.make("s1")}
          competitionId={CompetitionId.make("league-1")}
        />
      </RegistryProvider>,
    );
    expect(screen.getByText("Loading competition fixtures...")).toBeDefined();
  });

  it("handles error state", async () => {
    mount([
      {
        method: "getCompetitionFixtures",
        result: {
          _tag: "Failure" as const,
          error: { _tag: "SaveNotFoundError", id: SaveId.make("s1") },
        },
      },
    ]);
    expect(await screen.findByText("That save could not be found.")).toBeDefined();
  });
});

it("scopes the read to the competition in the route, not to the save alone", async () => {
  mount();
  await fixtureRows();

  const sent = sentPayloads.find((call) => call.method === "getCompetitionFixtures");
  expect(sent?.payload).toEqual({ saveId: "s1", competitionId: "league-1" });
});
