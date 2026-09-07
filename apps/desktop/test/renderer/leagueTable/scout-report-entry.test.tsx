// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClubId, SaveId } from "@cm-clone/contracts";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { LeagueTableScreen } from "../../../src/renderer/leagueTable/LeagueTableScreen.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const standing = (clubId: string, clubName: string) => ({
  clubId: ClubId.make(clubId),
  clubName,
  played: 3,
  won: 2,
  drawn: 0,
  lost: 1,
  goalsFor: 5,
  goalsAgainst: 3,
  goalDifference: 2,
  points: 6,
});

const mount = () => {
  mockPreload(() =>
    Promise.resolve({
      _tag: "Success",
      value: {
        season: {
          seasonNumber: 1,
          currentDate: "2024-08-01",
          phase: "pre_season",
          awaitingFixture: null,
        },
        standings: [standing("club-7", "Northport Rovers"), standing("club-9", "Eastvale United")],
      },
    }),
  );
  return render(
    <RegistryProvider>
      <LeagueTableScreen saveId={SaveId.make("s1")} />
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

describe("ticket 05 — the league table row is the report's entry point", () => {
  it("each club's row opens that club's report, not a shared one", async () => {
    mount();

    fireEvent.click(await screen.findByRole("button", { name: "Northport Rovers" }));
    expect(navigateSpy).toHaveBeenLastCalledWith({
      to: "/career/$saveId/club/$clubId/scout-report",
      params: { saveId: SaveId.make("s1"), clubId: ClubId.make("club-7") },
    });

    fireEvent.click(screen.getByRole("button", { name: "Eastvale United" }));
    expect(navigateSpy).toHaveBeenLastCalledWith({
      to: "/career/$saveId/club/$clubId/scout-report",
      params: { saveId: SaveId.make("s1"), clubId: ClubId.make("club-9") },
    });
  });

  it("the entry point is reachable as a control, so keyboard users get there too", async () => {
    mount();
    const row = await screen.findByRole("button", { name: "Northport Rovers" });
    // A keyboard activation reports `detail: 0`, which is what makes the adapter request focus on
    // the arriving screen rather than leaving it stranded on the table.
    fireEvent.click(row, { detail: 0 });
    expect(navigateSpy).toHaveBeenCalled();
  });
});
