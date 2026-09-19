/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { SetPrimaryAction } from "../../shell/primary-action.js";
import { NewGameFleetMethodScreen } from "./NewGameFleetMethodScreen.js";
import { defaultFleetMethod, type FleetMethodDraft } from "./new-game-fleet-method-screen-state.js";

function setupUi(initialFleetMethod: FleetMethodDraft = defaultFleetMethod()) {
  const onPrimaryActionChange = vi.fn() as unknown as SetPrimaryAction;
  const onNext = vi.fn();
  const onBack = vi.fn();
  const utils = render(
    <NewGameFleetMethodScreen
      initialFleetMethod={initialFleetMethod}
      status="ready"
      error={null}
      onBack={onBack}
      onNext={onNext}
      onPrimaryActionChange={onPrimaryActionChange}
    />,
  );
  return { ...utils, onNext, onBack, onPrimaryActionChange };
}

function lastPrimary(onPrimaryActionChange: ReturnType<typeof setupUi>["onPrimaryActionChange"]): {
  label?: string;
  disabled?: boolean;
  onTrigger?: () => void;
} {
  const calls = vi
    .mocked(onPrimaryActionChange)
    .mock.calls.map((call) => call[0])
    .filter(Boolean);
  return calls[calls.length - 1] ?? {};
}

function click(name: string): void {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(name) }));
}

describe("NewGameFleetMethodScreen", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders three cards with the spec §5a copy mapping", () => {
    setupUi();
    expect(screen.getByText("Inherit an Existing Navy")).toBeTruthy();
    expect(screen.getByText("Build the Legacy Fleet Manually")).toBeTruthy();
    expect(screen.getByText("Curated Historical-Inspired Fleet")).toBeTruthy();
  });

  it("defaults to the generated (Inherit an Existing Navy) card on first visit", () => {
    setupUi();
    const card = screen.getByRole("button", { name: /Inherit an Existing Navy/ });
    expect(card.getAttribute("aria-pressed")).toBe("true");
  });

  it("shows the manual-build not-yet-available note only on the disabled card", () => {
    setupUi();
    expect(screen.getByText(/Detailed fleet construction isn't available yet/)).toBeTruthy();

    const generatedCard = screen.getByRole("button", { name: /Inherit an Existing Navy/ });
    const historicalCard = screen.getByRole("button", {
      name: /Curated Historical-Inspired Fleet/,
    });
    expect(generatedCard.textContent).not.toMatch(/not.*available/i);
    expect(historicalCard.textContent).not.toMatch(/not.*available/i);
  });

  it("shows no numeric allocation figures, ship counts, or phase breakdowns", () => {
    setupUi();
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/Phase\s*1/i);
    expect(text).not.toMatch(/Phase\s*2/i);
    expect(text).not.toMatch(/\d+\s*ships?/i);
  });

  it("allows selecting any of the three cards, with no gating", () => {
    setupUi();
    click("Build the Legacy Fleet Manually");
    expect(
      screen
        .getByRole("button", { name: /Build the Legacy Fleet Manually/ })
        .getAttribute("aria-pressed"),
    ).toBe("true");

    click("Curated Historical-Inspired Fleet");
    expect(
      screen
        .getByRole("button", { name: /Curated Historical-Inspired Fleet/ })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen
        .getByRole("button", { name: /Build the Legacy Fleet Manually/ })
        .getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("the primary action is never blocked, since a selection always exists", () => {
    const { onPrimaryActionChange } = setupUi();
    expect(lastPrimary(onPrimaryActionChange).disabled).toBe(false);
    click("Build the Legacy Fleet Manually");
    expect(lastPrimary(onPrimaryActionChange).disabled).toBe(false);
  });

  it("emits the selected legacyFleetModeId on continue", () => {
    const { onPrimaryActionChange, onNext } = setupUi();
    click("Curated Historical-Inspired Fleet");
    lastPrimary(onPrimaryActionChange).onTrigger?.();
    expect(onNext).toHaveBeenCalledWith({ legacyFleetModeId: "historical" });
  });

  it("starts from the provided initial fleet method", () => {
    setupUi({ legacyFleetModeId: "disabled" });
    expect(
      screen
        .getByRole("button", { name: /Build the Legacy Fleet Manually/ })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("calls onBack when Back to Identity is clicked", () => {
    const { onBack } = setupUi();
    fireEvent.click(screen.getByRole("button", { name: "Back to Identity" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
