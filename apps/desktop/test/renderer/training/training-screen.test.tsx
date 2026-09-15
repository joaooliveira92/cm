// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TrainingScreen } from "../../../src/renderer/training/TrainingScreen.js";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import {
  mockPreload,
  rid,
  singleCoachView,
  twoCoachView,
  emptyCoachView,
  mixedWorkloadView,
  mixedSquadDevelopmentView,
  type CoachingAssignmentsViewWire,
  type WorkloadViewWire,
  type SquadDevelopmentViewWire,
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

/**
 * Install a single preload mock that answers the three overview RPC methods.
 * Any unlisted method returns a save-not-found failure.
 */
const respondWithAll = (
  coaching: CoachingAssignmentsViewWire,
  workload: WorkloadViewWire,
  development: SquadDevelopmentViewWire,
): void => {
  mockPreload(async (method: string) => {
    if (method === "getCoachingAssignments") return { _tag: "Success", value: coaching } as never;
    if (method === "getWorkload") return { _tag: "Success", value: workload } as never;
    if (method === "getSquadDevelopment") return { _tag: "Success", value: development } as never;
    return {
      _tag: "Failure",
      error: { _tag: "SaveNotFoundError", id: rid("s1") },
    } as never;
  });
};

describe("ticket 09 — Training Overview screen renders all sub-screen summary cards", () => {
  it("renders the page heading", async () => {
    respondWithAll(singleCoachView(), mixedWorkloadView(), mixedSquadDevelopmentView());
    renderScreen();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 }).textContent ?? "").toContain(
        "Training Overview",
      );
    });
  });

  it("renders the coaching staff card with coach count", async () => {
    respondWithAll(twoCoachView(), mixedWorkloadView(), mixedSquadDevelopmentView());
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText("2 coaches on staff")).toBeTruthy();
      expect(screen.getByText("Diane Wax")).toBeTruthy();
      expect(screen.getByText("Marcus Ito")).toBeTruthy();
    });
  });

  it("renders the workload card with resting count", async () => {
    respondWithAll(singleCoachView(), mixedWorkloadView(), mixedSquadDevelopmentView());
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText(/1 player needs rest/)).toBeTruthy();
      expect(screen.getAllByText(/Rui/).filter((el) => el.textContent?.includes("Costa")).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("renders the training plans card", async () => {
    respondWithAll(singleCoachView(), mixedWorkloadView(), mixedSquadDevelopmentView());
    renderScreen();

    await waitFor(() => {
      // "3 players" appears in the Training Plans card
      expect(screen.getByText("3 players")).toBeTruthy();
      // Rui Costa appears in at least the training plans section
      expect(screen.getAllByText(/Rui/).filter((el) => el.textContent?.includes("Costa")).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("renders the development centre card with Attribute change count", async () => {
    respondWithAll(singleCoachView(), mixedWorkloadView(), mixedSquadDevelopmentView());
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText(/1 player has Attribute changes/)).toBeTruthy();
    });
  });
});

describe("ticket 09 — Reuses existing components", () => {
  it("reuses CoachCard for the coaching preview", async () => {
    respondWithAll(twoCoachView(), mixedWorkloadView(), mixedSquadDevelopmentView());
    renderScreen();

    await waitFor(() => {
      // CoachCard renders as role=listitem with aria-label Coach <name>, quality <N>
      expect(screen.getByRole("listitem", { name: /Coach Diane Wax, quality/ })).toBeTruthy();
      expect(screen.getByRole("listitem", { name: /Coach Marcus Ito, quality/ })).toBeTruthy();
    });
  });

  it("uses development indicator wording for the development preview", async () => {
    respondWithAll(singleCoachView(), mixedWorkloadView(), mixedSquadDevelopmentView());
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText(/2 Attributes rose and 1 fell/)).toBeTruthy();
    });
  });
});

describe("ticket 09 — Links to each sub-screen", () => {
  it("the coaching card's button navigates to the coaching sub-screen", async () => {
    respondWithAll(singleCoachView(), mixedWorkloadView(), mixedSquadDevelopmentView());
    renderScreen();

    const button = await screen.findByRole("button", { name: "View all coaching assignments" });
    fireEvent.click(button, { detail: 1 });

    expect(navigateSpy).toHaveBeenCalledWith({
      to: "/career/$saveId/training/coaching",
      params: { saveId: rid("s1") },
    });
  });

  it("the workload card's button navigates to the workload sub-screen", async () => {
    respondWithAll(singleCoachView(), mixedWorkloadView(), mixedSquadDevelopmentView());
    renderScreen();

    const button = await screen.findByRole("button", { name: "View workload and recovery details" });
    fireEvent.click(button, { detail: 1 });

    expect(navigateSpy).toHaveBeenCalledWith({
      to: "/career/$saveId/training/workload",
      params: { saveId: rid("s1") },
    });
  });

  it("the development card's button navigates to the development centre", async () => {
    respondWithAll(singleCoachView(), mixedWorkloadView(), mixedSquadDevelopmentView());
    renderScreen();

    const button = await screen.findByRole("button", { name: "View full development centre" });
    fireEvent.click(button, { detail: 1 });

    expect(navigateSpy).toHaveBeenCalledWith({
      to: "/career/$saveId/training/development-centre",
      params: { saveId: rid("s1") },
    });
  });

  it("each training plan preview links to that player's training plan", async () => {
    respondWithAll(singleCoachView(), mixedWorkloadView(), mixedSquadDevelopmentView());
    renderScreen();

    const planButton = await screen.findByRole("button", { name: "Rui Costa training plan" });
    fireEvent.click(planButton, { detail: 1 });

    expect(navigateSpy).toHaveBeenCalledWith({
      to: "/career/$saveId/training/plan/$playerId",
      params: { saveId: rid("s1"), playerId: "p1" },
    });
  });
});

describe("ticket 09 — Empty and error states", () => {
  it("shows a message when no coaching staff exist", async () => {
    respondWithAll(emptyCoachView(), mixedWorkloadView(), mixedSquadDevelopmentView());
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText("No coaching staff assigned yet.")).toBeTruthy();
    });
  });

  it("shows a message when the squad has no players", async () => {
    respondWithAll(twoCoachView(), { players: [] }, mixedSquadDevelopmentView());
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText("No players in your squad.")).toBeTruthy();
    });
  });

  it("renders the loading state", () => {
    // With no mock set up, the atoms remain in initial state
    mockPreload(async () => new Promise(() => { /* never resolves */ }) as never);
    renderScreen();

    expect(screen.getByText("Loading training overview...")).toBeTruthy();
  });

  it("renders the error state when a read fails", async () => {
    mockPreload(async () => ({
      _tag: "Failure",
      error: { _tag: "SaveNotFoundError", id: rid("s1") },
    }) as never);
    renderScreen();

    await waitFor(() => {
      expect(
        screen.getByRole("main", { name: "Training overview" }),
      ).toBeTruthy();
    });
    expect(screen.queryByRole("list")).toBeNull();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it("the `<main>` region is labelled for a11y", async () => {
    respondWithAll(singleCoachView(), mixedWorkloadView(), mixedSquadDevelopmentView());
    renderScreen();

    await waitFor(() => {
      const main = screen.getByRole("main", { name: "Training Overview" });
      expect(main.getAttribute("data-focus-id")).toBe("training");
    });
  });
});