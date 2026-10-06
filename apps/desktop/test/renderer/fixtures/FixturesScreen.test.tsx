import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ClubId, FixtureId, SaveId } from "@cm-clone/contracts";
import { FixturesScreen } from "../../../src/renderer/fixtures/FixturesScreen.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const fixture = (id: number, played: boolean) => ({
  id: FixtureId.make(id),
  round: id,
  date: `2024-08-${10 + id}`,
  homeClubId: ClubId.make("club-1"),
  homeClubName: "Ashford Athletic",
  awayClubId: ClubId.make("club-4"),
  awayClubName: "Bridgeport City",
  homeGoals: played ? 3 : null,
  awayGoals: played ? 1 : null,
  played,
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
    fixtures: [fixture(1, true), fixture(2, false)],
  },
};

const mount = () => {
  mockPreload((method) =>
    method === "getFixtures"
      ? Promise.resolve(successFixture)
      : Promise.resolve({ _tag: "Success", value: null }),
  );
  return render(
    <RegistryProvider>
      <FixturesScreen saveId={SaveId.make("s1")} />
    </RegistryProvider>,
  );
};

afterEach(() => cleanup());

describe("FixturesScreen", () => {
  // The calendar opens on the game date, so both August fixtures are on screen. A played Fixture's
  // chip carries its score; an unplayed one reads "vs" and has no score slot at all, so there is no
  // bare `-` or `null - null` to mistake for a result.
  it("shows each Fixture on the calendar with a score only once it is played", async () => {
    mount();
    expect(await screen.findByText("Ashford Athletic 3 - 1 Bridgeport City")).toBeDefined();
    expect(screen.getByText("Ashford Athletic vs Bridgeport City")).toBeDefined();
    expect(screen.getByText("August 2024")).toBeDefined();
    expect(screen.queryByText(/null/)).toBeNull();
  });
});
