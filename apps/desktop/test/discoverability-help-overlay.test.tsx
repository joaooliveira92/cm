// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ALL_ACTIONS } from "../src/renderer/actions/allActions.js";
import { actionsInTiers } from "../src/renderer/actions/registry.js";
import type { Action } from "../src/renderer/actions/types.js";
import { HelpOverlay } from "../src/renderer/discoverability/HelpOverlay.js";
import { HotkeysBoundaryProvider } from "../src/renderer/hotkeys.js";

const keyDown = (code: string): void => {
  act(() => fireEvent.keyDown(document, { key: code, code }));
};

const mount = (screenName: string, state: Record<string, unknown>, onClose: () => void) =>
  render(
    <HotkeysBoundaryProvider>
      <HelpOverlay screen={screenName as never} state={state} onClose={onClose} />
    </HotkeysBoundaryProvider>,
  );

const tab = (name: string) => screen.getByRole("tab", { name });

const rowIds = (): string[] =>
  [...document.querySelectorAll("[data-action-id]")].map((el) => el.getAttribute("data-action-id")!);

const transfersState = () => ({ ready: true });
const seasonCompleteState = () => ({ ready: true, phase: "season_complete", advancing: false });

beforeEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
});

afterEach(() => cleanup());

describe("AC-09/AC-24 — the help overlay enumerates live registrations, tabs included", () => {
  it("renders the All, Global, and This screen tabs", () => {
    mount("transfers", transfersState(), () => undefined);
    expect(tab("All")).toBeTruthy();
    expect(tab("Global")).toBeTruthy();
    expect(tab("This screen")).toBeTruthy();
  });

  it("the All tab is exactly the registry's live snapshot for the current scope union", () => {
    mount("transfers", transfersState(), () => undefined);
    const snapshot = actionsInTiers(ALL_ACTIONS, "transfers" as never);
    const unionLabels = snapshot.map((action) => action.label);
    // Every registered Action of the current union is listed...
    for (const label of unionLabels) {
      expect(screen.getByText(label), `missing row ${label}`).toBeTruthy();
    }
    // ...and nothing outside it (the registry snapshot == overlay rows).
    const ids = rowIds();
    expect(ids.length).toBe(snapshot.length);
    const snapshotIds = snapshot.map((action) => action.id);
    expect(ids.sort()).toEqual([...snapshotIds].sort());
  });

  it("the Global tab filters to app-global + career-global rows only", () => {
    mount("transfers", transfersState(), () => undefined);
    act(() => fireEvent.click(tab("Global")));
    const expected = actionsInTiers(ALL_ACTIONS, "transfers" as never).filter(
      (action) => action.scope === "app-global" || action.scope === "career-global",
    );
    const ids = rowIds();
    expect(ids.length).toBe(expected.length);
    for (const action of expected) expect(ids).toContain(action.id);
    // The transfers-scoped rows are hidden on this tab.
    expect(ids).not.toContain("focus-bid");
  });

  it("the This screen tab filters to the current screen's own rows only", () => {
    mount("transfers", transfersState(), () => undefined);
    act(() => fireEvent.click(tab("This screen")));
    const ids = rowIds();
    expect(ids).toContain("focus-bid");
    expect(ids).toContain("place-bid");
    expect(ids).not.toContain("open-palette");
    expect(ids).not.toContain("continue");
  });

  it("availability-afforded rows carry a check; unavailable rows show none", () => {
    mount("league", seasonCompleteState(), () => undefined);
    // On a complete season both Calendar rows are unavailable -> no check.
    const advanceRow = (action: Action) =>
      [...document.querySelectorAll("[data-action-id]")]
        .map((el) => el as HTMLElement)
        .find((el) => el.getAttribute("data-action-id") === action.id)!;
    const openPalette = actionsInTiers(ALL_ACTIONS, "league" as never).find(
      (a) => a.id === "open-palette",
    )!;
    const continueAction = actionsInTiers(ALL_ACTIONS, "league" as never).find(
      (a) => a.id === "continue",
    )!;
    expect(advanceRow(openPalette)!.textContent).toContain("✓");
    expect(advanceRow(continueAction)!.textContent).not.toContain("✓");
    expect(advanceRow(continueAction)!.textContent).toContain("Space");
  });
});

describe("AC-09 — the overlay is keyboard-operable", () => {
  it("Escape closes", () => {
    const onClose = vi.fn();
    mount("transfers", transfersState(), onClose);
    keyDown("Escape");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ArrowRight and ArrowLeft cycle the tabs", () => {
    mount("transfers", transfersState(), () => undefined);
    const tabs = screen.getAllByRole("tab");
    const selected = () => tabs.findIndex((t) => t.getAttribute("aria-selected") === "true");
    expect(selected()).toBe(0); // All
    keyDown("ArrowRight");
    expect(selected()).toBe(1); // Global
    keyDown("ArrowRight");
    expect(selected()).toBe(2); // This screen
    keyDown("ArrowRight");
    expect(selected()).toBe(0); // wraps around
    keyDown("ArrowLeft");
    expect(selected()).toBe(2);
  });

  it("the close affordance reads back through the binding seam's live registration", () => {
    mount("transfers", transfersState(), () => undefined);
    // The overlay registered its Escape hotkey through the seam; the footer's
    // close key is the seam-reported one ("Escape"), not a hard-coded string.
    expect(screen.getByText(/Escape/)).toBeTruthy();
    expect(screen.getByText(/Arrow keys switch tabs/)).toBeTruthy();
  });
});