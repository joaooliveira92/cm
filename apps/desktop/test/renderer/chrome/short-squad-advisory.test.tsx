/**
 * The short-squad Continue advisory in the career chrome (gate-red-on-dev 08): the outstanding band
 * says how many players the coming rollover takes, links to the Contract Expiry screen, never
 * disables Continue, and clears once a renewal brings the squad back to the floor.
 */
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { PlayerId } from "@cm-clone/contracts";
import { SQUAD_FLOOR } from "@cm-clone/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetBindingOverrides } from "../../../src/renderer/actions/bindingState.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { renewContractMutation, useAtomSet } from "../../../src/renderer/rpc.js";
import {
  mockPreload,
  mountRoutedCareer,
  resetCareerHarness,
  rid,
  SAMPLE_TACTIC,
  tacticsPayload,
} from "./career-harness.js";

beforeEach(resetCareerHarness);

afterEach(() => {
  cleanup();
  resetScopeState();
  resetBindingOverrides();
});

const expiringPlayer = (n: number) => ({
  playerId: `p${n}`,
  firstName: "Leaving",
  lastName: `Player ${n}`,
  wage: 5_000,
  yearsRemaining: 1,
});

/** A wire where the squad is 17 and `world.leaving` players are in their last contracted year. A
 *  renewal takes one player off the list, as the main read would after the Contract is rewritten. */
const shortSquadWire = (initialLeaving: number) => {
  const world = { leaving: initialLeaving, advanceCalls: 0, expiryReads: 0 };
  mockPreload(async (method) => {
    switch (method) {
      case "getLeagueTable":
        return {
          _tag: "Success",
          value: {
            season: { seasonNumber: 1, awaitingFixture: null, currentDate: "2026-07-10", phase: "pre_season" as const },
            standings: [],
          },
        } as never;
      case "getTactics":
        return tacticsPayload(SAMPLE_TACTIC);
      case "getContractExpiryScreen":
        world.expiryReads += 1;
        return {
          _tag: "Success",
          value: {
            players: Array.from({ length: world.leaving }, (_, i) => expiringPlayer(i + 1)),
            squadSize: 17,
          },
        } as never;
      case "renewContract":
        world.leaving -= 1;
        // Only has to decode against `TransfersScreenView` to count as success.
        return {
          _tag: "Success",
          value: {
            club: { id: "club-1", name: "Test FC", statureTier: "big" },
            season: { seasonNumber: 1, currentDate: "2026-07-10", phase: "pre_season", awaitingFixture: null },
            windowOpen: true,
            transferBudgetRemaining: 0,
            wageBudget: 10_000,
            wageBudgetUsed: 5_000,
            incomingBids: [],
            outgoingBids: [],
            freeAgents: [],
            marketPlayers: [],
          },
        } as never;
      case "advanceCalendar":
        world.advanceCalls += 1;
        return {
          _tag: "Success",
          value: {
            season: { seasonNumber: 1, awaitingFixture: null, currentDate: "2026-07-17", phase: "pre_season" as const },
            resolvedDate: "2026-07-10",
            transferWindowClosed: null,
            transferWindowOpened: null,
            seasonConcluded: false,
            boardObjectiveVerdict: null,
            managerOutcome: "none" as const,
          },
        } as never;
      default:
        return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: rid("s1") } } as never;
    }
  });
  return world;
};

/** Renews one Contract through the real mutation atom, inside the career's registry. */
const RenewProbe = () => {
  const renew = useAtomSet(renewContractMutation);
  return (
    <button
      type="button"
      onClick={() => renew({ saveId: rid("s1"), playerId: PlayerId.make("p1"), years: 3 })}
    >
      Probe renew
    </button>
  );
};

const band = () => screen.findByRole("region", { name: "Outstanding before you continue" });

describe("the short-squad advisory", () => {
  it("names how many are leaving and links to the Contract Expiry screen", async () => {
    shortSquadWire(3);
    const navigated: string[] = [];
    await mountRoutedCareer("league");
    bindRouter({
      navigate: (opts: { to: string }) => navigated.push(opts.to),
      history: { back: () => undefined, forward: () => undefined, canGoBack: () => false },
    } as never);

    const outstanding = await band();
    expect(within(outstanding).getByText(/Squad short after this Season/)).toBeTruthy();
    expect(
      within(outstanding).getByText(
        `3 players' Contracts end this Season, leaving 14, below a squad of ${SQUAD_FLOOR}. Renew them through the Contract Expiry screen while a Transfer Window is open, or the Youth Intake makes up the numbers with raw players aged 16 to 18.`,
      ),
    ).toBeTruthy();

    fireEvent.click(within(outstanding).getByRole("button", { name: "Contract Expiry" }));
    expect(navigated).toEqual(["/career/$saveId/contract-expiry"]);
  });

  it("never blocks Continue", async () => {
    const world = shortSquadWire(3);
    await mountRoutedCareer("league");
    await band();

    const button = screen.getByRole("button", { name: /Continue/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    act(() => button.click());
    await waitFor(() => expect(world.advanceCalls).toBe(1));
  });

  it("says nothing when the players who stay reach the floor", async () => {
    const world = shortSquadWire(1);
    await mountRoutedCareer("league");
    // The absence only means something once the contract expiry read has landed.
    await waitFor(() => expect(world.expiryReads).toBeGreaterThan(0));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.queryByText(/Squad short after this Season/)).toBeNull();
    expect(screen.queryByRole("region", { name: "Outstanding before you continue" })).toBeNull();
  });

  it("clears after a renewal brings the squad back to the floor, with no manual reload", async () => {
    shortSquadWire(2);
    await mountRoutedCareer("league", RenewProbe);
    expect(within(await band()).getByText(/leaving 15/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Probe renew" }));

    await waitFor(() =>
      expect(screen.queryByText(/Squad short after this Season/)).toBeNull(),
    );
  });
});
