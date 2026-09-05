// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MainMenuScreen } from "../src/renderer/router/mainMenu.js";
import { navigate } from "../src/renderer/navigation/adapter.js";

vi.mock("../src/renderer/navigation/adapter.js", () => ({
  navigate: vi.fn(),
}));

const mountedNavigate = vi.mocked(navigate);

/** The menu probes the save repository on mount (spec §8). */
const mount = (saves: ReadonlyArray<unknown> = []) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async () => ({ _tag: "Success", value: saves }),
  };
  render(<MainMenuScreen />);
};

/** The repository is unreachable (spec §10.1). */
const mountWithRepositoryFailure = () => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async () => ({
      _tag: "Failure",
      error: { _tag: "TransportFailure", method: "listSaves", cause: null },
    }),
  };
  render(<MainMenuScreen />);
};

const MENU_LABELS = [
  "Start New Career",
  "Load Career",
  "Preferences",
  "Credits",
  "Exit",
];

const MENU_BUTTONS = () =>
  within(screen.getByRole("navigation", { name: "Main menu" })).getAllByRole("button");

beforeEach(() => {
  mountedNavigate.mockClear();
});
afterEach(cleanup);

describe("Main Menu — structure", () => {
  it("renders the product identity and all menu items in spec order", async () => {
    mount();

    expect(screen.getByRole("heading", { name: "Championship Manager Clone" })).toBeTruthy();
    expect(MENU_BUTTONS().map((button) => button.textContent)).toEqual(MENU_LABELS);
  });

  it("renders the footer with the application version separate from the database edition", async () => {
    mount();
    expect(screen.getByText("Version 0.0.0")).toBeTruthy();
    expect(screen.getByText(/Database: Fictional 2003\/04 dataset/)).toBeTruthy();
  });
});

describe("Main Menu — save repository state", () => {
  it("hints that no saved careers exist without disabling Load Career", async () => {
    mount([]);

    await screen.findByText("No saved careers yet");
    const load = screen.getByRole("button", { name: "Load Career" });
    expect((load as HTMLButtonElement).disabled).toBe(false);
    expect(load.getAttribute("aria-describedby")).toBe("menu-load-hint");
  });

  it("shows no hint when saves exist", async () => {
    mount([{ id: "a", name: "A", createdAt: "2026-01-01T00:00:00.000Z", archivedCause: null }]);

    await screen.findByRole("button", { name: "Load Career" });
    expect(screen.queryByText("No saved careers yet")).toBeNull();
  });

  it("explains an unreachable repository, offers Retry, and blocks nothing", async () => {
    mountWithRepositoryFailure();

    await screen.findByText(/Saved careers could not be read/);
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
    expect(MENU_BUTTONS().map((button) => button.textContent)).toEqual(MENU_LABELS);
  });
});

describe("Main Menu — command emission", () => {
  it("Start New Career navigates to league selection", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Start New Career" }));
    expect(mountedNavigate).toHaveBeenCalledWith({ type: "createLeagues" });
  });

  it("Load Career navigates to the load screen", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Load Career" }));
    expect(mountedNavigate).toHaveBeenCalledWith({ type: "loadCareer" });
  });

  it("Preferences opens the preferences dialog", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Preferences" }));
    expect(screen.getByRole("dialog", { name: "Preferences" })).toBeTruthy();
  });

  it("Credits opens a scrollable informational dialog with a Back action", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Credits" }));
    const dialog = screen.getByRole("dialog", { name: "Credits" });
    expect(within(dialog).getByRole("button", { name: "Back" })).toBeTruthy();

    fireEvent.click(within(dialog).getByRole("button", { name: "Back" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Exit opens the confirmation dialog instead of quitting directly", async () => {
    mount();
    window.electronAPI = { showQuitGuard: vi.fn() } as never;
    fireEvent.click(screen.getByRole("button", { name: "Exit" }));
    expect(screen.getByRole("dialog", { name: "Exit application?" })).toBeTruthy();
  });
});

