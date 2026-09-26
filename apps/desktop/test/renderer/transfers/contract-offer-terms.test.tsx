import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlayerId } from "@cm-clone/contracts";
import type { SaveId } from "@cm-clone/contracts";
import {
  registerActionHandler,
  resetActionHandlers,
} from "../../../src/renderer/actions/dispatch.js";
import { RegistryProvider, contractOfferAtom, useAtomRefresh } from "../../../src/renderer/rpc.js";
import {
  ContractOfferTerms,
  type ContractTerms,
} from "../../../src/renderer/transfers/ContractOfferTerms.js";
import { mockPreload, rid } from "../training/fixtures.js";
import { chooseOptionByLabel, comboboxByLabel, selectValueOf } from "../../setup/baseUiSelect.js";

/**
 * The Contract Offer terms form (Screen 137, group-j ticket 09): the three terms `signFreeAgent`
 * takes, and the rule that keeps the wage inside the band the offer read published.
 */

const saveId = rid("s1");
const playerId = PlayerId.make("p-1");
const name = "Alex Brown";

interface World {
  wage: { _tag: "exact"; value: number } | { _tag: "range"; low: number; high: number };
  refusal: Record<string, unknown> | null;
  /** How many times the offer read has been served, so a test can prove it saw a *second* offer
   *  rather than asserting on a form that never re-read anything. */
  reads: number;
  /** What the form dispatched to the `sign-free-agent` Action. The RPC call itself is the
   *  command's business (covered in `test/main/transfers/contract-offer-terms.test.ts`); what
   *  belongs to this form is the three terms it hands over. */
  readonly dispatches: Array<Record<string, unknown>>;
}

let world: World;

/** A fresh object every call, the way a decoded wire payload is: the form must not be treating the
 *  identity of a read as "the manager typed something new". */
const offer = () => ({
  playerId,
  firstName: "Alex",
  lastName: "Brown",
  age: 24,
  positions: [
    { position: "ST", familiarity: "natural" },
    { position: "AMC", familiarity: "competent" },
  ],
  overallRating: { _tag: "range", low: 58, high: 98 },
  transferValue: { _tag: "range", low: 400_000, high: 900_000 },
  wage: world.wage,
});

const install = () => {
  mockPreload(async (method: string) => {
    switch (method) {
      case "getContractOffer":
        world.reads += 1;
        return world.refusal === null
          ? { _tag: "Success", value: offer() }
          : { _tag: "Failure", error: world.refusal };
      default:
        return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: saveId } };
    }
  });
};

const mount = (windowOpen = true) => {
  const termsRef: React.MutableRefObject<ContractTerms | null> = { current: null };
  render(
    <RegistryProvider>
      <ContractOfferTerms
        saveId={saveId as SaveId}
        playerId={playerId}
        playerName={name}
        windowOpen={windowOpen}
        termsRef={termsRef}
      />
      <ReReadOffer />
    </RegistryProvider>,
  );
  return termsRef;
};

/** Forces the real re-read the atom is built for — the same call the screen's retry Actions and a
 *  moved Scouting Progress key make — rather than a prop or a re-render. */
const ReReadOffer = () => {
  const refresh = useAtomRefresh(contractOfferAtom(saveId as SaveId, playerId));
  return (
    <button type="button" onClick={() => refresh()}>
      Re-read
    </button>
  );
};

const signButton = () => screen.findByRole("button", { name: "Sign (0 Cr)" });
/** The same button looked up synchronously, for use once the offer read has already landed and
 *  `findByRole` would only be awaiting a render that has happened. */
const renderedSignButton = () => screen.getByRole("button", { name: "Sign (0 Cr)" });
const wageInput = () => screen.getByLabelText("Weekly wage") as HTMLInputElement;
const reRead = () => screen.getByRole("button", { name: "Re-read" });

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  world = { wage: { _tag: "range", low: 900, high: 3_400 }, refusal: null, reads: 0, dispatches: [] };
  install();
  // The form hands its terms to the Action registry, which the Transfers screen binds to the
  // command. Registering a stand-in here is what lets the form's own boundary be asserted.
  registerActionHandler("sign-free-agent", (params) => {
    world.dispatches.push(params as Record<string, unknown>);
  });
});

