// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoadCareerScreen } from "../src/renderer/router/loadCareer.js";
import { navigate } from "../src/renderer/navigation/adapter.js";

vi.mock("../src/renderer/navigation/adapter.js", () => ({
  navigate: vi.fn(),
}));

const mountedNavigate = vi.mocked(navigate);

const save = (name: string, archivedCause: string | null) => ({
  id: `id-${name}`,
  name,
  createdAt: "2026-01-01T00:00:00.000Z",
  archivedCause,
});

const mount = (saves: ReadonlyArray<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string) =>
      method === "listSaves"
        ? { _tag: "Success", value: saves }
        : { _tag: "Success", value: "pong" },
  };
  render(<LoadCareerScreen />);
};

const mountWithListSavesFailure = () => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string) => {
      if (method === "listSaves") {
        return { _tag: "Failure", error: { _tag: "TransportFailure", method: "listSaves", cause: null } };
      }
      return { _tag: "Success", value: "pong" };
    },
  };
  render(<LoadCareerScreen />);
};

beforeEach(() => {
  mountedNavigate.mockClear();
  cleanup();
});
afterEach(cleanup);

describe("Load Career — Archived Save marker", () => {
  it("marks an archived save and leaves a live one unmarked", async () => {
    mount([save("Live Career", null), save("Retired Career", "retired")]);

    expect(await screen.findByRole("button", { name: "Save Retired Career" })).toBeTruthy();
    // One marker for the one archived save — the live career carries none.
    expect(screen.getAllByText("Archived")).toHaveLength(1);
  });

  it("marks a sacked save the same as a retired one — the list shows state, not cause", async () => {
    mount([save("Sacked Career", "sacked"), save("Retired Career", "retired")]);

    await screen.findByRole("button", { name: "Save Sacked Career" });
    expect(screen.getAllByText("Archived")).toHaveLength(2);
  });

  it("still offers an archived save for opening — read-only is not gone", async () => {
    mount([save("Retired Career", "retired")]);

    const entry = await screen.findByRole("button", { name: "Save Retired Career" });
    expect(entry.hasAttribute("disabled")).toBe(false);
  });
});

describe("Load Career — failed listSaves", () => {
  it("shows an error message and retry button when listSaves fails", async () => {
    mountWithListSavesFailure();

    expect(await screen.findByText("Failed to load saves.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
    expect(screen.queryByText("No saves yet.")).toBeNull();
  });

  it("recovers from a failed listSaves on retry", async () => {
    mountWithListSavesFailure();

    await screen.findByText("Failed to load saves.");

    (window as unknown as { cmClone: { call: unknown } }).cmClone = {
      call: async (method: string) =>
        method === "listSaves"
          ? { _tag: "Success", value: [save("Recovered Career", null)] }
          : { _tag: "Success", value: "pong" },
    };

    screen.getByRole("button", { name: "Retry" }).click();

    await screen.findByRole("button", { name: "Save Recovered Career" });
    expect(screen.queryByText("Failed to load saves.")).toBeNull();
  });
});

describe("Load Career — empty state and navigation", () => {
  it("shows an empty state with a direct Start New Career action when no saves exist", async () => {
    mount([]);

    await screen.findByText("No saves yet.");
    const start = screen.getAllByRole("button", { name: "Start New Career" });
    expect(start.length).toBeGreaterThan(0);
  });

  it("Start New Career in the empty state navigates to league selection", async () => {
    mount([]);

    await screen.findByText("No saves yet.");
    fireEvent.click(screen.getAllByRole("button", { name: "Start New Career" })[0]);
    expect(mountedNavigate).toHaveBeenCalledWith({ type: "createLeagues" });
  });

  it("Back returns to the main menu", async () => {
    mount([]);

    await screen.findByText("No saves yet.");
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(mountedNavigate).toHaveBeenCalledWith({ type: "mainMenu" });
  });
});
