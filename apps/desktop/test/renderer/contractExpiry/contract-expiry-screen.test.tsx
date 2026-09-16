// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContractExpiryScreen } from "../../../src/renderer/contractExpiry/ContractExpiryScreen.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { SaveId } from "@cm-clone/contracts";

vi.mock("../../../src/renderer/navigation/adapter.js", () => ({
  navigateCareer: vi.fn(),
}));

import { navigateCareer } from "../../../src/renderer/navigation/adapter.js";

afterEach(() => cleanup());

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>): void => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const rid = (id: string): SaveId => SaveId.make(id);

const renderScreen = () =>
  render(
    <RegistryProvider>
      <ContractExpiryScreen saveId={rid("s1")} />
    </RegistryProvider>,
  );

const success = (value: unknown) => ({ _tag: "Success", value });
const failure = (error: unknown) => ({ _tag: "Failure", error });

describe("ContractExpiryScreen", () => {
  it("shows loading state initially", () => {
    mockPreload(() => new Promise(() => {})); // never resolves
    renderScreen();
    expect(screen.getByText("Loading expiring contracts...")).toBeTruthy();
  });

  it("shows empty message when no players are expiring", async () => {
    mockPreload(async (method) => {
      if (method === "getContractExpiryScreen") {
        return success({ players: [] });
      }
      return failure({ _tag: "SaveNotFoundError", id: "s1" });
    });
    renderScreen();

    expect(
      await screen.findByText(
        "No players at your club have a Contract expiring at the end of this season.",
      ),
    ).toBeTruthy();
  });

  it("lists players with wage, years remaining, and links to their contract", async () => {
    mockPreload(async (method) => {
      if (method === "getContractExpiryScreen") {
        return success({
          players: [
            {
              playerId: "p1",
              firstName: "John",
              lastName: "Smith",
              wage: 52000,
              yearsRemaining: 1,
            },
            {
              playerId: "p2",
              firstName: "Jane",
              lastName: "Doe",
              wage: 44000,
              yearsRemaining: 1,
            },
          ],
        });
      }
      return failure({ _tag: "SaveNotFoundError", id: "s1" });
    });
    renderScreen();

    expect(await screen.findByText("John Smith")).toBeTruthy();
    expect(screen.getByText("Jane Doe")).toBeTruthy();
    expect(screen.getByText("52,000 Credits/season")).toBeTruthy();
    expect(screen.getByText("44,000 Credits/season")).toBeTruthy();
    // Two buttons linking to player contract screen
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);

    // Click the first button and verify navigation to the Player Contract screen
    fireEvent.click(buttons[0]!);
    expect(navigateCareer).toHaveBeenCalledWith(
      { type: "playerContract", saveId: rid("s1"), playerId: "p1" },
      "pointer",
    );
  });

  it("shows failure message on error", async () => {
    mockPreload(async () => {
      return failure({ _tag: "SaveNotFoundError", id: "s1" });
    });
    renderScreen();

    expect(
      await screen.findByText("That save could not be found."),
    ).toBeTruthy();
  });
});