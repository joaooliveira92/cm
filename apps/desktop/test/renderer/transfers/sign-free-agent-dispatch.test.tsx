import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SaveId } from "@cm-clone/contracts";
import { STATURE_TIERS } from "@cm-clone/shared";
import { TransfersScreen } from "../../../src/renderer/transfers/TransfersScreen.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { dispatchAction, resetActionHandlers } from "../../../src/renderer/actions/dispatch.js";
import { chooseOptionByLabel, selectValueOf } from "../../setup/baseUiSelect.js";

/**
 * The `sign-free-agent` Action handler (group-j ticket 09, review finding 6): which terms a
 * dispatch signs on, for each shape a dispatch can arrive in.
 *
 * The handler is registered once per save and reads the live form through a ref, so the only way to
 * reach it is the real screen with a real selection — a hand-called hook would prove nothing about
 * the payload the Sign button and the command palette actually send.
 */

const saveId = SaveId.make("s1");
const NOT_FOUND = { _tag: "SaveNotFoundError", id: saveId };

const freeAgent = (id: string) => ({
  id: SaveId.make(id),
  firstName: "Test",
  lastName: id.toUpperCase(),
  age: 24,
  clubId: null,
  clubName: null,
  overallRating: { _tag: "exact", value: 78 },
  transferValue: { _tag: "exact", value: 1_200_000 },
  positions: [],
});

const transfersView = () => ({
  club: { id: SaveId.make("me"), name: "My Club", statureTier: STATURE_TIERS[0] },
  season: {
    seasonNumber: 1,
    awaitingFixture: null,
    currentDate: "2026-08-01",
    phase: "in_season" as const,
  },
  windowOpen: true,
  transferBudgetRemaining: 500_000,
  wageBudget: 1_000_000,
  wageBudgetUsed: 300_000,
  incomingBids: [],
  outgoingBids: [],
  freeAgents: [freeAgent("fa"), freeAgent("fb")],
  marketPlayers: [],
});

/** The offer read for whichever Free Agent the screen selected. `fa` supports two Positions so the
 *  form can show a Role other than the first one, and both agents are Fully Scouted so the wage on
 *  offer is exact and any other wage is visibly the manager's own. */
const contractOffer = (playerId: string) => ({
  playerId: SaveId.make(playerId),
  firstName: "Test",
  lastName: playerId.toUpperCase(),
  age: 24,
  positions:
    playerId === "fa"
      ? [
          { position: "ST" as const, familiarity: "natural" as const },
          { position: "AMC" as const, familiarity: "competent" as const },
        ]
      : [{ position: "ST" as const, familiarity: "natural" as const }],
  overallRating: { _tag: "exact" as const, value: 78 },
  transferValue: { _tag: "exact" as const, value: 1_200_000 },
  // A band rather than an exact figure, so the manager's own wage inside it is a valid offer and
  // the terms the form mirrors are non-null — a form with invalid terms has none to sign.
  wage: { _tag: "range" as const, low: 1_000, high: 9_000 },
});

let signCalls: Array<Record<string, unknown>>;

const install = () => {
  signCalls = [];
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string, payload: unknown) => {
      if (method === "getTransfersScreen") {
        return { _tag: "Success", value: transfersView() } as never;
      }
      if (method === "getContractOffer") {
        return {
          _tag: "Success",
          value: contractOffer((payload as { playerId: string }).playerId),
        } as never;
      }
      if (method === "signFreeAgent") {
        signCalls.push(payload as Record<string, unknown>);
        return { _tag: "Success", value: transfersView() } as never;
      }
      return { _tag: "Failure", error: NOT_FOUND } as never;
    },
  };
};

/** Selects the first Free Agent and waits for the form the handler reads its terms from. */
const selectFirstFreeAgent = async () => {
  fireEvent.click(await screen.findByRole("button", { name: /Test FA/ }));
  await screen.findByRole("button", { name: "Sign (0 Cr)" });
  await chooseOptionByLabel("Role offered to Test FA", "AttackingMidfielder (AMC)");
  const wage = screen.getByLabelText("Weekly wage") as HTMLInputElement;
  fireEvent.change(wage, { target: { value: "4321" } });
  expect(selectValueOf(screen.getByRole("combobox", { name: "Role offered to Test FA" }))).toBe(
    "AttackingMidfielder",
  );
  // The premise of the bare-dispatch case: the form is holding signable terms.
  expect(screen.getByRole("button", { name: "Sign (0 Cr)" }).hasAttribute("disabled")).toBe(false);
};

const mount = () =>
  render(
    <RegistryProvider>
      <TransfersScreen saveId={saveId} />
    </RegistryProvider>,
  );

beforeEach(() => {
  install();
});

afterEach(() => {
  cleanup();
  resetActionHandlers();
});

describe("the sign-free-agent Action handler", () => {
  it("signs the terms a complete dispatch names, not the terms on screen", async () => {
    mount();
    await selectFirstFreeAgent();

    // The Sign button's own shape, naming a *different* Free Agent than the form is showing. The
    // form holds 4321 on AttackingMidfielder; this says 1111 on Poacher for two years.
    dispatchAction("sign-free-agent", {
      playerId: SaveId.make("fb"),
      role: "Poacher",
      years: 2,
      wage: 1111,
    });

    await waitFor(() => {
      expect(signCalls).toHaveLength(1);
    });
    expect(signCalls[0]).toMatchObject({
      saveId,
      playerId: SaveId.make("fb"),
      role: "Poacher",
      years: 2,
      wage: 1111,
    });
  });

  it("signs the drafted Free Agent on the form's terms for a bare dispatch", async () => {
    mount();
    await selectFirstFreeAgent();

    // What the command palette sends: no payload at all, so the form is the only source of terms.
    dispatchAction("sign-free-agent");

    await waitFor(() => {
      expect(signCalls).toHaveLength(1);
    });
    expect(signCalls[0]).toMatchObject({
      saveId,
      playerId: SaveId.make("fa"),
      role: "AttackingMidfielder",
      years: 3,
      wage: 4321,
    });
  });

  it("signs nothing when a dispatch carries a player but not a full set of terms", async () => {
    mount();
    await selectFirstFreeAgent();

    // Half a signing: a player and no terms. The form's terms belong to another player, so the only
    // safe reading is to do nothing rather than sign one player on another's numbers.
    dispatchAction("sign-free-agent", { playerId: SaveId.make("fb") });
    dispatchAction("sign-free-agent", { playerId: SaveId.make("fb"), role: "Poacher" });
    dispatchAction("sign-free-agent", { role: "Poacher", years: 2, wage: 1111 });

    await waitFor(() => {
      expect(signCalls).toHaveLength(0);
    });
  });
});
