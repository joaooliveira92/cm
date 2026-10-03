/**
 * The Quit dialog is the topmost modal layer (group-a-reconciliation ticket 20). `main.tsx`
 * renders `<QuitGuard />` before the router, so every router overlay (teaching splash, help,
 * palette) comes later in the DOM; the dialog must still paint above them, take their clicks,
 * and own the keyboard while it is open.
 */
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { HotkeysBoundaryProvider } from "../../../src/renderer/hotkeys.js";
import { QuitGuard } from "../../../src/renderer/quitGuard/QuitGuard.js";
import { TeachingSplash, teachingSplashStorageKey } from "../../../src/renderer/discoverability/TeachingSplash.js";
import { KeyboardSpine } from "../../../src/renderer/keyboard/KeyboardSpine.js";
import { resetActionHandlers } from "../../../src/renderer/actions/dispatch.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";

let confirmQuit: ReturnType<typeof vi.fn>;
let cancelQuit: ReturnType<typeof vi.fn>;

beforeEach(() => {
  confirmQuit = vi.fn();
  cancelQuit = vi.fn();
  (window as unknown as { electronAPI: unknown }).electronAPI = {
    platform: "linux",
    confirmQuit,
    cancelQuit,
    quitApplication: vi.fn(),
  };
  (window as unknown as { cmClone: unknown }).cmClone = {
    call: async () => ({ _tag: "Failure", error: { _tag: "SaveNotFoundError", id: "s1" } }),
  };
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

/** What the preload does when main sends `show-quit-guard`. */
const showQuitGuard = (): void => {
  act(() => {
    window.dispatchEvent(new CustomEvent("show-quit-guard"));
  });
};

/** The full-screen scrim a dialog floats on: its nearest `fixed inset-0` ancestor. */
const scrimOf = (dialog: HTMLElement): HTMLElement => {
  const scrim = dialog.closest<HTMLElement>(".fixed.inset-0");
  if (scrim === null) throw new Error("dialog has no full-screen scrim");
  return scrim;
};

/** The Tailwind z-index a scrim paints at (`z-40` → 40, `z-[60]` → 60); 0 when it sets none. */
const zIndexOf = (element: HTMLElement): number => {
  const match = /(?:^|\s)z-(?:\[(\d+)\]|(\d+))(?:\s|$)/.exec(element.className);
  return match === null ? 0 : Number(match[1] ?? match[2]);
};

/** Every z-index class used anywhere in the mounted tree. */
const allZIndexes = (): number[] =>
  [...document.querySelectorAll<HTMLElement>("[class*='z-']")].map(zIndexOf);

/** The body-level subtree an element belongs to: its nearest ancestor that is a direct child of
 *  `document.body`. A portal straight onto `body` is its own subtree; a router overlay shares the
 *  render root's. */
const topLevelOf = (element: HTMLElement): HTMLElement => {
  let node = element;
  while (node.parentElement !== null && node.parentElement !== document.body) node = node.parentElement;
  return node;
};

/** `main.tsx`'s order: the guard first, the router's overlay after it. */
const mountQuitGuardBeneathSplash = (onDismiss: () => void): void => {
  render(
    <HotkeysBoundaryProvider>
      <QuitGuard />
      <TeachingSplash onDismiss={onDismiss} />
    </HotkeysBoundaryProvider>,
  );
};

describe("ticket 20 — the Quit dialog over the teaching splash", () => {
  it("paints above the splash even though the splash comes later in the DOM", () => {
    mountQuitGuardBeneathSplash(() => undefined);
    showQuitGuard();

    const quit = screen.getByRole("dialog", { name: "Quit" });
    const splash = screen.getByRole("dialog", { name: "Playing a new career" });
    // Quit portals straight onto `document.body`, so it shares no stacking context with the splash's
    // subtree: DOM order inside that subtree cannot be what puts Quit on top, only the raised z-index.
    expect(topLevelOf(quit)).not.toBe(topLevelOf(splash));
    expect(zIndexOf(scrimOf(quit))).toBeGreaterThan(zIndexOf(scrimOf(splash)));
    // Topmost outright, not just above the splash.
    expect(zIndexOf(scrimOf(quit))).toBe(Math.max(...allZIndexes()));
  });

  it("its Quit button receives the click and confirms the quit", () => {
    const onDismiss = vi.fn();
    mountQuitGuardBeneathSplash(onDismiss);
    showQuitGuard();

    fireEvent.click(within(screen.getByRole("dialog", { name: "Quit" })).getByRole("button", { name: "Quit" }));
    expect(confirmQuit).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("its Cancel button closes only the Quit dialog, leaving the splash up", () => {
    const onDismiss = vi.fn();
    mountQuitGuardBeneathSplash(onDismiss);
    showQuitGuard();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(cancelQuit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog", { name: "Quit" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "Playing a new career" })).toBeTruthy();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("Escape cancels the Quit dialog and does not also dismiss the splash beneath it", () => {
    const onDismiss = vi.fn();
    mountQuitGuardBeneathSplash(onDismiss);
    showQuitGuard();

    const cancel = screen.getByRole("button", { name: "Cancel" });
    expect(document.activeElement).toBe(cancel);
    act(() => fireEvent.keyDown(cancel, { key: "Escape", code: "Escape" }));
    expect(cancelQuit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog", { name: "Quit" })).toBeNull();
    expect(onDismiss).not.toHaveBeenCalled();
  });
});

/** The guard ahead of a router whose root renders the keyboard spine, on a career screen. */
const mountQuitGuardWithSpine = async (): Promise<void> => {
  window.localStorage.setItem(teachingSplashStorageKey, "1");
  const rootRoute = createRootRoute({
    component: () => (
      <>
        <Outlet />
        <KeyboardSpine />
      </>
    ),
  });
  const careerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/career/$saveId/transfers",
    component: () => <main>transfers</main>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([careerRoute]),
    history: createMemoryHistory({ initialEntries: ["/career/s1/transfers"] }),
  });
  render(
    <HotkeysBoundaryProvider>
      <QuitGuard />
      <RouterProvider router={router} />
    </HotkeysBoundaryProvider>,
  );
  await screen.findByText("transfers");
};

const pressOnDocument = (key: string, init: Record<string, unknown>, code: string): void => {
  act(() => fireEvent.keyDown(document, { key, code, ...init }));
};

describe("ticket 20 — the Quit dialog over the help overlay and the command palette", () => {
  it("paints above the help overlay, and Escape closes only the Quit dialog", async () => {
    await mountQuitGuardWithSpine();
    pressOnDocument("/", { ctrlKey: true }, "Slash");
    const help = screen.getByRole("dialog", { name: "Keyboard shortcuts" });
    showQuitGuard();

    const quit = screen.getByRole("dialog", { name: "Quit" });
    expect(zIndexOf(scrimOf(quit))).toBeGreaterThan(zIndexOf(scrimOf(help)));

    const cancel = screen.getByRole("button", { name: "Cancel" });
    act(() => fireEvent.keyDown(cancel, { key: "Escape", code: "Escape" }));
    expect(screen.queryByRole("dialog", { name: "Quit" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeTruthy();
  });

  it("paints above the palette, and Enter on Cancel is not taken by the palette beneath", async () => {
    await mountQuitGuardWithSpine();
    pressOnDocument("k", { ctrlKey: true }, "KeyK");
    const palette = screen.getByRole("dialog", { name: "Command palette" });
    showQuitGuard();

    const quit = screen.getByRole("dialog", { name: "Quit" });
    expect(zIndexOf(scrimOf(quit))).toBeGreaterThan(zIndexOf(scrimOf(palette)));

    const cancel = screen.getByRole("button", { name: "Cancel" });
    expect(document.activeElement).toBe(cancel);
    let enter: KeyboardEvent | undefined;
    act(() => {
      enter = new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true, cancelable: true });
      cancel.dispatchEvent(enter);
    });
    // The palette's Enter would run its selected entry, close itself, and cancel the keystroke's
    // default action, which is what activates the focused Cancel button.
    expect(enter!.defaultPrevented).toBe(false);
    expect(screen.getByRole("dialog", { name: "Command palette" })).toBeTruthy();
  });
});
