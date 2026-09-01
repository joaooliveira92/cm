// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SaveListScreen } from "../src/renderer/router/saveList.js";
import { navigate } from "../src/renderer/navigation/adapter.js";

vi.mock("../src/renderer/navigation/adapter.js", () => ({
  navigate: vi.fn(),
}));

const mountedNavigate = vi.mocked(navigate);

const mount = () => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async () => ({ _tag: "Success", value: [] }),
  };
  render(<SaveListScreen />);
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

  it("renders the footer with version and database info", async () => {
    mount();
    expect(screen.getByText("Version 0.0.0")).toBeTruthy();
    expect(screen.getByText(/Database: fictional 2003-style dataset/)).toBeTruthy();
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

  it("Credits opens the credits dialog", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Credits" }));
    expect(screen.getByRole("dialog", { name: "Credits" })).toBeTruthy();
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

  it("focus is a native tab stop — exactly one item is tabbable", async () => {
    mount();
    const menuButtons = MENU_BUTTONS();
    const tabStops = menuButtons.filter((button) => button.tabIndex === 0);
    expect(tabStops).toHaveLength(1);
    expect(tabStops[0].textContent).toBe("Start New Career");
  });

  it("activating the focused item emits its command (Exit opens its dialog)", async () => {
    mount();
    window.electronAPI = { showQuitGuard: vi.fn() } as never;
    const list = screen.getByRole("navigation", { name: "Main menu" });
    const buttons = MENU_BUTTONS();

    fireEvent.keyDown(list, { key: "End" });
    expect(buttons[MENU_LABELS.length - 1]).toBe(document.activeElement);
    fireEvent.click(buttons[MENU_LABELS.length - 1]);
    expect(screen.getByRole("dialog", { name: "Exit application?" })).toBeTruthy();
  });
});