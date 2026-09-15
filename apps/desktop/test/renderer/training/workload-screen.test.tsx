// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkloadScreen } from "../../../src/renderer/training/WorkloadScreen.js";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import {
  mixedWorkloadView,
  mockPreload,
  respondWithWorkload,
  rid,
} from "./fixtures.js";

beforeEach(() => {
  bindRouter({
    navigate: vi.fn(),
    history: { back: vi.fn(), forward: vi.fn(), canGoBack: () => false },
  } as never);
});

afterEach(() => cleanup());

const renderScreen = () =>
  render(
    <RegistryProvider>
      <WorkloadScreen saveId={rid("s1")} />
    </RegistryProvider>,
  );

describe("ticket 05 — Workload and Recovery screen shows Condition and recovery status per player", () => {
  it("asks getWorkload for the save it is given", async () => {
    const calls: Array<{ method: string; payload: unknown }> = [];
    mockPreload(async (method, payload) => {
      calls.push({ method, payload });
      return { _tag: "Success", value: mixedWorkloadView() } as never;
    });
    renderScreen();

    await waitFor(() => expect(screen.getByRole("list", { name: "Player workload" })).toBeTruthy());
    expect(calls).toEqual([{ method: "getWorkload", payload: { saveId: "s1" } }]);
  });

  it("renders one row per player, each with its own Condition gauge and recovery status", async () => {
    respondWithWorkload(mixedWorkloadView());
    renderScreen();

    const list = await screen.findByRole("list", { name: "Player workload" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);

    const resting = within(list).getByRole("listitem", { name: "Rui Costa" });
    expect(within(resting).getByRole("meter").getAttribute("aria-valuenow")).toBe("40");
    expect(within(resting).getByText("Rest")).toBeTruthy();
    expect(within(resting).getByText("Last injury this Season: severe")).toBeTruthy();

    const fit = within(list).getByRole("listitem", { name: "Ana Reis" });
    expect(within(fit).getByRole("meter").getAttribute("aria-valuenow")).toBe("100");
    expect(within(fit).getByText("Active")).toBeTruthy();
    expect(within(fit).getByText("No injury this Season")).toBeTruthy();
  });

  it("keeps the order the read returned", async () => {
    respondWithWorkload(mixedWorkloadView());
    renderScreen();

    const list = await screen.findByRole("list", { name: "Player workload" });
    expect(within(list).getAllByRole("listitem").map((item) => item.getAttribute("aria-label"))).toEqual([
      "Rui Costa",
      "Ana Reis",
    ]);
  });

  it("labels the ready page and keeps it in the training focus scope", async () => {
    respondWithWorkload(mixedWorkloadView());
    renderScreen();

    const main = await screen.findByRole("main", { name: "Workload and Recovery" });
    expect(main.getAttribute("data-focus-id")).toBe("training");
  });

  it("renders a single line for a club with no players", async () => {
    respondWithWorkload({ players: [] });
    renderScreen();

    expect(await screen.findByText("No players in your squad.")).toBeTruthy();
    expect(screen.queryByRole("meter")).toBeNull();
  });

  it("renders the typed error when the save is missing", async () => {
    mockPreload(async () => ({
      _tag: "Failure",
      error: { _tag: "SaveNotFoundError", id: rid("s1") },
    }) as never);
    renderScreen();

    const main = await screen.findByRole("main", { name: "Workload and recovery" });
    expect(await within(main).findByText("That save could not be found.")).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.queryByRole("meter")).toBeNull();
  });
});
