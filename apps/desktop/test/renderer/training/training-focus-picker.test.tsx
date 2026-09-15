// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TrainingFocusPicker } from "../../../src/renderer/training/TrainingFocusPicker.js";

afterEach(() => cleanup());

const pressed = () =>
  within(screen.getByRole("group", { name: "Rui Costa Training Focus" }))
    .getAllByRole("button")
    .filter((button) => button.getAttribute("aria-pressed") === "true")
    .map((button) => button.textContent);

describe("ticket 06 — TrainingFocusPicker shows the current focus and reports a choice", () => {
  // Rendered bare — no RegistryProvider, router, or preload bridge.
  it("renders None plus the offered Categories, with the current Training Focus pressed", () => {
    render(
      <TrainingFocusPicker
        playerName="Rui Costa"
        current="mental"
        offered={["technical", "mental", "physical"]}
        onSelect={vi.fn()}
      />,
    );
    const group = screen.getByRole("group", { name: "Rui Costa Training Focus" });
    expect(within(group).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "None",
      "Technical",
      "Mental",
      "Physical",
    ]);
    expect(pressed()).toEqual(["Mental"]);
  });

  it("presses None when the player has no Category focus", () => {
    render(
      <TrainingFocusPicker playerName="Rui Costa" current={null} offered={["technical"]} onSelect={vi.fn()} />,
    );
    expect(pressed()).toEqual(["None"]);
  });

  it("reports a Category choice, and None as null", () => {
    const onSelect = vi.fn();
    render(
      <TrainingFocusPicker playerName="Rui Costa" current="mental" offered={["technical", "mental"]} onSelect={onSelect} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Technical" }));
    fireEvent.click(screen.getByRole("button", { name: "None" }));
    expect(onSelect.mock.calls).toEqual([["technical"], [null]]);
  });

  it("still shows an off-rule current Category pressed and disabled, and lets an offered value replace it", () => {
    const onSelect = vi.fn();
    render(
      <TrainingFocusPicker
        playerName="Rui Costa"
        current="goalkeeping"
        offered={["technical", "mental", "physical"]}
        onSelect={onSelect}
      />,
    );
    expect(pressed()).toEqual(["Goalkeeping"]);
    const goalkeeping = screen.getByRole("button", { name: "Goalkeeping" }) as HTMLButtonElement;
    expect(goalkeeping.disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Physical" }));
    expect(onSelect.mock.calls).toEqual([["physical"]]);
  });

  it("does not offer an off-rule Category once the player no longer holds it", () => {
    render(
      <TrainingFocusPicker playerName="Rui Costa" current={null} offered={["technical"]} onSelect={vi.fn()} />,
    );
    expect(screen.queryByRole("button", { name: "Goalkeeping" })).toBeNull();
  });

  it("does not report the value that is already pressed", () => {
    const onSelect = vi.fn();
    render(
      <TrainingFocusPicker playerName="Rui Costa" current="mental" offered={["technical", "mental"]} onSelect={onSelect} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Mental" }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("disables every option while disabled", () => {
    render(
      <TrainingFocusPicker playerName="Rui Costa" current={null} offered={["technical"]} disabled onSelect={vi.fn()} />,
    );
    for (const button of screen.getAllByRole("button")) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
  });
});
