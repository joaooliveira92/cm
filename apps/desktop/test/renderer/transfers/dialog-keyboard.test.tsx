// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SaveId } from "@cm-clone/contracts";
import { FAMILIARITY_TIERS, STATURE_TIERS } from "@cm-clone/shared";
import { TransfersScreen } from "../../../src/renderer/transfers/TransfersScreen.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { resetActionHandlers } from "../../../src/renderer/actions/dispatch.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";
import { resetTableSessions } from "../../../src/renderer/table/tableState.js";
import { resetAnnouncements } from "../../../src/renderer/table/announcement.js";

const rid = (s: string) => SaveId.make(s);

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const NOT_FOUND = { _tag: "SaveNotFoundError", id: rid("s1") };

const marketPlayer = (
  id: string,
  name: string,
  position: string,
  club: boolean,
  overallRating = 78,
  transferValue = 1200000,
) => ({
  id: rid(id),
  firstName: name,
  lastName: "Player",
  age: 24,
  clubId: club ? rid(`club-${id}`) : null,
  clubName: club ? `Club ${id}` : null,
  overallRating,
  transferValue,
  positions: [{ position, familiarity: FAMILIARITY_TIERS[0] }],
});

const transfersView = () => ({
  club: { id: rid("me"), name: "My Club", statureTier: STATURE_TIERS[0] },
  season: { seasonNumber: 1, currentDate: "2026-08-01", phase: "in_season" as const },
  windowOpen: true,
  transferBudgetRemaining: 500000,
  wageBudget: 1000000,
  wageBudgetUsed: 300000,
  incomingBids: [
    {
      id: rid("in-1"),
      playerId: rid("p-in"),
      playerName: "Incoming",
      sellingClubId: rid("me"),
      sellingClubName: "My Club",
      biddingClubId: rid("other"),
      biddingClubName: "Other FC",
      amount: 100,
      counterAmount: null,
      status: "pending" as const,
    },
  ],
  outgoingBids: [],
  freeAgents: [marketPlayer("fa", "Fan", "ST", false)],
  marketPlayers: [marketPlayer("mp1", "Alan", "GK", true), marketPlayer("mp2", "Bob", "DC", true)],
});

const mountTransfers = async (view: unknown): Promise<void> => {
  mockPreload(async (method) => {
    if (method === "getTransfersScreen") return { _tag: "Success", value: view } as never;
    // A successful respond keeps the Enter-submit path from reporting a
    // rejection to the test runner.
    if (method === "respondToBid") return { _tag: "Success", value: view } as never;
    return { _tag: "Failure", error: NOT_FOUND } as never;
  });
  render(
    <RegistryProvider>
      <TransfersScreen saveId={rid("s1")} />
    </RegistryProvider>,
  );
};

beforeEach(() => {
  cleanup();
  resetActionHandlers();
  resetScopeState();
  resetTableSessions();
  resetAnnouncements();
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  resetActionHandlers();
  resetScopeState();
  resetTableSessions();
  resetAnnouncements();
});

describe("F-2 — the counter-offer InlineModal owns the keyboard (take, trap, Enter/Escape, return)", () => {
  it("focuses the amount input on open, traps Tab inside the dialog, Enter submits", async () => {
    await mountTransfers(transfersView());
    const counter = await screen.findByRole("button", { name: "Counter" });
    act(() => {
      counter.focus();
    });
    fireEvent.click(counter);

    const dialog = screen.getByRole("dialog", { name: "Counter Incoming" });
    const input = within(dialog).getByLabelText("Counter-offer amount (Credits)");
    const submit = within(dialog).getByRole("button", { name: "Counter" });
    // Initial focus lands inside the dialog, on the amount input.
    expect(document.activeElement).toBe(input);

    // Tab from the LAST control wraps back to the first — focus never escapes
    // the open aria-modal.
    act(() => {
      submit.focus();
    });
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(input);
    // Shift+Tab from the first control wraps to the last.
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(submit);

    // Enter submits: the dialog closes and the response runs.
    fireEvent.change(input, { target: { value: "250" } });
    fireEvent.keyDown(dialog, { key: "Enter" });
    expect(screen.queryByRole("dialog", { name: "Counter Incoming" })).toBeNull();
  });

  it("Escape cancels, and focus returns to the invoking Counter button", async () => {
    await mountTransfers(transfersView());
    const counter = await screen.findByRole("button", { name: "Counter" });
    act(() => {
      counter.focus();
    });
    fireEvent.click(counter);
    expect(screen.getByRole("dialog", { name: "Counter Incoming" })).toBeTruthy();

    fireEvent.keyDown(screen.getByRole("dialog", { name: "Counter Incoming" }), {
      key: "Escape",
    });
    expect(screen.queryByRole("dialog", { name: "Counter Incoming" })).toBeNull();
    // The invoking control is re-focused (not document.body).
    expect(document.activeElement).toBe(counter);
  });
});

