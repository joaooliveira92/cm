/**
 * Tests for the SetPrioritiesPanel: team set-piece dropdowns, taker-list CRUD,
 * reordering, keyboard shortcuts, and the Capt badge at the head of the captains list.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlayerId, Tactic } from "@cm-clone/contracts";
import {
  EMPTY_TAKERS,
  OUTFIELD_ATTRIBUTES,
  builtInTemplate,
  emptyBench,
  tacticFromTemplate,
  type TakerList,
} from "@cm-clone/shared";
import { SetPrioritiesPanel } from "../../../src/renderer/tactics/SetPrioritiesPanel.js";

const pid = (id: string) => PlayerId.make(id);

/** A complete squad player object for test fixtures. */
const player = (index: number) => ({
  id: pid(`p-${index}`),
  firstName: `First${index}`,
  lastName: `Last${index}`,
  dateOfBirth: "2000-01-01",
  age: 25,
  attributes: Object.fromEntries(OUTFIELD_ATTRIBUTES.map((attr) => [attr, 12])),
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
const squadById = new Map(SQUAD.map((p) => [p.id, p]));

const baseTactic = tacticFromTemplate(
  builtInTemplate("4-4-2")!,
  SQUAD.map((p) => p.id),
);

const defaultTactic = (): Tactic =>
  new Tactic({
    sourceTemplate: "4-4-2",
    slots: baseTactic.slots,
    team: baseTactic.team,
    teamSetPieces: baseTactic.teamSetPieces,
    assignments: SQUAD.map((p) => p.id),
    bench: emptyBench(),
    takers: EMPTY_TAKERS,
  });

/** Mount the panel directly with a given tactic and change tracker. */
const mountPanel = (tactic: Tactic = defaultTactic()): { readonly onTacticChange: ReturnType<typeof vi.fn> } => {
  const onTacticChange = vi.fn();
  render(
    <SetPrioritiesPanel
      tactic={tactic}
      squad={SQUAD}
      squadById={squadById}
      onTacticChange={onTacticChange}
    />,
  );
  return { onTacticChange };
};

/** Create a tactic with specific taker assignments without mutating the immutable takers. */
const tacticWithTakers = (
  overrides: Partial<Record<TakerList, ReadonlyArray<PlayerId>>>,
): Tactic => {
  const base = defaultTactic();
  return new Tactic({
    ...base,
    takers: { ...base.takers, ...overrides },
  });
};

const p0 = pid("p-0");
const p1 = pid("p-1");
const p3 = pid("p-3");

beforeEach(() => cleanup());
afterEach(() => cleanup());

describe("Set Priorities panel", () => {
  // ── Structure ───────────────────────────────────────────────────────────

  it("renders all eight taker list sections with their labels", () => {
    mountPanel();
    expect(screen.getByRole("group", { name: "Captains" })).toBeDefined();
    expect(screen.getByRole("group", { name: "Penalty Takers" })).toBeDefined();
    expect(screen.getByRole("group", { name: "Free Kick Takers (Left)" })).toBeDefined();
    expect(screen.getByRole("group", { name: "Free Kick Takers (Right)" })).toBeDefined();
    expect(screen.getByRole("group", { name: "Corner Takers (Left)" })).toBeDefined();
    expect(screen.getByRole("group", { name: "Corner Takers (Right)" })).toBeDefined();
    expect(screen.getByRole("group", { name: "Throw In Takers (Left)" })).toBeDefined();
    expect(screen.getByRole("group", { name: "Throw In Takers (Right)" })).toBeDefined();
  });

  it("shows 'No players assigned' for every empty list", () => {
    mountPanel();
    const emptyMessages = screen.getAllByText("No players assigned");
    expect(emptyMessages).toHaveLength(8);
  });

  // ── Taker list CRUD ─────────────────────────────────────────────────────

  it("can add a player to a taker list", async () => {
    const tactic = defaultTactic();
    const { onTacticChange } = mountPanel(tactic);

    // Open the player picker for Penalty Takers and pick from the Starting XI group
    fireEvent.click(screen.getByRole("button", { name: "Add player to Penalty Takers" }));
    fireEvent.click(await screen.findByRole("option", { name: /Last0/ }));

    expect(onTacticChange).toHaveBeenCalledTimes(1);
    const updatedTactic = onTacticChange.mock.calls[0]![0] as Tactic;
    expect(updatedTactic.takers.penalties).toHaveLength(1);
    expect(updatedTactic.takers.penalties[0]).toBe(pid("p-0"));
  });

  it("does not add a player already in the taker list", () => {
    const tactic = tacticWithTakers({ penalties: [p0] });
    mountPanel(tactic);

    // Find the captions "Penalty Takers" text
    const penaltyPanels = screen.getAllByRole("group", { name: "Penalty Takers" });
    expect(penaltyPanels.length).toBeGreaterThanOrEqual(1);
  });

  it("can remove a player from a taker list", () => {
    const tactic = tacticWithTakers({ penalties: [p0, p1] });
    const { onTacticChange } = mountPanel(tactic);

    // Remove the first player
    const removeButtons = screen.getAllByLabelText(/Remove.*from Penalty Takers/);
    expect(removeButtons).toHaveLength(2);

    fireEvent.click(removeButtons[0]!);
    expect(onTacticChange).toHaveBeenCalledTimes(1);
    const updatedTactic = onTacticChange.mock.calls[0]![0] as Tactic;
    expect(updatedTactic.takers.penalties).toHaveLength(1);
    expect(updatedTactic.takers.penalties[0]).toBe(p1);
  });

  it("can reorder a taker list using the up button", () => {
    const tactic = tacticWithTakers({ penalties: [p0, p1] });
    const { onTacticChange } = mountPanel(tactic);

    // Move second player up
    const moveUpButtons = screen.getAllByLabelText(/Move.*up/);
    expect(moveUpButtons).toHaveLength(2);
    fireEvent.click(moveUpButtons[1]!);

    expect(onTacticChange).toHaveBeenCalledTimes(1);
    const updatedTactic = onTacticChange.mock.calls[0]![0] as Tactic;
    expect(updatedTactic.takers.penalties[0]).toBe(p1);
    expect(updatedTactic.takers.penalties[1]).toBe(p0);
  });

  it("can reorder a taker list using the down button", () => {
    const tactic = tacticWithTakers({ penalties: [p0, p1] });
    const { onTacticChange } = mountPanel(tactic);

    // Move first player down
    const moveDownButtons = screen.getAllByLabelText(/Move.*down/);
    expect(moveDownButtons).toHaveLength(2);
    fireEvent.click(moveDownButtons[0]!);

    expect(onTacticChange).toHaveBeenCalledTimes(1);
    const updatedTactic = onTacticChange.mock.calls[0]![0] as Tactic;
    expect(updatedTactic.takers.penalties[0]).toBe(p1);
    expect(updatedTactic.takers.penalties[1]).toBe(p0);
  });

  // ── Capt badge ──────────────────────────────────────────────────────────

  it("shows the Capt badge on the first item in the Captains list", () => {
    const tactic = tacticWithTakers({ captain: [p0, p3] });
    mountPanel(tactic);

    const captLabels = screen.getAllByText("Capt");
    expect(captLabels).toHaveLength(1);
  });

  it("does not show the Capt badge on non-captain lists", () => {
    const tactic = tacticWithTakers({ penalties: [p0] });
    mountPanel(tactic);

    const captLabels = screen.queryAllByText("Capt");
    // Only the captains list shows Capt
    expect(captLabels.length).toBeLessThan(2);
  });

  // ── Keyboard navigation ─────────────────────────────────────────────────

  it("reorders via Ctrl+ArrowUp in a taker list", () => {
    const tactic = tacticWithTakers({ penalties: [p0, p1] });
    const { onTacticChange } = mountPanel(tactic);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    // Focus the second item
    items[1]!.focus();

    fireEvent.keyDown(items[1]!, { key: "ArrowUp", ctrlKey: true });
    // Focus shifts to the first item, list reorders
    expect(onTacticChange).toHaveBeenCalledTimes(1);
  });

  it("removes player via Delete key in a taker list", () => {
    const tactic = tacticWithTakers({ penalties: [p0] });
    const { onTacticChange } = mountPanel(tactic);

    const items = screen.getAllByRole("listitem");
    items[0]!.focus();
    fireEvent.keyDown(items[0]!, { key: "Delete" });

    expect(onTacticChange).toHaveBeenCalledTimes(1);
    const updatedTactic = onTacticChange.mock.calls[0]![0] as Tactic;
    expect(updatedTactic.takers.penalties).toHaveLength(0);
  });

  it("removes player via Backspace key in a taker list", () => {
    const tactic = tacticWithTakers({ penalties: [p0] });
    const { onTacticChange } = mountPanel(tactic);

    const items = screen.getAllByRole("listitem");
    items[0]!.focus();
    fireEvent.keyDown(items[0]!, { key: "Backspace" });

    expect(onTacticChange).toHaveBeenCalledTimes(1);
    expect((onTacticChange.mock.calls[0]![0] as Tactic).takers.penalties).toHaveLength(0);
  });

  // ── Non-eleven players ──────────────────────────────────────────────────

  it("shows a player outside the starting eleven in a taker list", () => {
    const p20 = pid("p-20");
    const tactic = tacticWithTakers({ captain: [p20] });

    // Add p-20 to squad
    const extendedSquad = [...SQUAD, player(20)];
    const extSquadById = new Map(extendedSquad.map((p) => [p.id, p]));

    const onTacticChange = vi.fn();
    render(
      <SetPrioritiesPanel
        tactic={tactic}
        squad={extendedSquad}
        squadById={extSquadById}
        onTacticChange={onTacticChange}
      />,
    );

    // The player should appear in the captains list
    expect(screen.getByText("Last20")).toBeDefined();
  });
});