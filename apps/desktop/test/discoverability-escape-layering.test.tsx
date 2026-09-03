// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
} from "@tanstack/react-router";
import { SaveId } from "@cm-clone/contracts";
import { STATURE_TIERS } from "@cm-clone/shared";
import { KeyboardSpine } from "../src/renderer/KeyboardSpine.js";
import { bindRouter } from "../src/renderer/navigation/adapter.js";
import { resetActionHandlers } from "../src/renderer/actions/dispatch.js";
import { resetScopeState } from "../src/renderer/actions/scopeState.js";
import { teachingSplashStorageKey, readTeachingSplashSeen } from "../src/renderer/discoverability/TeachingSplash.js";
import { TransfersScreen } from "../src/renderer/TransfersScreen.js";
import { RegistryProvider } from "../src/renderer/rpc.js";

const rid = (id: string) => SaveId.make(id);

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const NOT_FOUND = { _tag: "SaveNotFoundError", id: rid("s1") };

const transfersView = () => ({
  club: { id: rid("me"), name: "My Club", statureTier: STATURE_TIERS[0] },
  season: { seasonNumber: 1, currentMatchday: 1, phase: "in_season" as const },
  windowOpen: true,
  transferBudgetRemaining: 500000,
  wageBudget: 1000000,
  wageBudgetUsed: 300000,
  incomingBids: [],
  outgoingBids: [],
  freeAgents: [],
  marketPlayers: [
    {
      id: rid("mp"),
      firstName: "Market",
      lastName: "Player",
      age: 24,
      clubId: rid("club-mp"),
      clubName: "Club MP",
      overallRating: 78,
      transferValue: 1200000,
      positions: [],
    },
  ],
});

// Every joint keystroke passes the physical `code` react-hotkeys-hook's matcher
// reads (jsdom leaves `code` empty otherwise), separate from the logical `key`;
// Primary+K is Ctrl+K off-mac.
const keyDown = (key: string, init: Record<string, unknown> = {}, code?: string): void => {
  act(() => fireEvent.keyDown(document, { key, code: code ?? key, ...init }));
};
const primaryK = () => keyDown("k", { ctrlKey: true }, "KeyK");
const primarySlash = () => keyDown("/", { ctrlKey: true }, "Slash");

interface MountOptions {
  readonly splashSeen?: boolean;
}

const mountTransfersWithSpine = async (options: MountOptions = {}): Promise<void> => {
  window.localStorage.clear();
  if (options.splashSeen !== false) {
    window.localStorage.setItem(teachingSplashStorageKey, "1");
  }
  mockPreload(async (method) => {
    if (method === "getTransfersScreen") return { _tag: "Success", value: transfersView() } as never;
    return { _tag: "Failure", error: NOT_FOUND } as never;
  });
  const rootRoute = createRootRoute({
    component: () => (
      <>
        <Outlet />
        <KeyboardSpine />
      </>
    ),
  });
  const transfersRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/career/$saveId/transfers",
    component: () => (
      <RegistryProvider>
        <TransfersScreen saveId={rid("s1")} />
      </RegistryProvider>
    ),
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([transfersRoute]),
    history: createMemoryHistory({ initialEntries: ["/career/s1/transfers"] }),
  });
  bindRouter({
    navigate: () => undefined,
    history: { back: () => undefined },
  } as never);
  render(<RouterProvider router={router} />);
  await screen.findByRole("button", { name: /Market Player/ });
};

let navCalls: Array<{ to: string }> = [];
let backCalls = 0;

beforeEach(() => {
  cleanup();
  navCalls = [];
  backCalls = 0;
  resetActionHandlers();
  resetScopeState();
  window.scrollTo = () => undefined;
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  resetScopeState();
  resetActionHandlers();
});

