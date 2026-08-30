// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HelpOverlay } from "../src/renderer/discoverability/HelpOverlay.js";
import { HotkeysBoundaryProvider } from "../src/renderer/hotkeys.js";

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>): void => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const SUCCESS = (value: unknown) => ({ _tag: "Success", value });

const mount = (
  overrides: Record<string, string> = {},
  onChange: (next: Record<string, string>) => void = () => undefined,
) =>
  render(
    <HotkeysBoundaryProvider>
      <HelpOverlay
        screen="transfers"
        state={{ ready: true }}
        overrides={overrides}
        onOverridesChange={onChange}
        onClose={() => undefined}
      />
    </HotkeysBoundaryProvider>,
  );

const rebindButton = (label: RegExp) =>
  screen.getByRole("button", { name: new RegExp(`^Rebind ${label.source}$`) });

const pressKey = (key: string, init: Record<string, unknown> = {}): void => {
  act(() => fireEvent.keyDown(window, { key, code: key, ...init }));
};

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
});

describe("AC-36 — the overlay shows effective bindings with the default always recoverable", () => {
  it("renders the coded default when nothing is overridden", () => {
    mount();
    const badge = screen.getByLabelText("Binding Space");
    expect(badge.textContent).toBe("Space");
    // No per-Action reset affordance when the row is not overridden (the footer's
    // reset-all is always present and is not a per-row control).
    expect(
      screen.queryByRole("button", { name: "Reset Focus the bid workflow binding" }),
    ).toBeNull();
  });

  it("renders the override with a rebound marker, and a per-Action reset appears", () => {
    mount({ "focus-bid": "v" });
    const badge = screen.getByLabelText("Binding v, rebound");
    expect(badge.textContent).toContain("v");
    expect(screen.getByRole("button", { name: "Reset Focus the bid workflow binding" })).toBeTruthy();
    // The default is gone from the row, but the coded default still shows for unoverridden rows.
    expect(screen.getByLabelText("Binding Space")).toBeTruthy();
  });
});

describe("AC-36 — in-place rebinding captures the next key and persists through the seam", () => {
  it("selecting an action and pressing a key sends setKeyBindingOverride and adopts the map", async () => {
    const calls: Array<{ method: string; payload: unknown }> = [];
    const onChange = vi.fn();
    mockPreload(async (method, payload) => {
      calls.push({ method, payload });
      if (method === "setKeyBindingOverride") return SUCCESS({ "focus-bid": "v" });
      return { _tag: "Failure", error: { anything: true } };
    });
    mount({}, onChange);

    act(() => fireEvent.click(rebindButton(/Focus the bid workflow/)));
    await screen.findByText(/Press a key/);
    pressKey("v");

    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ "focus-bid": "v" }));
    expect(calls).toEqual([
      { method: "setKeyBindingOverride", payload: { actionId: "focus-bid", binding: "v" } },
    ]);
    // Capture mode is over and the success is announced.
    expect(screen.queryByText(/Press a key/)).toBeNull();
    expect(screen.getByText(/is now bound to v/)).toBeTruthy();
  });

  it("a Primary chord is captured as the canonical Primary+ binding", async () => {
    const calls: Array<{ method: string; payload: unknown }> = [];
    const onChange = vi.fn();
    mockPreload(async (method, payload) => {
      calls.push({ method, payload });
      if (method === "setKeyBindingOverride") return SUCCESS({ "open-rebind": "Primary+h" });
      return { _tag: "Failure", error: { anything: true } };
    });
    mount({}, onChange);

    // "Rebind…" is the only unbound app-global Action, and app-global is the scope a Primary
    // chord can actually express (screen-scoped chords would never fire).
    act(() => fireEvent.click(screen.getByRole("button", { name: "Rebind Rebind…" })));
    await screen.findByText(/Press a key/);
    // In jsdom (non-mac) the Primary modifier is Ctrl.
    pressKey("h", { ctrlKey: true });

    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ "open-rebind": "Primary+h" }));
    expect(calls[0]!.payload).toEqual({ actionId: "open-rebind", binding: "Primary+h" });
  });

  it("Escape cancels the capture without touching the seam", async () => {
    const calls: Array<{ method: string; payload: unknown }> = [];
    mockPreload(async (method, payload) => {
      calls.push({ method, payload });
      return SUCCESS({});
    });
    mount();

    act(() => fireEvent.click(rebindButton(/Focus the bid workflow/)));
    await screen.findByText(/Press a key/);
    pressKey("Escape");

    await waitFor(() => expect(screen.queryByText(/Press a key/)).toBeNull());
    expect(screen.queryByRole("alert")).toBeNull();
    expect(calls).toEqual([]);
  });
});