describe("F8 family — the counter-offer submit guard is never a silent no-op", () => {
  it("a non-numeric counter-offer disables the submit, shows an inline error, and Enter does nothing", async () => {
    await mountTransfers(transfersView());
    const counter = await screen.findByRole("button", { name: "Counter" });
    act(() => counter.focus());
    fireEvent.click(counter);

    const dialog = screen.getByRole("dialog", { name: "Counter Incoming" });
    const input = within(dialog).getByLabelText("Counter-offer amount (Credits)");
    fireEvent.change(input, { target: { value: "abc" } });

    const submit = within(dialog).getByRole("button", { name: "Counter" });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    expect(within(dialog).getByRole("alert").textContent).toContain("valid counter-offer");

    // Enter over the invalid draft must not submit — the dialog stays open.
    fireEvent.keyDown(dialog, { key: "Enter" });
    expect(screen.getByRole("dialog", { name: "Counter Incoming" })).toBeTruthy();

    // A valid amount re-enables the submit and clears the inline error.
    fireEvent.change(input, { target: { value: "250" } });
    expect((submit as HTMLButtonElement).disabled).toBe(false);
    expect(within(dialog).queryByRole("alert")).toBeNull();
  });

  it("zero, negative, and overflowing counter-offers are equally invalid and disabled", async () => {
    await mountTransfers(transfersView());
    fireEvent.click(await screen.findByRole("button", { name: "Counter" }));
    const dialog = screen.getByRole("dialog", { name: "Counter Incoming" });
    const input = within(dialog).getByLabelText("Counter-offer amount (Credits)");
    for (const bad of ["0", "-5", "1e309"]) {
      fireEvent.change(input, { target: { value: bad } });
      const submit = within(dialog).getByRole("button", { name: "Counter" });
      expect((submit as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it("clicking Counter with an EMPTY amount surfaces the inline error instead of a silent no-op", async () => {
    await mountTransfers(transfersView());
    fireEvent.click(await screen.findByRole("button", { name: "Counter" }));
    const dialog = screen.getByRole("dialog", { name: "Counter Incoming" });
    const submit = within(dialog).getByRole("button", { name: "Counter" });
    fireEvent.click(submit);
    expect(within(dialog).getByRole("alert").textContent).toContain("valid counter-offer");
    // The dialog stays open until a valid amount is entered.
    expect(screen.getByRole("dialog", { name: "Counter Incoming" })).toBeTruthy();
  });

  it("cancelling a counter-offer error does not leak into the next open (fresh state per open)", async () => {
    await mountTransfers(transfersView());
    fireEvent.click(await screen.findByRole("button", { name: "Counter" }));
    const dialog = screen.getByRole("dialog", { name: "Counter Incoming" });
    const submit = within(dialog).getByRole("button", { name: "Counter" });
    // Empty draft + Counter click → the inline error surfaces (F8), then
    // Cancel closes the modal with that error still in state.
    fireEvent.click(submit);
    expect(within(dialog).getByRole("alert").textContent).toContain("valid counter-offer");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog", { name: "Counter Incoming" })).toBeNull();

    // Reopen: the modal opens fresh — no stale alert, empty amount.
    fireEvent.click(await screen.findByRole("button", { name: "Counter" }));
    const reopened = screen.getByRole("dialog", { name: "Counter Incoming" });
    expect(within(reopened).queryByRole("alert")).toBeNull();
    expect(
      (within(reopened).getByLabelText("Counter-offer amount (Credits)") as HTMLInputElement).value,
    ).toBe("");
  });
});

describe("F-2 — the dirty-discard Keep/Discard dialog owns the keyboard (focus, Tab, Escape=keep, return)", () => {
  const openConfirm = async () => {
    await mountTransfers(transfersView());
    await screen.findByRole("button", { name: /Alan Player/ });
    fireEvent.click(screen.getByRole("button", { name: /Alan Player/ }));
    fireEvent.change(screen.getByLabelText("Your bid:"), { target: { value: "450000" } });
    // Retarget to Bob while the draft is dirty → confirm dialog.
    const bobRow = document.querySelector(
      '[data-focus-id="transfers.marketTable.mp2"]',
    ) as HTMLElement;
    act(() => {
      bobRow.focus();
    });
    fireEvent.click(bobRow);
    return screen.getByRole("dialog", { name: "Discard the bid in progress?" });
  };

  it("initial focus lands on Keep bid; Tab is trapped inside the dialog", async () => {
    const dialog = await openConfirm();
    const keep = within(dialog).getByRole("button", { name: "Keep bid" });
    const discard = within(dialog).getByRole("button", { name: "Discard draft" });
    expect(document.activeElement).toBe(keep);

    // Tab from the LAST control wraps to the first.
    act(() => {
      discard.focus();
    });
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(keep);
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(discard);
  });

  it("Enter is left native: the dialog does not swallow it (focused button activates; nothing is discarded by Enter alone)", async () => {
    const dialog = await openConfirm();
    fireEvent.keyDown(dialog, { key: "Enter" });
    // No special handling: the draft survives until an explicit Keep/Discard.
    expect(screen.getByRole("dialog", { name: "Discard the bid in progress?" })).toBeTruthy();
  });

  it("Escape closes by keeping the draft (no silent discard) and focus returns to the invoking row", async () => {
    const dialog = await openConfirm();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Discard the bid in progress?" })).toBeNull();

    // Draft preserved (Escape = keep-current).
    const region = screen.getByRole("region", { name: "Place bid" });
    expect(region.textContent).toContain("Player: Alan Player");
    expect((screen.getByLabelText("Your bid:") as HTMLInputElement).value).toBe("450000");
    // Focus returned to the invoking row control.
    expect(document.activeElement?.getAttribute("data-focus-id")).toBe(
      "transfers.marketTable.mp2",
    );
  });

  it("scrim-click keeps the draft (the closed F-2 scrim-click gap) — the scrim is no longer a dead surface", async () => {
    await openConfirm();
    // Click the scrim itself (the keyboard-less click-outside path that the
    // Keep/Discard shell previously lacked). It must keep, never discard.
    act(() => {
      fireEvent.mouseDown(document.querySelector(".fixed.inset-0")!);
    });
    // Keeps behave like Escape: the draft survives and the dialog closes.
    expect(screen.queryByRole("dialog", { name: "Discard the bid in progress?" })).toBeNull();
    const region = screen.getByRole("region", { name: "Place bid" });
    expect(region.textContent).toContain("Player: Alan Player");
    expect((screen.getByLabelText("Your bid:") as HTMLInputElement).value).toBe("450000");
  });
});