describe("AC-20 — Primary+K opens the palette, Primary+/ opens help", () => {
  it("Primary+K opens the command palette and focuses its combobox", async () => {
    await mountTransfersWithSpine();
    primaryK();
    expect(screen.getByRole("dialog", { name: "Command palette" })).toBeTruthy();
    expect(document.activeElement?.getAttribute("role")).toBe("combobox");
    // No prefix indicator appears alongside the palette (palette is topmost).
    expect(screen.queryByText("Go to:")).toBeNull();
  });

  it("Primary+/ opens the help overlay", async () => {
    await mountTransfersWithSpine();
    primarySlash();
    expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeTruthy();
  });

  it("selecting Open keyboard help from the palette hands off to the help layer", async () => {
    await mountTransfersWithSpine();
    primaryK();
    // The table's position `<select>`s also map to role=combobox now (AC-30
    // visible filter controls), so scope the palette query to its dialog.
    const dialog = screen.getByRole("dialog", { name: "Command palette" });
    const paletteInput = within(dialog).getByRole("combobox") as HTMLInputElement;
    paletteInput.focus();
    act(() =>
      fireEvent.change(paletteInput, { target: { value: "open keyboard help" } }),
    );
    keyDown("Enter");
    expect(screen.queryByRole("dialog", { name: "Command palette" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeTruthy();
  });
});

describe("AC-20 — Escape closes only the topmost transient layer; overlays create no history entries", () => {
  it("Escape closes the palette without navigating or leaving a history step", async () => {
    await mountTransfersWithSpine();
    primaryK();
    expect(screen.getByRole("dialog", { name: "Command palette" })).toBeTruthy();
    keyDown("Escape");
    expect(screen.queryByRole("dialog", { name: "Command palette" })).toBeNull();
    // Opening the palette never touched the router: no back step, no navigation.
    expect(navCalls).toEqual([]);
    expect(backCalls).toBe(0);
  });

  it("Escape closes help the same way (topmost-only, no history entry)", async () => {
    await mountTransfersWithSpine();
    primarySlash();
    keyDown("Escape");
    expect(screen.queryByRole("dialog", { name: "Keyboard shortcuts" })).toBeNull();
    expect(navCalls).toEqual([]);
    expect(backCalls).toBe(0);
  });

  it("Escape with no layer open is a no-op (nothing to be topmost)", async () => {
    await mountTransfersWithSpine();
    keyDown("Escape");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("Go to:")).toBeNull();
    expect(backCalls).toBe(0);
  });

  it("an open palette takes precedence over bindings beneath: bare b and g do nothing", async () => {
    await mountTransfersWithSpine();
    primaryK();
    keyDown("b", {}, "KeyB"); // transfers `b` (focus-bid) must NOT fire
    expect(document.activeElement?.getAttribute("role")).toBe("combobox");
    keyDown("g", {}, "KeyG"); // `g` must NOT start a prefix under the palette
    expect(screen.queryByText("Go to:")).toBeNull();
    expect(document.activeElement?.getAttribute("role")).toBe("combobox");
  });

  it("an open help overlay also suppresses the prefix and bare keys", async () => {
    await mountTransfersWithSpine();
    primarySlash();
    keyDown("g", {}, "KeyG");
    expect(screen.queryByText("Go to:")).toBeNull();
    keyDown("b", {}, "KeyB");
    // focus-bid did not run: no bid amount input is focused (nothing drafted,
    // and even if drafted the input is untouched while help owns the keyboard).
    const amountInput = document.querySelector<HTMLInputElement>("input[placeholder='Amount']");
    expect(!!(amountInput && document.activeElement === amountInput)).toBe(false);
  });
});

describe("AC-20/focus-model — focus goes to the palette and returns to the invoking control", () => {
  it("opens over the focused control and restores focus to it on Escape", async () => {
    await mountTransfersWithSpine();
    // Stage 5 moved bid entry into the Actions region; the invoking control is
    // now a table row's player-name button.
    const invoking = screen.getByRole("button", { name: /Market Player/ });
    invoking.focus();
    primaryK();
    expect(document.activeElement?.getAttribute("role")).toBe("combobox");
    keyDown("Escape");
    expect(document.activeElement).toBe(invoking);
  });
});

describe("AC-26 — the one-shot teaching splash lives at the spine, topmost, once", () => {
  it("shows on the first career-screen load (flag unset) and is the topmost layer", async () => {
    await mountTransfersWithSpine({ splashSeen: false });
    expect(screen.getByRole("dialog", { name: /Playing a new career/i })).toBeTruthy();
    // The dismiss button is autofocused, so Enter dismisses from a focused control.
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /Got it/i }));
    // While it is up it owns the keyboard: no prefix, no palette.
    keyDown("g", {}, "KeyG");
    expect(screen.queryByText("Go to:")).toBeNull();
  });

  it("Escape from the autofocused dismiss button still dismisses (focused-control posture)", async () => {
    await mountTransfersWithSpine({ splashSeen: false });
    const dismiss = screen.getByRole("button", { name: /Got it/i }) as HTMLElement;
    expect(document.activeElement).toBe(dismiss);
    // Escape is not suppressed by react-hotkeys-hook's form-tag exemption; it
    // must dismiss even while the focus sits on the autofocused button. The
    // removal is deferred one macrotask (see useTeachingSplashVisibility), so
    // the assertions wait for the settle.
    act(() => fireEvent.keyDown(document, { key: "Escape", code: "Escape" }));
    expect(readTeachingSplashSeen()).toBe(true);
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: /Playing a new career/i })).toBeNull(),
    );
  });

  it("Escape dismisses it, persists the flag, and it never re-shows", async () => {
    await mountTransfersWithSpine({ splashSeen: false });
    keyDown("Escape");
    expect(readTeachingSplashSeen()).toBe(true);
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: /Playing a new career/i })).toBeNull(),
    );

    // A remount (new save / later session) reads the flag and stays silent.
    cleanup();
    await mountTransfersWithSpine();
    expect(screen.queryByRole("dialog", { name: /Playing a new career/i })).toBeNull();
  });
});