describe("Main Menu — exit confirmation dialog", () => {
  it("default focus is Cancel and the destructive action is distinct", async () => {
    mount();
    window.electronAPI = { showQuitGuard: vi.fn() } as never;
    fireEvent.click(screen.getByRole("button", { name: "Exit" }));

    const dialog = screen.getByRole("dialog", { name: "Exit application?" });
    const cancel = within(dialog).getByRole("button", { name: "Cancel" });
    expect(cancel).toBe(document.activeElement);
    expect(cancel.className).not.toContain("destructive");
    expect(within(dialog).getByRole("button", { name: "Exit" }).className).toContain("destructive");
  });

  it("does not warn about losing career progress — no career is loaded", async () => {
    mount();
    window.electronAPI = { showQuitGuard: vi.fn() } as never;
    fireEvent.click(screen.getByRole("button", { name: "Exit" }));

    const dialog = screen.getByRole("dialog", { name: "Exit application?" });
    expect(within(dialog).getByText("No career is loaded, so nothing will be lost.")).toBeTruthy();
    expect(dialog.textContent).not.toContain("unsaved");
  });

  it("Cancel closes the dialog and does not quit", async () => {
    mount();
    const quitGuard = vi.fn();
    window.electronAPI = { showQuitGuard: quitGuard } as never;
    fireEvent.click(screen.getByRole("button", { name: "Exit" }));

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(quitGuard).not.toHaveBeenCalled();
  });

  it("confirming Exit triggers the quit guard", async () => {
    mount();
    const quitGuard = vi.fn();
    window.electronAPI = { showQuitGuard: quitGuard } as never;
    fireEvent.click(screen.getByRole("button", { name: "Exit" }));

    const dialog = screen.getByRole("dialog", { name: "Exit application?" });
    const confirm = within(dialog).getByRole("button", { name: "Exit" });
    fireEvent.click(confirm);
    expect(quitGuard).toHaveBeenCalledTimes(1);
  });

  it("Escape cancels the dialog", async () => {
    mount();
    window.electronAPI = { showQuitGuard: vi.fn() } as never;
    fireEvent.click(screen.getByRole("button", { name: "Exit" }));

    fireEvent.keyDown(screen.getByRole("dialog", { name: "Exit application?" }), {
      key: "Escape",
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("Main Menu — keyboard navigation", () => {
  it("arrows move a roving focus across the menu items", async () => {
    mount();
    const list = screen.getByRole("navigation", { name: "Main menu" });
    const buttons = MENU_BUTTONS();

    fireEvent.keyDown(list, { key: "ArrowDown" });
    expect(buttons[1]).toBe(document.activeElement);
    fireEvent.keyDown(list, { key: "ArrowDown" });
    expect(buttons[2]).toBe(document.activeElement);
    fireEvent.keyDown(list, { key: "ArrowUp" });
    expect(buttons[1]).toBe(document.activeElement);
  });

  it("Home and End jump to the first and last items", async () => {
    mount();
    const list = screen.getByRole("navigation", { name: "Main menu" });
    const buttons = MENU_BUTTONS();

    fireEvent.keyDown(list, { key: "End" });
    expect(buttons[MENU_LABELS.length - 1]).toBe(document.activeElement);
    fireEvent.keyDown(list, { key: "Home" });
    expect(buttons[0]).toBe(document.activeElement);
  });

  it("focus does not wrap at either end", async () => {
    mount();
    const list = screen.getByRole("navigation", { name: "Main menu" });
    const buttons = MENU_BUTTONS();

    fireEvent.keyDown(list, { key: "ArrowUp" });
    expect(buttons[0]).toBe(document.activeElement);
    fireEvent.keyDown(list, { key: "End" });
    fireEvent.keyDown(list, { key: "ArrowDown" });
    expect(buttons[MENU_LABELS.length - 1]).toBe(document.activeElement);
  });

  it("focus is a native tab stop — exactly one item is tabbable", async () => {
    mount();
    const menuButtons = MENU_BUTTONS();
    const tabStops = menuButtons.filter((button) => button.tabIndex === 0);
    expect(tabStops).toHaveLength(1);
    expect(tabStops[0]!.textContent).toBe("Start New Career");
  });

  it("activating the focused item emits its command (Exit opens its dialog)", async () => {
    mount();
    window.electronAPI = { showQuitGuard: vi.fn() } as never;
    const list = screen.getByRole("navigation", { name: "Main menu" });
    const buttons = MENU_BUTTONS();

    fireEvent.keyDown(list, { key: "End" });
    expect(buttons[MENU_LABELS.length - 1]).toBe(document.activeElement);
    fireEvent.click(buttons[MENU_LABELS.length - 1]!);
    expect(screen.getByRole("dialog", { name: "Exit application?" })).toBeTruthy();
  });
});