/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vite-plus/test";
import type { SetPrimaryAction } from "../../shell/primary-action.js";
import { NewGameArchetypeScreen } from "./NewGameArchetypeScreen.js";

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

function setupUi(initialArchetype = null) {
  const onPrimaryActionChange = vi.fn() as unknown as SetPrimaryAction;
  const onNext = vi.fn();
  const onBack = vi.fn();
  const utils = render(
    <NewGameArchetypeScreen
      initialArchetype={initialArchetype}
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

describe("NewGameArchetypeScreen", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders three presets and a create-your-own card", () => {
    setupUi();
    expect(screen.getByText("Merchant Prince")).toBeTruthy();
    expect(screen.getByText("Shipyard Baron")).toBeTruthy();
    expect(screen.getByText("Grand Admiral")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Create Your Own/ })).toBeTruthy();
  });

  it("does not enable the primary action until an archetype is selected", () => {
    const { onPrimaryActionChange } = setupUi();
    expect(lastPrimary(onPrimaryActionChange).disabled).toBe(true);
  });

  it("allows a preset to be selected immediately", () => {
    const { onPrimaryActionChange } = setupUi();
    click("Grand Admiral");
    const action = lastPrimary(onPrimaryActionChange);
    expect(action.disabled).toBe(false);
    expect(action.label).toBe("Choose Nation");
  });

  it("selecting a preset shows its consequence preview", () => {
    setupUi();
    click("Grand Admiral");
    expect(screen.getByText("Consequences")).toBeTruthy();
    expect(screen.getByText("+20", { exact: true })).toBeTruthy();
  });

  it("shows an empty placeholder before any selection", () => {
    setupUi();
    expect(screen.getByText("Select an archetype to see its consequences.")).toBeTruthy();
  });

  it("opens a modal with three editable sliders on create-your-own", () => {
    setupUi();
    click("Create Your Own");
    const editableSliders = screen
      .getAllByRole("slider")
      .filter((el) => (el as HTMLInputElement).disabled === false);
    expect(editableSliders.length).toBe(3);
  });

  it("provides accessible labelled steppers in the editor", () => {
    setupUi();
    click("Create Your Own");
    const sliderNames = screen.getAllByRole("slider").map((el) => el.getAttribute("aria-label"));
    expect(sliderNames).toEqual(["Economy allocation", "Industry allocation", "Combat allocation"]);
  });

  it("blocks confirming an invalid allocation", () => {
    setupUi();
    click("Create Your Own");
    click("Increase Combat");
    click("Increase Combat");

    const confirm = screen.getByRole("button", {
      name: "Confirm",
    }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);

    fireEvent.click(screen.getAllByText("22 / 20")[0]!);
    expect(screen.getByText("Allocation needs fixing")).toBeTruthy();
    expect(screen.getByText(/allocation totals 22, expected 20/)).toBeTruthy();
  });

  it("permits confirming once the allocation is corrected", () => {
    setupUi();
    click("Create Your Own");
    click("Increase Combat");
    click("Increase Combat");
    click("Decrease Economy");
    click("Decrease Economy");

    const confirm = screen.getByRole("button", {
      name: "Confirm",
    }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(false);
  });

  it("reset returns the editor to the balanced baseline", () => {
    setupUi();
    click("Create Your Own");
    click("Increase Combat");
    click("Reset");
    const values = screen.getAllByRole("slider").map((el) => (el as HTMLInputElement).value);
    expect(values).toEqual(["7", "7", "6"]);
  });

  it("committing a custom build selects its card and enables the primary action", () => {
    const { onPrimaryActionChange } = setupUi();
    click("Create Your Own");
    click("Confirm");

    const createCard = screen.getByRole("button", {
      name: /Create Your Own/,
    });
    expect(createCard.getAttribute("aria-pressed")).toBe("true");
    expect(lastPrimary(onPrimaryActionChange).disabled).toBe(false);
  });

  it("emits a preset selection on continue", () => {
    const { onPrimaryActionChange, onNext } = setupUi();
    click("Shipyard Baron");
    lastPrimary(onPrimaryActionChange).onTrigger?.();
    expect(onNext).toHaveBeenCalledTimes(1);
    const selection = onNext.mock.calls[0]![0];
    expect(selection.kind).toBe("preset");
    expect(selection.id).toBe("shipyard_baron");
  });

  it("emits the custom allocation as a custom selection on continue", () => {
    const { onPrimaryActionChange, onNext } = setupUi();
    click("Create Your Own");
    click("Confirm");
    lastPrimary(onPrimaryActionChange).onTrigger?.();
    expect(onNext).toHaveBeenCalledTimes(1);
    const selection = onNext.mock.calls[0]![0];
    expect(selection.kind).toBe("custom");
    expect(selection.allocation).toEqual({
      economy: 7,
      industry: 7,
      combat: 6,
    });
  });
});
