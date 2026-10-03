import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SaveId } from "@cm-clone/contracts";
import { TransferHistoryScreen } from "../../../src/renderer/transferHistory/TransferHistoryScreen.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";

afterEach(() => cleanup());

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>): void => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const rid = (id: string): SaveId => SaveId.make(id);

const renderScreen = () =>
  render(
    <RegistryProvider>
      <TransferHistoryScreen saveId={rid("s1")} />
    </RegistryProvider>,
  );

const success = (value: unknown) => ({ _tag: "Success", value });
const failure = (error: unknown) => ({ _tag: "Failure", error });

const respondWith = (value: unknown) =>
  mockPreload(async (method) =>
    method === "getTransferHistoryScreen"
      ? success(value)
      : failure({ _tag: "SaveNotFoundError", id: "s1" }),
  );

const paidTransfer = {
  id: 2,
  transferredOn: "2026-08-20",
  playerFirstName: "John",
  playerLastName: "Smith",
  fromClubName: "Rival FC",
  toClubName: "Our Club",
  fee: 3_000_000,
};

/** No selling Club — a Free Agent signing, at a Credits 0 fee. */
const freeAgentSigning = {
  id: 1,
  transferredOn: "2026-07-01",
  playerFirstName: "Jane",
  playerLastName: "Doe",
  fromClubName: null,
  toClubName: "Our Club",
  fee: 0,
};

describe("TransferHistoryScreen", () => {
  it("shows a loading line while the read is in flight", () => {
    mockPreload(() => new Promise(() => {})); // never resolves
    renderScreen();
    expect(screen.getByText("Loading transfer history...")).toBeTruthy();
  });

  it("shows an empty state when the club has completed no transfer", async () => {
    respondWith({ entries: [] });
    renderScreen();

    expect(await screen.findByText("Your club has completed no transfer yet.")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("lists date, Player, from Club, to Club and fee, in the order the read returned", async () => {
    respondWith({ entries: [paidTransfer, freeAgentSigning] });
    renderScreen();

    const table = await screen.findByRole("table", { name: "Transfer History" });
    expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual([
      "Date",
      "Player",
      "From",
      "To",
      "Fee",
    ]);

    const rows = within(table).getAllByRole("row");
    // Header plus the two transfers, newest first as the read returned them.
    expect(rows).toHaveLength(3);

    const newest = within(rows[1]!).getAllByRole("cell").map((c) => c.textContent);
    expect(newest).toEqual([
      "20 Aug 2026",
      "John Smith",
      "Rival FC",
      "Our Club",
      "3,000,000 Credits",
    ]);
  });

  it("shows a Free Agent signing, which has no selling Club, as Free Agent at Credits 0", async () => {
    respondWith({ entries: [freeAgentSigning] });
    renderScreen();

    const table = await screen.findByRole("table", { name: "Transfer History" });
    const cells = within(within(table).getAllByRole("row")[1]!)
      .getAllByRole("cell")
      .map((c) => c.textContent);
    expect(cells).toEqual(["1 Jul 2026", "Jane Doe", "Free Agent", "Our Club", "0 Credits"]);
  });

  it("shows the failure message when the read fails", async () => {
    mockPreload(async () => failure({ _tag: "SaveNotFoundError", id: "s1" }));
    renderScreen();

    expect(await screen.findByText("That save could not be found.")).toBeTruthy();
  });
});
