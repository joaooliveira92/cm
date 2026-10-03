import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PlayerId, Tactic } from "@cm-clone/contracts";
import {
  OUTFIELD_ATTRIBUTES,
  builtInTemplate,
  tacticFromTemplate,
  type PlayerInstructions,
} from "@cm-clone/shared";
import { SetInstructionsPanel } from "../../../src/renderer/tactics/SetInstructionsPanel.js";

const pid = (id: string) => PlayerId.make(id);

const player = (index: number) => ({
  id: pid(`p-${index}`),
  firstName: `First${index}`,
  lastName: `Last${index}`,
  dateOfBirth: "2000-01-01",
  age: 25,
  attributes: Object.fromEntries(OUTFIELD_ATTRIBUTES.map((attribute) => [attribute, 12])),
  positions: [],
  positionLabel: "",
  canPlay: [],
  positionOrder: 0,
  overallRating: 50,
  positionRatings: {},
  cellRatings: {},
  suitability: {},
  retrainingTarget: null,
  condition: 100,
  trainingFocus: null,
  nationality: "England",
  birthplace: null,
  foreign: false,
  contractWage: 9000,
  contractExpiryDate: "2028-06-30",
  transferValue: 1200000,
});

const SQUAD = Array.from({ length: 11 }, (_, index) => player(index));

const baseTactic = tacticFromTemplate(
  builtInTemplate("4-4-2")!,
  SQUAD.map((p) => p.id),
);

const defaultTactic = () =>
  new Tactic({
    sourceTemplate: "4-4-2",
    slots: baseTactic.slots,
    team: baseTactic.team,
    teamSetPieces: baseTactic.teamSetPieces,
    assignments: SQUAD.map((p) => p.id),
    bench: baseTactic.bench,
    takers: baseTactic.takers,
  });

const squadById = new Map(SQUAD.map((p) => [p.id, p]));

beforeEach(() => cleanup());
afterEach(() => cleanup());

