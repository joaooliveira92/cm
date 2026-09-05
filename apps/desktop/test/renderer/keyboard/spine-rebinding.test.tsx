// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { KeyboardSpine } from "../../../src/renderer/keyboard/KeyboardSpine.js";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { resetActionHandlers } from "../../../src/renderer/actions/dispatch.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";
import { HotkeysBoundaryProvider } from "../../../src/renderer/hotkeys.js";
import { teachingSplashStorageKey } from "../../../src/renderer/discoverability/TeachingSplash.js";

/**
 * Spine-level wiring tests for the Stage 6 rebinding surface (ticket 21) — reviewer findings
 * F4 and F7. These mount the real `KeyboardSpine` behind a career route (matching `main.tsx`'s
 * provider tree) so the spine's own handler registrations, the palette's dispatch path, and the
 * help overlay's mutation-adoption path all run as they do in the app.
 *
 * - F4: a rebind adopted through the overlay's `onOverridesChange` while the one-shot mount
 *   `getKeyBindingOverrides()` is still in flight is never clobbered by the stale response.
 * - F7: selecting the palette's "Rebind…" entry dispatches `open-rebind`, and the help overlay
 *   opens.
 */

type Preload = (method: string, payload: unknown) => Promise<unknown>;

const mockPreload = (impl: Preload): void => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const NOT_FOUND = { _tag: "SaveNotFoundError", id: "s1" as never };

const keyDown = (init: Record<string, string | boolean>): void => {
  act(() => fireEvent.keyDown(document, init));
};

/** Mount the spine behind the transfers route — the route itself is a stub; the spine's
 *  overlay handling (what these tests exercise) is route-independent. */
const mountWithSpine = async (preload: Preload): Promise<void> => {
  mockPreload(preload);
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
    component: () => <h1>Transfers</h1>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([transfersRoute]),
    history: createMemoryHistory({ initialEntries: ["/career/s1/transfers"] }),
  });
  bindRouter({ navigate: () => undefined, history: { back: () => undefined, forward: () => undefined, canGoBack: () => false } } as never);
  render(
    <HotkeysBoundaryProvider>
      <RouterProvider router={router} />
    </HotkeysBoundaryProvider>,
  );
  // The router performs its initial load asynchronously; wait for the stub route to land so the
  // spine's mount effects (the overrides fetch, the action-handler registrations) have run.
  await screen.findByRole("heading", { name: "Transfers" });
};

beforeEach(() => {
  cleanup();
  resetActionHandlers();
  resetScopeState();
  // The one-shot teaching splash is dismissed (Stage 4) so it never steals focus or keystrokes.
  window.localStorage.setItem(teachingSplashStorageKey, "1");
  window.scrollTo = () => undefined;
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  resetScopeState();
});

describe("F4 — a late-resolving mount fetch never clobbers a just-adopted override", () => {
  it("the stale getKeyBindingOverrides response yields to the adopted rebind", async () => {
    let resolveInitial!: (value: unknown) => void;
    const initialFetch = new Promise<unknown>((resolve) => {
      resolveInitial = resolve;
    });
    const calls: Array<{ method: string; payload: unknown }> = [];
    await mountWithSpine(async (method, payload) => {
      calls.push({ method, payload });
      if (method === "getKeyBindingOverrides") return await initialFetch;
      if (method === "setKeyBindingOverride") {
        return { _tag: "Success", value: { "focus-bid": "v" } };
      }
      return { _tag: "Failure", error: NOT_FOUND };
    });

    // Open the help overlay (Primary+/ is the app-global help shortcut).
    keyDown({ key: "/", code: "/", ctrlKey: true });
    expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeTruthy();

    // Rebind Focus the bid workflow to `v`, while the initial overrides fetch is still pending.
    act(() =>
      fireEvent.click(screen.getByRole("button", { name: "Rebind Focus the bid workflow" })),
    );
    await screen.findByText(/Press a key/);
    act(() => fireEvent.keyDown(window, { key: "v", code: "v" }));
    await waitFor(() => expect(screen.getByLabelText("Binding v, rebound")).toBeTruthy());
    expect(
      calls.filter((call) => call.method === "setKeyBindingOverride"),
    ).toHaveLength(1);

    // The stale mount response lands now — it must not overwrite the just-adopted map.
    await act(async () => {
      resolveInitial({ _tag: "Success", value: { "focus-bid": "x" } });
    });
    expect(screen.getByLabelText("Binding v, rebound")).toBeTruthy();
    expect(screen.queryByLabelText("Binding x, rebound")).toBeNull();
  });
});

describe("F7 — the palette's Rebind… entry opens the help overlay through the spine", () => {
  it("selecting the open-rebind command leaves the help overlay open/visible", async () => {
    await mountWithSpine(async (method) => {
      if (method === "getKeyBindingOverrides") return { _tag: "Success", value: {} };
      return { _tag: "Failure", error: NOT_FOUND };
    });

    // Open the command palette (Primary+K).
    keyDown({ key: "k", code: "k", ctrlKey: true });
    expect(screen.getByRole("dialog", { name: "Command palette" })).toBeTruthy();

    // Narrow to the Rebind… command and dispatch it with Enter.
    const input = screen.getByRole("combobox") as HTMLInputElement;
    act(() => fireEvent.change(input, { target: { value: "rebind" } }));
    const rebind = screen.getByRole("option", { name: /Rebind…/ });
    expect(rebind.getAttribute("data-action-id")).toBe("open-rebind");
    keyDown({ key: "Enter", code: "Enter" });

    // The help overlay (the rebinding surface) is now open; the palette closed first.
    expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "Command palette" })).toBeNull();
  });
});