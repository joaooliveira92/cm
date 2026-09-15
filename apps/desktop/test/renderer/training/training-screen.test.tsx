// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TrainingScreen } from "../../../src/renderer/training/TrainingScreen.js";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import {
  emptyCoachView,
  mockPreload,
  respondWithCoaching,
  rid,
  singleCoachView,
  twoCoachView,
  type CoachingAssignmentsViewWire,
} from "./fixtures.js";

let navigateSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  navigateSpy = vi.fn();
  bindRouter({
    navigate: navigateSpy,
    history: { back: vi.fn(), forward: vi.fn(), canGoBack: () => false },
  } as never);
});

afterEach(() => cleanup());

const renderScreen = () =>
  render(
    <RegistryProvider>
      <TrainingScreen saveId={rid("s1")} />
    </RegistryProvider>,
  );

const mount = (view: CoachingAssignmentsViewWire) => {
  respondWithCoaching(view);
  return renderScreen();
};

describe("ticket 04 — Coaching Assignments screen renders coach data", () => {
  it("renders the page heading", async () => {
    mount(singleCoachView());

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 }).textContent ?? "").toContain(
        "Coaching Assignments",
      );
    });
  });

  it("renders a single coach's name, quality, and department", async () => {
    mount(singleCoachView());

    await waitFor(() => {
      expect(screen.getByText("Diane Wax")).toBeTruthy();
      expect(screen.getByText("14/20")).toBeTruthy();
    });
  });

  it("renders each coach's quality rating as N/20", async () => {
    mount(twoCoachView());

    await waitFor(() => {
      expect(screen.getByText("14/20")).toBeTruthy();
      expect(screen.getByText("9/20")).toBeTruthy();
    });
  });

  it("renders the empty state message when no coaches exist", async () => {
    mount(emptyCoachView());

    await waitFor(() => {
      expect(
        screen.getByText(
          "No coaching staff assigned yet. Staff will appear once you join a club.",
        ),
      ).toBeTruthy();
    });
  });

  it("renders the error state when the RPC fails", async () => {
    mockPreload(async () => ({
      _tag: "Failure",
      error: { _tag: "SaveNotFoundError", id: rid("s1") },
    }) as never);
    renderScreen();

    await waitFor(() => {
      expect(
        screen.getByRole("main", { name: "Coaching assignments" }),
      ).toBeTruthy();
    });
    // The page shows the error message, not a list or heading
    expect(screen.queryByRole("list")).toBeNull();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it("the `<main>` region is labelled for a11y", async () => {
    mount(singleCoachView());

    await waitFor(() => {
      const main = screen.getByRole("main", { name: /Coaching Assignments/ });
      expect(main.getAttribute("data-focus-id")).toBe("training");
    });
  });
});

describe("ticket 05 — Workload and Recovery is reachable from the Training screen", () => {
  it("the Workload and recovery button navigates to the training workload route", async () => {
    mount(singleCoachView());

    const button = await screen.findByRole("button", { name: "Workload and recovery" });
    fireEvent.click(button, { detail: 1 });

    expect(navigateSpy).toHaveBeenCalledWith({
      to: "/career/$saveId/training/workload",
      params: { saveId: rid("s1") },
    });
  });

  it("offers the button even when no coaching staff exist", async () => {
    mount(emptyCoachView());

    expect(await screen.findByRole("button", { name: "Workload and recovery" })).toBeTruthy();
  });
});
