// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SaveListScreen } from "../src/renderer/router/saveList.js";

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
  render(<SaveListScreen />);
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
  render(<SaveListScreen />);
};

beforeEach(cleanup);
afterEach(cleanup);

describe("Save List — Archived Save marker", () => {
  it("marks an archived save and leaves a live one unmarked", async () => {
    mount([save("Live Career", null), save("Retired Career", "retired")]);

    expect(await screen.findByRole("button", { name: "Retired Career" })).toBeTruthy();
    // One marker for the one archived save — the live career carries none.
    expect(screen.getAllByText("Archived")).toHaveLength(1);
  });

  it("marks a sacked save the same as a retired one — the list shows state, not cause", async () => {
    mount([save("Sacked Career", "sacked"), save("Retired Career", "retired")]);

    await screen.findByRole("button", { name: "Sacked Career" });
    expect(screen.getAllByText("Archived")).toHaveLength(2);
  });

  it("still offers an archived save for opening — read-only is not gone", async () => {
    mount([save("Retired Career", "retired")]);

    const entry = await screen.findByRole("button", { name: "Retired Career" });
    expect(entry.hasAttribute("disabled")).toBe(false);
  });
});

describe("Save List — failed listSaves", () => {
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

    await screen.findByRole("button", { name: "Recovered Career" });
    expect(screen.queryByText("Failed to load saves.")).toBeNull();
  });
});
