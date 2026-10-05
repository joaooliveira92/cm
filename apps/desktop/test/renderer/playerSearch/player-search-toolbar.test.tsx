import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SaveId } from "@cm-clone/contracts";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { PlayerSearchScreen } from "../../../src/renderer/playerSearch/PlayerSearchScreen.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { ScreenToolbarSlot } from "../../../src/renderer/chrome/ScreenToolbarSlot.js";
import { RegisteredScreenBar } from "../registered-screen-bar.js";

/**
 * Player Search registers a Search button in the shell's actions row. The search is committed:
 * the button must submit the filters as they stand now, not the ones captured when the toolbar
 * was first registered.
 */

const saveId = SaveId.make("s1");

let calls: Array<{ method: string; payload: unknown }>;

const install = () => {
  calls = [];
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string, payload: unknown) => {
      calls.push({ method, payload });
      return method === "getPlayerSearch"
        ? { _tag: "Success", value: { total: 0, results: [] } }
        : { _tag: "Failure", error: { _tag: "SaveNotFoundError", saveId } };
    },
  };
};

const mount = () =>
  render(
    <RegistryProvider>
      <ScreenToolbarSlot />
      <PlayerSearchScreen saveId={saveId} />
      <RegisteredScreenBar />
    </RegistryProvider>,
  );

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  install();
  bindRouter({
    navigate: vi.fn(),
    history: { back: () => {}, forward: () => {}, canGoBack: () => false },
  } as never);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Player Search's toolbar Search button", () => {
  it("issues the read for the edited filters, not the ones captured at first render", async () => {
    mount();

    fireEvent.change(screen.getByLabelText("Player name"), { target: { value: "Ada" } });
    fireEvent.click(screen.getByRole("button", { name: "Search players" }));

    await waitFor(() => expect(calls.some((call) => call.method === "getPlayerSearch")).toBe(true));
    const search = calls.filter((call) => call.method === "getPlayerSearch");
    expect(search).toHaveLength(1);
    expect(search[0]!.payload).toMatchObject({ saveId, query: { name: "Ada" } });
  });
});