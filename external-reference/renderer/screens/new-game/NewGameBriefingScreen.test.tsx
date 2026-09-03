/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { OpeningBriefingProjection } from "@bluewave/campaign-engine";
import { afterEach, beforeAll, describe, expect, it, vi } from "vite-plus/test";
import { NewGameBriefingScreen } from "./NewGameBriefingScreen.js";

function fixtureProjection(
  overrides: Partial<OpeningBriefingProjection> = {},
): OpeningBriefingProjection {
  return {
    nationId: "gb",
    nationName: "United Kingdom",
    month: { month: 1, year: 1880 },
    stateOfTheNavy: {
      shipClassCounts: [
        { label: "battleship", count: 2 },
        { label: "cruiser", count: 4 },
      ],
      shipsUnderConstruction: 1,
      mostExpensiveActiveClass: { className: "Majestic class", projectedCost: 150 },
      largestDockCapacity: 30,
      totalMaintenance: 1_200,
      constructionCommitted: 400,
    },
    treasury: {
      governmentAllocation: 2_000,
      fleetMaintenance: 1_000,
      constructionCommitted: 400,
      researchExpenditure: 500,
      projectedSurplus: 100,
      status: "narrow",
    },
    foreignIntelligence: {
      relations: [{ nationId: "de", name: "German Empire", relation: "at_war", tension: 10 }],
    },
    immediateConcerns: [
      { category: "budget_shortfall", message: "The projected monthly budget runs a deficit." },
    ],
    ...overrides,
  };
}

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === "undefined") {
    class ResizeObserverStub {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub;
  }
});

function renderScreen(projection: OpeningBriefingProjection, onTakeCommand = vi.fn()) {
  const onInspect = vi
    .fn()
    .mockResolvedValue({ outcome: "success", value: { projection }, diagnostics: [] });
  const view = render(
    <NewGameBriefingScreen
      sessionId="s1"
      onInspectOpeningBriefing={onInspect}
      onTakeCommand={onTakeCommand}
    />,
  );
  return { onInspect, onTakeCommand, view };
}

describe("NewGameBriefingScreen", () => {
  afterEach(() => {
    cleanup();
  });

  it("loads the projection and renders the Appointment page first with title and start date", async () => {
    renderScreen(fixtureProjection());
    await screen.findByText("Opening Strategic Briefing");
    expect(
      screen.getByText(/You have been appointed First Sea Lord — United Kingdom/),
    ).toBeTruthy();
    expect(screen.getByText("Appointment confirmed · January 1880")).toBeTruthy();
    // Page 1 keeps the flavorful forward label, not "Next".
    expect(screen.getByRole("button", { name: "Review Naval Estimates" })).toBeTruthy();
    // Back is not available on page 1.
    expect(screen.getByRole("button", { name: "Back" }).hasAttribute("disabled")).toBe(true);
  });

  it("walks the full five-page sequence then Take command fires the closing action", async () => {
    const onTakeCommand = vi.fn();
    renderScreen(fixtureProjection(), onTakeCommand);
    await screen.findByText("Opening Strategic Briefing");

    // Page 1 -> 2 via "Review Naval Estimates".
    fireEvent.click(screen.getByRole("button", { name: "Review Naval Estimates" }));
    expect(screen.getByText("State of the Navy")).toBeTruthy();
    expect(screen.getByText("Majestic class (£150)")).toBeTruthy();
    expect(screen.getByText("Ships under construction")).toBeTruthy();

    // Page 2 -> 3.
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Treasury Position")).toBeTruthy();
    expect(screen.getByText("Projected surplus / deficit")).toBeTruthy();
    expect(screen.getByText("narrow")).toBeTruthy();

    // Page 3 -> 4.
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Foreign Intelligence")).toBeTruthy();
    expect(screen.getByText("German Empire")).toBeTruthy();
    expect(screen.getByText("at war · tension 10")).toBeTruthy();

    // Page 4 -> 5.
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Immediate Concerns")).toBeTruthy();
    expect(screen.getByText("The projected monthly budget runs a deficit.")).toBeTruthy();

    // Back returns to page 4.
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Foreign Intelligence")).toBeTruthy();

    // Forward again then Take command.
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Take command" }));
    expect(onTakeCommand).toHaveBeenCalledTimes(1);
  });

  it("shows an error state when the inspection fails", async () => {
    const onInspect = vi
      .fn()
      .mockResolvedValue({ outcome: "error", reason: "SESSION_NOT_FOUND", diagnostics: [] });
    render(
      <NewGameBriefingScreen
        sessionId="s1"
        onInspectOpeningBriefing={onInspect}
        onTakeCommand={vi.fn()}
      />,
    );
    await screen.findByText("Briefing unavailable");
    expect(screen.getByText(/SESSION_NOT_FOUND/)).toBeTruthy();
  });
});