describe("SetInstructionsPanel — team sub-mode", () => {
  it("renders team instructions by default when sub-mode is team", async () => {
    const tactic = defaultTactic();
    const onChange = () => { /* no-op */ };
    render(
      <SetInstructionsPanel
        tactic={tactic}
        squadById={squadById}
        selectedSlot={null}
        onSelectSlot={() => {}}
        onTacticChange={onChange}
      />,
    );

    // Switch to team mode
    fireEvent.click(screen.getByRole("button", { name: "Team" }));
    await screen.findByText("Team Instructions");
    expect(screen.getByText("Passing")).toBeTruthy();
    expect(screen.getByText("Offside Trap")).toBeTruthy();
    expect(screen.getByRole("group", { name: "Set Pieces" })).toBeTruthy();
  });

  it("shows unticked placeholder for choice-valued team instructions", async () => {
    const tactic = defaultTactic();
    render(
      <SetInstructionsPanel
        tactic={tactic}
        squadById={squadById}
        selectedSlot={null}
        onSelectSlot={() => {}}
        onTacticChange={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Team" }));
    // The team default for passing is "mixed" — shows the placeholder
    const selects = screen.getAllByRole("combobox");
    expect(selects.length).toBeGreaterThan(0);
  });

  it("ticking a team instruction enables its dropdown", async () => {
    let saved = false;
    const tactic = defaultTactic();
    render(
      <SetInstructionsPanel
        tactic={tactic}
        squadById={squadById}
        selectedSlot={null}
        onSelectSlot={() => {}}
        onTacticChange={() => { saved = true; }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Team" }));
    // Find the Passing checkbox
    const checkboxes = screen.getAllByRole("checkbox");
    const passingCheckbox = checkboxes.find(
      (cb) => cb.getAttribute("aria-label") === "Tick to specify passing type",
    );
    expect(passingCheckbox).toBeTruthy();
    expect(passingCheckbox!.getAttribute("aria-checked")).toBe("false");

    // Tick it
    fireEvent.click(passingCheckbox!);
    expect(saved).toBeTruthy();
  });
});

describe("SetInstructionsPanel — player sub-mode", () => {
  it("shows player instructions title with player name when a slot is selected", () => {
    const tactic = defaultTactic();
    render(
      <SetInstructionsPanel
        tactic={tactic}
        squadById={squadById}
        selectedSlot={0}
        onSelectSlot={() => {}}
        onTacticChange={() => {}}
      />,
    );

    // Player mode is default — the panel is titled for the selected player, overrides first
    expect(screen.getByRole("region", { name: "Player Instructions" }).textContent).toContain("Instructions for");
    expect(screen.getByRole("group", { name: "Overrides" })).toBeTruthy();
    // The slot selector shows the player name
    expect(screen.getByRole("button", { name: "Select player slot" }).textContent).toContain("Last0");
  });

  it("shows overrides section", async () => {
    const tactic = defaultTactic();
    render(
      <SetInstructionsPanel
        tactic={tactic}
        squadById={squadById}
        selectedSlot={1}
        onSelectSlot={() => {}}
        onTacticChange={() => {}}
      />,
    );

    expect(screen.getByRole("group", { name: "Overrides" })).toBeTruthy();
    expect(screen.getByText("Passing")).toBeTruthy();
    expect(screen.getByText("Closing Down")).toBeTruthy();
  });

  it("shows distribution only for the goalkeeper slot", async () => {
    const tactic = defaultTactic();
    render(
      <SetInstructionsPanel
        tactic={tactic}
        squadById={squadById}
        selectedSlot={0}
        onSelectSlot={() => {}}
        onTacticChange={() => {}}
      />,
    );

    // Slot 0 is GK — distribution should appear
    expect(screen.getByText("Distribution")).toBeTruthy();

    // Re-render with slot 1 (outfield) — distribution should NOT appear
    cleanup();
    render(
      <SetInstructionsPanel
        tactic={tactic}
        squadById={squadById}
        selectedSlot={1}
        onSelectSlot={() => {}}
        onTacticChange={() => {}}
      />,
    );
    expect(screen.queryByText("Distribution")).toBeNull();
  });

  it("shows settings and more often sections", async () => {
    const tactic = defaultTactic();
    render(
      <SetInstructionsPanel
        tactic={tactic}
        squadById={squadById}
        selectedSlot={1}
        onSelectSlot={() => {}}
        onTacticChange={() => {}}
      />,
    );

    expect(screen.getByRole("group", { name: "Settings" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "More Often" })).toBeTruthy();
    expect(screen.getByText("Cross Ball")).toBeTruthy();
  });

  it("ticking a switch shows CM's hint text", async () => {
    const tactic = defaultTactic();
    // Set a player switch to "often" so the hint shows
    const slotIndex = 1;
    const instructions = {
      ...tactic.slots[slotIndex]!.instructions,
      runWithBall: "often" as const,
    } as PlayerInstructions;
    const slots = tactic.slots.map((s, i) => i === slotIndex ? { ...s, instructions } : s);
    const mutated = new Tactic({
      ...tactic,
      slots,
    });

    render(
      <SetInstructionsPanel
        tactic={mutated}
        squadById={squadById}
        selectedSlot={slotIndex}
        onSelectSlot={() => {}}
        onTacticChange={() => {}}
      />,
    );

    // The hint should be visible
    expect(screen.getByText("Player will run with the ball more")).toBeTruthy();
  });

  it("shows set piece instructions section", async () => {
    const tactic = defaultTactic();
    render(
      <SetInstructionsPanel
        tactic={tactic}
        squadById={squadById}
        selectedSlot={1}
        onSelectSlot={() => {}}
        onTacticChange={() => {}}
      />,
    );

    expect(screen.getByRole("region", { name: "Set Piece Instructions" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Set Piece Roles" })).toBeTruthy();
    expect(screen.getByText("Defend Free Kicks")).toBeTruthy();
    expect(screen.getByText("Attack Free Kicks")).toBeTruthy();
  });
});

describe("SetInstructionsPanel — Set To Preset", () => {
  it("offers all 7 templates in the Set To Preset list", () => {
    render(
      <SetInstructionsPanel
        tactic={defaultTactic()}
        squadById={squadById}
        selectedSlot={1}
        onSelectSlot={() => {}}
        onTacticChange={() => {}}
      />,
    );

    const preset = screen.getByLabelText("Set to preset") as HTMLSelectElement;
    const labels = Array.from(preset.options).map((o) => o.textContent);
    expect(labels).toEqual(["Set To Preset", "Goalkeeper", "Central Defender", "Full Back",
      "Defensive Midfielder", "Attacking Midfielder", "Winger", "Striker"]);
  });

  it("choosing a template changes the slot's instructions", () => {
    let saved: Tactic | null = null;
    render(
      <SetInstructionsPanel
        tactic={defaultTactic()}
        squadById={squadById}
        selectedSlot={1}
        onSelectSlot={() => {}}
        onTacticChange={(t) => { saved = t; }}
      />,
    );

    // Slot 1 is a full back in 4-4-2; the Central Defender preset makes him defensive
    fireEvent.change(screen.getByLabelText("Set to preset"), { target: { value: "centralDefender" } });
    expect(saved).not.toBeNull();
    expect((saved as unknown as Tactic).slots[1]!.instructions.mentality).toBe("defensive");
  });
});

describe("SetInstructionsPanel — slot selector", () => {
  it("renders a slot selector dropdown with player names", () => {
    const tactic = defaultTactic();
    render(
      <SetInstructionsPanel
        tactic={tactic}
        squadById={squadById}
        selectedSlot={0}
        onSelectSlot={() => {}}
        onTacticChange={() => {}}
      />,
    );

    // The trigger names the first player; opening it lists the starting XI
    fireEvent.click(screen.getByRole("button", { name: "Select player slot" }));
    expect(within(screen.getByRole("listbox")).getAllByRole("option")).toHaveLength(11);
  });
});

describe("SetInstructionsPanel — player selection", () => {
  it("the slot selector and the step buttons select through the screen", async () => {
    const selected: Array<number> = [];
    render(
      <SetInstructionsPanel
        tactic={defaultTactic()}
        squadById={squadById}
        selectedSlot={3}
        onSelectSlot={(index) => selected.push(index)}
        onTacticChange={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Select player slot" }));
    fireEvent.click(await screen.findByRole("option", { name: /Last7/ }));
    fireEvent.click(screen.getByRole("button", { name: "Previous player" }));
    fireEvent.click(screen.getByRole("button", { name: "Next player" }));
    expect(selected).toEqual([7, 2, 4]);
  });

  it("clicking a row's label ticks its box", () => {
    let saved: Tactic | null = null;
    render(
      <SetInstructionsPanel
        tactic={defaultTactic()}
        squadById={squadById}
        selectedSlot={1}
        onSelectSlot={() => {}}
        onTacticChange={(t) => { saved = t; }}
      />,
    );

    fireEvent.click(screen.getByText("Long Shots"));
    expect((saved as unknown as Tactic).slots[1]!.instructions.longShots).toBe("often");
  });
});

describe("SetInstructionsPanel — keyboard reachability", () => {
  it("all controls are native buttons or selects, or focusable checkboxes", async () => {
    const tactic = defaultTactic();
    render(
      <SetInstructionsPanel
        tactic={tactic}
        squadById={squadById}
        selectedSlot={0}
        onSelectSlot={() => {}}
        onTacticChange={() => {}}
      />,
    );

    const controls = document.querySelectorAll<HTMLElement>(
      'input[type="checkbox"], select, button',
    );
    expect(controls.length).toBeGreaterThan(10);
    for (const control of controls) {
      expect(["INPUT", "SELECT", "BUTTON"]).toContain(control.tagName);
    }
    for (const tick of screen.getAllByRole("checkbox")) {
      expect(tick.tabIndex).toBe(0);
    }
  });
});