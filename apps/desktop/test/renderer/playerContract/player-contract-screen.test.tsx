import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClubId, PlayerId } from "@cm-clone/contracts";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { PlayerContractScreen } from "../../../src/renderer/playerContract/PlayerContractScreen.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { mockPreload, profileFigures, rid, squadPlayer, trainingPlanSquad } from "../training/fixtures.js";
import { chooseOptionByLabel, comboboxByLabel, openSelect, selectValueOf } from "../../setup/baseUiSelect.js";

/**
 * Contract Renewal on the Player Contract screen (Screen 140, group-j ticket 04): the renew action
 * shows for an own-club Player only, sends `renewContract` with the chosen length, refreshes the
 * shown contract through invalidation alone, and shows each typed refusal (`TransferWindowClosedError`,
 * `WageBudgetExceededError`, `InvalidBidActionError`, and the last-year `ContractRenewalNotDueError`)
 * inline as its own sentence.
 */

const saveId = rid("s1");
const playerId = PlayerId.make("p-1");
const me = "me";

interface World {
  clubId: string;
  wage: number;
  lengthYears: number;
  refusal: Record<string, unknown> | null;
  profileOverrides: Record<string, unknown> | null;
  squadReads: number;
  readonly commands: Array<Record<string, unknown>>;
}

let world: World;

const profileOf = () => {
  const player = squadPlayer("p1", "Rui", "Costa", null);
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
    contractExpiry: "Season 2",
    injuryStatus: "fit",
  };
};

const install = () => {
  mockPreload(async (method: string, payload: unknown) => {
    switch (method) {
      case "getPlayerProfile":
        return {
          _tag: "Success",
          value: world.profileOverrides === null ? profileOf() : { ...profileOf(), ...world.profileOverrides },
        };
      case "getPlayerContract":
        return {
          _tag: "Success",
          value: {
            playerId,
            clubId: ClubId.make(world.clubId),
            wage: world.wage,
            lengthYears: world.lengthYears,
            startDate: "Season 1",
            expiryDate: `Season ${1 + world.lengthYears}`,
          },
        };
      case "getSquad":
        world.squadReads += 1;
        return {
          _tag: "Success",
          value: { club: { id: me, name: "Test FC", statureTier: "big" }, players: [] },
        };
      case "renewContract": {
        world.commands.push(payload as Record<string, unknown>);
        if (world.refusal !== null) return { _tag: "Failure", error: world.refusal };
        world.lengthYears = (payload as Record<string, unknown>)["years"] as number;
        world.wage = 1_250;
        // The success value is never read by the screen; it only has to decode against
        // `TransfersScreenView` to count as success.
        return {
          _tag: "Success",
          value: {
            club: { id: me, name: "Test FC", statureTier: "big" },
            season: { seasonNumber: 1, currentDate: "2024-08-01", phase: "pre_season", awaitingFixture: null },
            windowOpen: true,
            transferBudgetRemaining: 0,
            wageBudget: 10_000,
            wageBudgetUsed: 1_250,
            incomingBids: [],
            outgoingBids: [],
            freeAgents: [],
            marketPlayers: [],
          },
        };
      }
      default:
        return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: saveId } };
    }
  });
};

const mount = () =>
  render(
    <RegistryProvider>
      <PlayerContractScreen saveId={saveId} playerId={playerId} />
    </RegistryProvider>,
  );

const renewSection = () => screen.findByRole("region", { name: "Renew contract" });

/** The Contract Details panel — the row values ("1 year", "5 years", "Season 6", the wage) are
 *  asserted in here, because the same strings also live in the hidden Base UI select nodes that
 *  stay in the DOM after a popup closes. It appears only once the profile read the frame gates on
 *  resolves, so it is queried with `findByRole`. */
const contractDetails = () => screen.findByRole("region", { name: "Contract Details" });

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  world = { clubId: me, wage: 900, lengthYears: 1, refusal: null, profileOverrides: null, squadReads: 0, commands: [] };
  install();
  bindRouter({
    navigate: () => {},
    history: { back: () => {}, forward: () => {}, canGoBack: () => false },
  } as never);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("group-j ticket 04 — renewing an own-club Player's Contract", () => {
  it("offers every length from 1 to 5 years", async () => {
    mount();
    await renewSection();
    await openSelect(comboboxByLabel("Contract length"));
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "1 year",
      "2 years",
      "3 years",
      "4 years",
      "5 years",
    ]);
  });

  it("sends renewContract with the chosen length, and the contract refreshes to the new length and wage", async () => {
    mount();
    expect(await within(await contractDetails()).findByText("1 year")).toBeTruthy();
    await renewSection();
    await chooseOptionByLabel("Contract length", "5 years");
    expect(selectValueOf(comboboxByLabel("Contract length"))).toContain("5");
    fireEvent.click(screen.getByRole("button", { name: "Renew" }));

    await waitFor(() => expect(world.commands).toEqual([{ saveId, playerId, years: 5 }]));
    // The mutation invalidates the squad key, which the contract read reacts to, so the shown
    // contract re-reads on its own: same length, started Season 1, expiry Season 6.
    const details = await contractDetails();
    expect(await within(details).findByText("5 years")).toBeTruthy();
    expect(within(details).getByText("Season 6")).toBeTruthy();
    expect(within(details).getByText("1,250 Cr per season")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it.each([
    [{ _tag: "TransferWindowClosedError", saveId }, "The transfer window is closed."],
    [
      { _tag: "WageBudgetExceededError", clubId: me, wage: 5_000, wageBudgetUsed: 9_000, wageBudget: 10_000 },
      "The club would exceed its wage budget.",
    ],
    [
      { _tag: "InvalidBidActionError", reason: "player is not contracted to your club" },
      "That player is not contracted to your club.",
    ],
    [
      { _tag: "ContractRenewalNotDueError", playerId, yearsRemaining: 3 },
      "A contract can only be renewed in its final year.",
    ],
  ])("shows the %o refusal inline and keeps the contract as it was", async (refusal, sentence) => {
    world.refusal = refusal;
    mount();
    const section = await renewSection();
    fireEvent.click(within(section).getByRole("button", { name: "Renew" }));

    expect((await within(section).findByRole("alert")).textContent).toBe(sentence);
    expect(world.commands).toHaveLength(1);
    expect(within(await contractDetails()).getByText("1 year")).toBeTruthy();
  });
});

describe("group-j ticket 04 — no renewal outside the manager's club", () => {
  it("shows the contract without a renew action for another club's Player", async () => {
    world.clubId = "club-7";
    mount();
    expect(await within(await contractDetails()).findByText("1 year")).toBeTruthy();
    await waitFor(() => expect(world.squadReads).toBeGreaterThan(0));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole("region", { name: "Renew contract" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Renew" })).toBeNull();
  });

  it("reads a rival's Value and Overall Rating as the Attribute Ranges his profile carries (ticket 10)", async () => {
    world.clubId = "club-7";
    world.profileOverrides = {
      overallRating: { _tag: "range", low: 62, high: 78 },
      transferValue: { _tag: "range", low: 500_000, high: 750_000 },
    };
    mount();
    const overview = await screen.findByRole("region", { name: "Overview" });
    // The contract Overview shows the same banded figures the Profile tab does — never an exact
    // number for a rival below Fully Scouted — while the Contract Details keep the real rows.
    expect(within(overview).getByText("62–78")).toBeTruthy();
    expect(within(overview).getByText("500,000 Cr–750,000 Cr")).toBeTruthy();
    expect(within(await contractDetails()).getByText("1 year")).toBeTruthy();
  });
});