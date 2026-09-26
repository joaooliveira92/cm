/**
 * The player screen a player's name opens on: the identity it lifts into the career navbar, the tab
 * strip, the Profile tab's
 * Attribute columns, and the Information tab's Overview + Contract Details.
 *
 * The identity and the strip are asserted here rather than once per tab because they are the thing
 * that makes the three routes read as one screen — a tab that quietly dropped them would still
 * render its own panels and no other spec would notice.
 */
import { PlayerId } from "@cm-clone/contracts";
import { GOALKEEPING_ATTRIBUTES } from "@cm-clone/shared";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { PlayerContractScreen } from "../../../src/renderer/playerContract/PlayerContractScreen.js";
import { PlayerProfileScreen } from "../../../src/renderer/playerProfile/PlayerProfileScreen.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { getScreenIdentity } from "../../../src/renderer/screenIdentity.js";
import { mockPreload, profileFigures, rid, squadPlayer, trainingPlanSquad } from "../training/fixtures.js";

const profile = (goalkeeper = false) => {
  const player = squadPlayer("p1", "Rui", "Costa", null, goalkeeper);
  return {
    id: "p1",
    firstName: "Rui",
    lastName: "Costa",
    age: player.age,
    nationality: player.nationality,
    birthplace: "Porto",
    positions: player.positions,
    attributes: profileFigures(player.attributes),
    overallRating: { _tag: "exact", value: player.overallRating },
    transferValue: { _tag: "exact", value: 1_000_000 },
    club: trainingPlanSquad().club,
    contractExpiry: "2030-06-30",
    injuryStatus: "fit",
  };
};

const contract = {
  playerId: "p1",
  clubId: "me",
  wage: 7000,
  lengthYears: 3,
  startDate: "2027-07-01",
  expiryDate: "2030-06-30",
};

