// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TrainingPlanSummaryCard } from "../../../src/renderer/training/TrainingPlanSummaryCard.js";

afterEach(() => cleanup());

describe("ticket 06 — TrainingPlanSummaryCard is a self-contained, props-only component", () => {
  // Rendered bare — no RegistryProvider, no router, no preload bridge. If the card ever reaches for
  // an atom or a route it throws here, which is what keeps it liftable into Screens 105 and 114.
  it("renders outside any provider, naming the player and their Category focus", () => {
    render(<TrainingPlanSummaryCard playerName="Rui Costa" focus="physical" />);
    const card = screen.getByRole("region", { name: "Rui Costa training plan" });
    expect(within(card).getByText("Rui Costa")).toBeTruthy();
    expect(within(card).getByText("Training Focus: Physical")).toBeTruthy();
    expect(
      within(card).getByText("Physical Attributes receive a larger share of Player Development when the Season concludes."),
    ).toBeTruthy();
  });

  it("shows None as a standing choice with no Category favoured", () => {
    render(<TrainingPlanSummaryCard playerName="Vitor Baia" focus={null} />);
    expect(screen.getByText("Training Focus: None")).toBeTruthy();
    expect(
      screen.getByText("No Category receives a larger share of Player Development when the Season concludes."),
    ).toBeTruthy();
  });

  it("places a host's action inside the card", () => {
    render(
      <TrainingPlanSummaryCard playerName="Rui Costa" focus={null}>
        <button type="button">Open plan</button>
      </TrainingPlanSummaryCard>,
    );
    const card = screen.getByRole("region", { name: "Rui Costa training plan" });
    expect(within(card).getByRole("button", { name: "Open plan" })).toBeTruthy();
  });
});