afterEach(() => {
  cleanup();
  resetActionHandlers();
  vi.unstubAllGlobals();
});

describe("the Contract Offer terms form", () => {
  it("offers the Role of each Position the player actually plays, and the shared length bounds", async () => {
    mount();
    // The Role choice is the Position choice: `POSITION_ROLES` names it, so the form never offers a
    // Role this player does not hold.
    await screen.findByRole("combobox", { name: `Role offered to ${name}` });
    // The trigger shows the value; the option labels carry the Position each Role came from.
    expect(selectValueOf(comboboxByLabel(`Role offered to ${name}`))).toBe("Poacher");
    await chooseOptionByLabel(`Role offered to ${name}`, "AttackingMidfielder (AMC)");
    expect(selectValueOf(comboboxByLabel(`Role offered to ${name}`))).toBe("AttackingMidfielder");

    // 1-5 years, off the shared bounds — the same ones the command enforces.
    const lengths = comboboxByLabel(`Contract length offered to ${name}`);
    expect(selectValueOf(lengths)).toBe("3");
    await chooseOptionByLabel(`Contract length offered to ${name}`, "5 years");
    expect(selectValueOf(lengths)).toBe("5");
  });

  it("seeds a whole-number wage inside the published band and sends all three terms on Sign", async () => {
    const termsRef = mount();
    await waitFor(() => {
      expect(Number(wageInput().value)).toBeGreaterThanOrEqual(900);
    });
    // A wage the manager did not type is one the manager is offering, so it has to be whole: this
    // band's midpoint is 2150, and `wageIsWithinFigure` refuses a fraction, so a form that seeded
    // one would open on terms its own submit button rejects.
    const seeded = Number(wageInput().value);
    expect(Number.isInteger(seeded)).toBe(true);
    expect(seeded).toBeGreaterThanOrEqual(900);
    expect(seeded).toBeLessThanOrEqual(3_400);

    fireEvent.click(await signButton());
    await waitFor(() => {
      expect(world.dispatches).toHaveLength(1);
    });
    expect(world.dispatches[0]).toMatchObject({
      playerId,
      role: "Poacher",
      years: 3,
      wage: seeded,
    });
    expect(termsRef.current).toEqual({ role: "Poacher", years: 3, wage: seeded });
  });

  it("keeps the typed wage and Role when the same player's offer is read again", async () => {
    mount();
    await waitFor(() => {
      expect(wageInput().value).not.toBe("");
    });
    expect(world.reads).toBe(1);

    // What the manager typed and picked. The wage is the *upper* end of the first band, so the
    // re-read below can only leave it alone by choice: a band that still contained it would prove
    // nothing.
    fireEvent.change(wageInput(), { target: { value: "3000" } });
    await chooseOptionByLabel(`Role offered to ${name}`, "AttackingMidfielder (AMC)");
    expect(selectValueOf(comboboxByLabel(`Role offered to ${name}`))).toBe("AttackingMidfielder");

    // The manager's own scouting advances, so the re-read publishes a narrower band that no longer
    // supports 3000 — and a different midpoint, which is what a re-seed would have written.
    world.wage = { _tag: "range", low: 400, high: 900 };
    fireEvent.click(reRead());
    await waitFor(() => {
      expect(world.reads).toBe(2);
    });

    // A second, distinct offer object for the same player has landed, and the terms the manager was
    // working on are still the terms on screen.
    expect(wageInput().value).toBe("3000");
    expect(selectValueOf(comboboxByLabel(`Role offered to ${name}`))).toBe("AttackingMidfielder");
    // Which means the submit button now refuses: the knowledge moved, and saying so beats quietly
    // offering a wage the manager never chose.
    expect(renderedSignButton().hasAttribute("disabled")).toBe(true);
    expect(screen.getByText(/wage must be/i)).toBeDefined();
    fireEvent.click(renderedSignButton());
    expect(world.dispatches).toHaveLength(0);

    // A re-seed would have written 650 (the new midpoint), so the value above is the assertion.
    expect(Number(wageInput().value)).not.toBe(650);
  });

  it("seeds the next player's own band rather than carrying the last player's wage over", async () => {
    // One mount, the player prop changed the way the screen changes it when the manager picks a
    // different Free Agent: the old wage belonged to the old player's knowledge.
    const termsRef: React.MutableRefObject<ContractTerms | null> = { current: null };
    const { rerender } = render(
      <RegistryProvider>
        <ContractOfferTerms
          saveId={saveId as SaveId}
          playerId={playerId}
          playerName={name}
          windowOpen
          termsRef={termsRef}
        />
      </RegistryProvider>,
    );
    await waitFor(() => {
      expect(wageInput().value).not.toBe("");
    });
    fireEvent.change(wageInput(), { target: { value: "3000" } });

    world.wage = { _tag: "range", low: 400, high: 900 };
    rerender(
      <RegistryProvider>
        <ContractOfferTerms
          saveId={saveId as SaveId}
          playerId={PlayerId.make("p-2")}
          playerName="Sam Green"
          windowOpen
          termsRef={termsRef}
        />
      </RegistryProvider>,
    );
    await waitFor(() => {
      expect(wageInput().value).not.toBe("3000");
    });
    expect(Number(wageInput().value)).toBeGreaterThanOrEqual(400);
    expect(Number(wageInput().value)).toBeLessThanOrEqual(900);
  });

  it("refuses to submit a wage outside the band, and says which wage is supported", async () => {
    mount();
    await waitFor(() => {
      expect(wageInput().value).not.toBe("");
    });

    for (const bad of ["899", "3401", "0", "-5", "1000.5"]) {
      fireEvent.change(wageInput(), { target: { value: bad } });
      const button = renderedSignButton();
      expect(button.hasAttribute("disabled")).toBe(true);
      expect(screen.getByText(/wage must be/i)).toBeDefined();
      fireEvent.click(button);
      expect(world.dispatches).toHaveLength(0);
    }

    // A wage back inside the band enables the offer again.
    fireEvent.change(wageInput(), { target: { value: "2,000" } });
    fireEvent.change(wageInput(), { target: { value: "2000" } });
    const enabled = await screen.findByRole("button", { name: "Sign (0 Cr)" });
    expect(enabled.hasAttribute("disabled")).toBe(false);
  });

  it("seeds a whole number from a band whose midpoint is a half number", async () => {
    // 209-534 midpoints to 371.5, which the wage gate refuses: the seed has to round into the band
    // rather than hand the command a fraction.
    world.wage = { _tag: "range", low: 209, high: 534 };
    mount();
    await waitFor(() => {
      expect(wageInput().value).not.toBe("");
    });
    const seeded = Number(wageInput().value);
    expect(Number.isInteger(seeded)).toBe(true);
    expect(seeded).toBeGreaterThanOrEqual(209);
    expect(seeded).toBeLessThanOrEqual(534);
    // Rounded into the band, so the form opens signable and says nothing about a bad wage.
    expect(screen.queryByText(/wage must be/i)).toBeNull();
    expect((await signButton()).hasAttribute("disabled")).toBe(false);
  });

  it("offers exactly the one wage a Fully Scouted player supports", async () => {
    world.wage = { _tag: "exact", value: 2_100 };
    mount();
    await waitFor(() => {
      expect(wageInput().value).toBe("2100");
    });

    fireEvent.change(wageInput(), { target: { value: "2099" } });
    expect((await signButton()).hasAttribute("disabled")).toBe(true);
    fireEvent.change(wageInput(), { target: { value: "2101" } });
    expect((await signButton()).hasAttribute("disabled")).toBe(true);
    fireEvent.change(wageInput(), { target: { value: "2100" } });
    expect((await signButton()).hasAttribute("disabled")).toBe(false);
  });

  it("disables the offer when the transfer window is closed", async () => {
    mount(false);
    expect((await signButton()).hasAttribute("disabled")).toBe(true);
  });

  it("shows the refusal when the player is not a Free Agent, rather than an empty form", async () => {
    world.refusal = { _tag: "PlayerNotFreeAgentError", playerId };
    mount();
    expect(await screen.findByText(/signed to another club/i)).toBeDefined();
    expect(screen.queryByRole("button", { name: "Sign (0 Cr)" })).toBeNull();
  });
});