const fakeMain = (goalkeeper = false) => {
  mockPreload(async (method) => {
    if (method === "getPlayerProfile") return { _tag: "Success", value: profile(goalkeeper) };
    if (method === "getPlayerContract") return { _tag: "Success", value: contract };
    return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: rid("s1") } };
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

const renderProfile = () =>
  render(
    <RegistryProvider>
      <PlayerProfileScreen saveId={rid("s1")} playerId={PlayerId.make("p1")} />
    </RegistryProvider>,
  );

describe("the player screen every player tab shares", () => {
  it("hands the navbar the player, their club and their position line, and marks the open tab", async () => {
    fakeMain();
    const { unmount } = renderProfile();

    const strip = await screen.findByRole("navigation", { name: "Player sections" });
    expect(getScreenIdentity()).toMatchObject({ name: "Rui Costa", qualifier: "Test FC", facts: "DC, Portugal, Age 25" });
    // The band's player facts, with the wage filled in from the contract read.
    await vi.waitFor(() => expect(getScreenIdentity()?.player.wage).toBe(7000));
    expect(getScreenIdentity()?.player).toMatchObject({
      transferValue: { _tag: "exact", value: 1_000_000 },
      injury: "None",
    });
    expect(within(strip).getByRole("button", { name: "Profile" }).getAttribute("aria-current")).toBe("page");
    expect(within(strip).getByRole("button", { name: "Information" }).getAttribute("aria-current")).toBeNull();

    // Leaving the player screen gives the navbar back to the club.
    unmount();
    expect(getScreenIdentity()).toBeNull();
  });

  it("keeps the focused page when the player finishes loading, and names it with a level-one heading", async () => {
    fakeMain();
    renderProfile();

    // The focus coordinator focuses the page on arrival, before the profile read resolves.
    const loading = screen.getByRole("main");
    loading.focus();

    await screen.findByRole("navigation", { name: "Player sections" });
    // The same element, still focused: a swapped-in page drops focus to <body>, and `g b` with it.
    expect(screen.getByRole("main")).toBe(loading);
    expect(document.activeElement).toBe(loading);
    expect(screen.getByRole("heading", { level: 1, name: "Rui Costa — Profile" })).toBeTruthy();
  });

  it("moves between the player's tabs from the strip", async () => {
    fakeMain();
    renderProfile();
    await screen.findByRole("navigation", { name: "Player sections" });

    fireEvent.click(screen.getByRole("button", { name: "Information" }));
    expect(navigateSpy).toHaveBeenCalledWith(expect.objectContaining({
      to: "/career/$saveId/player/$playerId/contract",
      params: expect.objectContaining({ playerId: "p1" }),
    }));
  });
});

describe("the Profile tab", () => {
  it("draws one column per Category, every Attribute in it, and the derived pair", async () => {
    fakeMain();
    renderProfile();

    const technical = await screen.findByRole("region", { name: "Technical" });
    expect(within(technical).getByText("Passing")).toBeTruthy();
    const physical = screen.getByRole("region", { name: "Physical" });
    expect(within(physical).getByText("Natural Fitness")).toBeTruthy();
    // Overall Rating and Transfer Value are derived readings, not 1-20 Attributes, and ride at the
    // foot of the last column the way CM tinted them apart.
    expect(within(physical).getByText("Overall Rating")).toBeTruthy();
    expect(within(physical).getByText("1,000,000 Cr")).toBeTruthy();

    expect(within(screen.getByRole("region", { name: "Positions" })).getByText("Natural")).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Selection Details" })).getByText("None")).toBeTruthy();
  });

  it("omits Goalkeeping for an outfield player and draws it for a goalkeeper", async () => {
    fakeMain();
    renderProfile();
    await screen.findByRole("region", { name: "Technical" });
    // Goalkeeping Attributes are absent, not zero, for an outfield player (CONTEXT.md).
    expect(screen.queryByRole("region", { name: "Goalkeeping" })).toBeNull();

    cleanup();
    fakeMain(true);
    renderProfile();
    const keeping = await screen.findByRole("region", { name: "Goalkeeping" });
    expect(within(keeping).getByText("GK Reflexes")).toBeTruthy();
    expect(GOALKEEPING_ATTRIBUTES.length).toBeGreaterThan(0);
  });
});

describe("the Profile tab reads a rival by Scouting Progress", () => {
  /** A rival below Fully Scouted: every figure is a Range, and the header band reports the same
   *  figures the columns do. */
  const rangedProfile = () => {
    const player = squadPlayer("p1", "Rui", "Costa", null);
    return {
      ...profile(),
      attributes: Object.fromEntries(
        Object.entries(player.attributes).map(([attribute, value]) => [
          attribute,
          { _tag: "range", low: Math.max(1, value - 8), high: Math.min(20, value + 8) },
        ]),
      ),
      overallRating: { _tag: "range", low: 62, high: 78 },
      transferValue: { _tag: "range", low: 500_000, high: 750_000 },
    };
  };

  it("renders Attribute Ranges for a player below Fully Scouted — never an exact figure", async () => {
    mockPreload(async (method) => {
      if (method === "getPlayerProfile") return { _tag: "Success", value: rangedProfile() };
      if (method === "getPlayerContract") return { _tag: "Success", value: contract };
      return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: rid("s1") } };
    });
    renderProfile();
    const physical = await screen.findByRole("region", { name: "Physical" });

    // The derived pair — Overall Rating and Transfer Value — render as `low–high` bands.
    expect(within(physical).getByText("62–78")).toBeTruthy();
    expect(within(physical).getByText("500,000 Cr–750,000 Cr")).toBeTruthy();
    // Every Attribute in the column is a Range too, never an exact 1-20 number.
    expect(within(physical).getAllByText("4–20").length).toBeGreaterThan(0);
    expect(within(physical).queryByText("12")).toBeNull();

    // The navbar band carries the same ranged figures for the open player.
    expect(getScreenIdentity()?.player.overallRating).toEqual({ _tag: "range", low: 62, high: 78 });
    expect(getScreenIdentity()?.player.transferValue).toEqual({
      _tag: "range",
      low: 500_000,
      high: 750_000,
    });
  });
});

describe("the Information tab", () => {
  it("carries the Overview and the Contract Details", async () => {
    fakeMain();
    render(
      <RegistryProvider>
        <PlayerContractScreen saveId={rid("s1")} playerId={PlayerId.make("p1")} />
      </RegistryProvider>,
    );

    const overview = await screen.findByRole("region", { name: "Overview" });
    expect(within(overview).getByText("Porto")).toBeTruthy();

    const details = await screen.findByRole("region", { name: "Contract Details" });
    expect(within(details).getByText("7,000 Cr per season")).toBeTruthy();
    expect(within(details).getByText("3 years")).toBeTruthy();
    expect(within(details).getByText("2030-06-30")).toBeTruthy();
  });
});
