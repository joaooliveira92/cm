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
  // One wording for "not played yet" across every Fixture list in the game. This screen used to
  // render a bare `-`, which reads as a missing value rather than a state and announces as
  // nothing at all; the Competition Fixtures list already said "Unplayed".
  it("reads an unplayed Fixture as Unplayed and fabricates no score", async () => {
    mount();
    expect(await screen.findByText("Unplayed")).toBeDefined();
    expect(screen.getByText("3 - 1")).toBeDefined();
    expect(screen.queryByText("-")).toBeNull();
    expect(screen.queryByText("null - null")).toBeNull();
  });
});
