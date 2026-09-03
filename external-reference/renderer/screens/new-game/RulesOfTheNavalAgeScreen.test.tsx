/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { NewGameOptions } from "../../../shared/new-game-contract.js";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { BluewaveDesktopBridge } from "../../../preload/index.js";
import type { AdmiralPresetValues } from "./admiral-preset.js";
import { RulesOfTheNavalAgeScreen } from "./RulesOfTheNavalAgeScreen.js";

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

const options: NewGameOptions = {
  scenarios: [
    {
      id: "scen_1900",
      name: "January 1900",
      startYear: 1900,
      startMonth: 1,
      participantNationIds: ["nation_uk", "nation_germany"],
      playableNationIds: ["nation_uk", "nation_germany"],
    },
  ],
  nations: [
    { id: "nation_uk", name: "United Kingdom", regimeName: "Monarchy", regimeType: "monarchy" },
  ],
  supportedValues: {
    scenarioId: ["scen_1900"],
    playerSlotId: ["nation_uk", "nation_germany"],
    continuityMode: ["historical"],
    fleetSize: ["small", "standard", "large", "very_large"],
    researchSpeed: ["slow", "standard", "fast", "very_fast"],
    technologyVariation: ["none", "some", "considerable"],
    historicalBudget: ["standard", "historical"],
    legacyFleetMode: ["historical", "generated", "disabled"],
    tacticalRealism: ["standard", "realistic", "not_applicable"],
    difficulty: ["easy", "normal", "hard", "very_hard"],
  },
};

const execute = vi.fn(async (name: string) => {
  if (name === "listNewGameOptions") {
    return { outcome: "success" as const, value: options };
  }
  throw new Error(`unexpected command: ${name}`);
});

const bridge = { campaign: { execute } } as unknown as BluewaveDesktopBridge;

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  window.bluewave = bridge;
});

async function setupUi(recommendedPreset: AdmiralPresetValues | null = null) {
  const onCancel = vi.fn();
  const onNext = vi.fn();
  const utils = render(
    <RulesOfTheNavalAgeScreen
      recommendedPreset={recommendedPreset}
      onCancel={onCancel}
      onNext={onNext}
    />,
  );
  await screen.findByText("Rules of the Naval Age");
  return { ...utils, onCancel, onNext };
}

function openSelectAndPick(labelText: string, optionName: string) {
  const trigger = screen.getByLabelText(labelText);
  fireEvent.click(trigger);
  const selectRoot = trigger.parentElement as HTMLElement;
  const option = within(selectRoot).getByRole("option", { name: optionName });
  fireEvent.click(option);
}

describe("RulesOfTheNavalAgeScreen", () => {
  it("applies a preset's exact six-setting bundle when its pill is clicked", async () => {
    await setupUi();

    fireEvent.click(screen.getByRole("button", { name: /Cadet/ }));

    expect(screen.getByRole("button", { name: /Cadet/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByLabelText("Fleet Size").textContent).toContain("Small");
    expect(screen.getByLabelText("Difficulty").textContent).toContain("Easy");
  });

  it("reverts to Custom after editing a single setting post-preset", async () => {
    await setupUi();

    fireEvent.click(screen.getByRole("button", { name: /Cadet/ }));
    expect(screen.getByRole("button", { name: /Cadet/ }).getAttribute("aria-pressed")).toBe("true");

    openSelectAndPick("Difficulty", "Hard");

    expect(screen.getByRole("button", { name: /Cadet/ }).getAttribute("aria-pressed")).toBe(
      "false",
    );
    expect(screen.getByRole("button", { name: /Custom/ }).getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  it.each([
    ["Small", /faster turns, fewer ships/i],
    ["Standard", /recommended default/i],
    ["Large", /more ships to manage, slower turns/i],
    ["Very Large", /most ships to manage/i],
  ])("shows the qualitative readout for fleet size %s", async (optionName, expectedText) => {
    await setupUi();

    openSelectAndPick("Fleet Size", optionName);

    expect(screen.getByText(expectedText)).toBeTruthy();
  });

  it("disables Next until options finish loading, then advances with the current preferences", async () => {
    const { onNext } = await setupUi();

    fireEvent.click(screen.getByRole("button", { name: /Cadet/ }));
    fireEvent.click(screen.getByRole("button", { name: "Next: Choose Archetype" }));

    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
    const [preferences] = onNext.mock.calls[0] as [Record<string, string>, NewGameOptions];
    expect(preferences.fleetSize).toBe("small");
    expect(preferences.difficulty).toBe("easy");
  });
});