describe("AC-35 — rejections surface as reasons through the rebinding surface", () => {
  it("rebinding a locked Action rejects with the locked reason and never calls the seam", async () => {
    const calls: Array<{ method: string; payload: unknown }> = [];
    mockPreload(async (method, payload) => {
      calls.push({ method, payload });
      return SUCCESS({});
    });
    mount();

    act(() => fireEvent.click(rebindButton(/Open command palette/)));
    await screen.findByText(/Press a key/);
    pressKey("x");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/locked/i);
    expect(calls).toEqual([]);
  });

  it("a collision rejects naming the conflicting Action and never calls the seam", async () => {
    const calls: Array<{ method: string; payload: unknown }> = [];
    mockPreload(async (method, payload) => {
      calls.push({ method, payload });
      return SUCCESS({});
    });
    mount();

    // Place a bid has no binding; rebinding it to `b` collides with Focus the bid workflow.
    act(() => fireEvent.click(rebindButton(/Place a bid/)));
    await screen.findByText(/Press a key/);
    pressKey("b");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Focus the bid workflow");
    expect(calls).toEqual([]);
  });

  it("an unexpressible key (ArrowDown) rejects with a shape reason", async () => {
    const calls: Array<{ method: string; payload: unknown }> = [];
    mockPreload(async (method, payload) => {
      calls.push({ method, payload });
      return SUCCESS({});
    });
    mount();

    act(() => fireEvent.click(rebindButton(/Focus the bid workflow/)));
    await screen.findByText(/Press a key/);
    pressKey("ArrowDown");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/cannot be bound/i);
    expect(calls).toEqual([]);
  });

  it("a wire failure (transport down) renders from the typed seam failure, not a crash", async () => {
    mockPreload(async () => {
      throw new Error("ipc down");
    });
    mount();

    act(() => fireEvent.click(rebindButton(/Focus the bid workflow/)));
    await screen.findByText(/Press a key/);
    pressKey("v");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/Unable to reach the game/i);
  });
});

describe("AC-36 — per-Action reset and reset-all go through the seam", () => {
  it("per-Action reset removes just that override", async () => {
    const calls: Array<{ method: string; payload: unknown }> = [];
    const onChange = vi.fn();
    mockPreload(async (method, payload) => {
      calls.push({ method, payload });
      if (method === "resetKeyBinding") return SUCCESS({});
      return SUCCESS({});
    });
    mount({ "focus-bid": "v", "continue": "Space" }, onChange);

    act(() => fireEvent.click(screen.getByRole("button", { name: "Reset Focus the bid workflow binding" })));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith({}));
    expect(calls[0]).toEqual({ method: "resetKeyBinding", payload: { actionId: "focus-bid" } });
  });

  it("reset-all clears every override", async () => {
    const calls: Array<{ method: string; payload: unknown }> = [];
    const onChange = vi.fn();
    mockPreload(async (method, payload) => {
      calls.push({ method, payload });
      return SUCCESS({});
    });
    mount({ "focus-bid": "v", "continue": "x" }, onChange);

    act(() => fireEvent.click(screen.getByRole("button", { name: "Reset all bindings" })));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith({}));
    expect(calls[0]).toEqual({ method: "resetAllKeyBindings", payload: undefined });
  });
});