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

describe("the league table row is the entry point to every club-scoped surface", () => {
  /**
   * Both club surfaces hang off the league table row, and this spec exists because the entry point
   * to one of them was once silently repointed at the other: the row stopped reaching the scout
   * report, the file guarding it was renamed onto the new behaviour, and the suite stayed green
   * while the report became reachable only by typing a URL. Asserting the destinations by name
   * here is what makes that failure loud — a rename cannot satisfy both cases at once.
   */
  const SURFACES = [
    { label: "club staff", to: "/career/$saveId/club/$clubId/staff" },
    { label: "scout report", to: "/career/$saveId/club/$clubId/scout-report" },
  ] as const;

  it.each(SURFACES)("each club's row reaches its own $label page", async ({ label, to }) => {
    mount();

    fireEvent.click(await screen.findByRole("button", { name: `Northport Rovers — ${label}` }));
    expect(navigateSpy).toHaveBeenLastCalledWith({
      to,
      params: { saveId: SaveId.make("s1"), clubId: ClubId.make("club-7") },
    });

    fireEvent.click(screen.getByRole("button", { name: `Eastvale United — ${label}` }));
    expect(navigateSpy).toHaveBeenLastCalledWith({
      to,
      params: { saveId: SaveId.make("s1"), clubId: ClubId.make("club-9") },
    });
  });

  it.each(SURFACES)("the $label entry is reachable as a control, so keyboard users get there too", async ({ label }) => {
    mount();
    const control = await screen.findByRole("button", { name: `Northport Rovers — ${label}` });
    // A keyboard activation reports `detail: 0`, which is what makes the adapter request focus on
    // the arriving screen rather than leaving it stranded on the table.
    fireEvent.click(control, { detail: 0 });
    expect(navigateSpy).toHaveBeenCalled();
  });

  it("only the club surfaces are controls — the result cells stay unclickable", async () => {
    mount();
    await screen.findByRole("button", { name: "Northport Rovers — club staff" });
    const buttons = [...document.querySelectorAll("button")];
    expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual([
      "Northport Rovers — club staff",
      "Northport Rovers — scout report",
      "Eastvale United — club staff",
      "Eastvale United — scout report",
    ]);
  });
});
