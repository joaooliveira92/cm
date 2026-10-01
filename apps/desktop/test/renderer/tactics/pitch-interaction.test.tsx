import { cleanup, createEvent, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SaveId, PlayerId, Tactic } from "@cm-clone/contracts";
import {
  OUTFIELD_ATTRIBUTES,
  STATURE_TIERS,
  builtInTemplate,
  tacticFromTemplate,
} from "@cm-clone/shared";
import { TacticsScreen } from "../../../src/renderer/tactics/TacticsScreen.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { ScreenToolbarSlot } from "../../../src/renderer/chrome/ScreenToolbarSlot.js";

const rid = (id: string) => SaveId.make(id);
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

const tacticsView = () => ({
  club: { id: rid("me"), name: "My Club", statureTier: STATURE_TIERS[0] },
  squad: SQUAD,
  tactic: new Tactic(baseTactic),
  revision: 0,
});

const mountTactics = async (): Promise<void> => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string) =>
      method === "getTactics"
        ? { _tag: "Success", value: tacticsView() }
        : { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: rid("s1") } },
  };
  render(
    <RegistryProvider>
      <ScreenToolbarSlot />
      <TacticsScreen saveId={rid("s1")} />
    </RegistryProvider>,
  );
  await screen.findByRole("list", { name: "4-4-2 on the pitch" });
};

/** The text showing the formation name and (modified) status, now in the menu bar area. */
const formationLabel = (): HTMLElement =>
  document.querySelector('.ml-auto') as HTMLElement;

const marker = (slot: number): HTMLElement =>
  document.querySelector<HTMLElement>(`button[data-slot-index="${slot - 1}"]`)!;

const dataTransfer = () => {
  const store = new Map<string, string>();
  return {
    effectAllowed: "all",
    setData: (type: string, value: string) => store.set(type, value),
    getData: (type: string) => store.get(type) ?? "",
  };
};

/** The pitch's teamsheet row for the given slot. */
const teamSelectionRow = (slot: number): HTMLElement =>
  document.querySelector<HTMLElement>(`tr[data-player-id]`)!;

beforeEach(() => cleanup());
afterEach(() => cleanup());

describe("the formation pitch interaction model (drag-and-drop kept, click-to-select added)", () => {
  it("clicking a marker selects that slot and highlights it on the pitch", async () => {
    await mountTactics();
    const slot4Marker = marker(4);
    expect(slot4Marker.closest("li")!.dataset.selected).toBeUndefined();

    fireEvent.click(slot4Marker);

    await waitFor(() =>
      expect(slot4Marker.closest("li")!.dataset.selected).toBe("true"),
    );
  });

  it("dropping one marker on another's disc swaps the two slots' players", async () => {
    await mountTactics();
    expect(marker(10).getAttribute("aria-label")).toContain("First9 Last9");
    expect(marker(1).getAttribute("aria-label")).toContain("First0 Last0");

    const transfer = dataTransfer();
    fireEvent.dragStart(marker(10), { dataTransfer: transfer });
    dragAt("dragOver", pitch(), 50, 87, transfer);
    expect(screen.queryByTestId("pitch-drop-zone")).toBeNull();
    dragAt("drop", pitch(), 50, 87, transfer);

    await waitFor(() => expect(marker(1).getAttribute("aria-label")).toContain("First9 Last9"));
    expect(marker(10).getAttribute("aria-label")).toContain("First0 Last0");
  });

  it("markers stay out of the tab order, where the pitch itself is tabbable", async () => {
    await mountTactics();
    const markers = document.querySelectorAll<HTMLElement>('[data-action-id="swap-slot-players"]');
    expect(markers).toHaveLength(11);
    for (const each of markers) expect(each.tabIndex).toBe(-1);
    // The pitch container is the tabbable element
    const pitchContainer = screen.getByTestId("formation-pitch");
    expect(pitchContainer.tabIndex).toBe(0);
  });
});

const pitch = (): HTMLElement => {
  const element = screen.getByTestId("formation-pitch");
  element.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 440, height: 640, right: 440, bottom: 640, x: 0, y: 0 }) as DOMRect;
  return element;
};

const dragAt = (
  type: "dragOver" | "drop",
  element: HTMLElement,
  x: number,
  y: number,
  transfer: ReturnType<typeof dataTransfer>,
) => {
  const event = createEvent[type](element, { dataTransfer: transfer });
  Object.defineProperties(event, { clientX: { value: x * 4.4 }, clientY: { value: y * 6.4 } });
  fireEvent(element, event);
};

describe("the formation pitch reshapes the formation", () => {
  it("dropping a midfielder on the back line moves the slot to DC and marks the shape modified", async () => {
    await mountTactics();
    const originalText = formationLabel().textContent;
    expect(originalText).not.toContain("(modified)");
    const transfer = dataTransfer();
    fireEvent.dragStart(marker(6), { dataTransfer: transfer });
    const grass = pitch();
    dragAt("dragOver", grass, 50, 74, transfer);
    expect(marker(6).closest("li")!.dataset.landing).toBe("true");
    dragAt("drop", grass, 50, 74, transfer);

    await waitFor(() => expect(formationLabel().textContent).toContain("(modified)"));
  });

  it("a flank third of a line takes that flank's cell — F RC dropped on free the AM R cell", async () => {
    await mountTactics();
    const transfer = dataTransfer();
    fireEvent.dragStart(marker(10), { dataTransfer: transfer });
    // AM R is at (89, 27) — free cell on the right flank for the F RC slot.
    dragAt("drop", pitch(), 89, 27, transfer);
    await waitFor(() => expect(formationLabel().textContent).toContain("(modified)"));
  });

  it("the keeper never moves, and no outfield slot moves into the keeper's end", async () => {
    await mountTactics();
    const keeper = dataTransfer();
    fireEvent.dragStart(marker(1), { dataTransfer: keeper });
    dragAt("drop", pitch(), 50, 42, keeper);
    const striker = dataTransfer();
    fireEvent.dragStart(marker(10), { dataTransfer: striker });
    dragAt("drop", pitch(), 20, 92, striker);

    expect(marker(1).getAttribute("aria-label")).toContain("GK:");
    expect(formationLabel().textContent).not.toContain("(modified)");
  });

  it("dragging over the slot's own zone previews no landing, since it would not move", async () => {
    await mountTactics();
    const transfer = dataTransfer();
    // Slot index 5 (M R) is at (89, 41) in percent coordinates. Dragging over its own
    // position should produce no landing preview.
    fireEvent.dragStart(marker(6), { dataTransfer: transfer });
    dragAt("dragOver", pitch(), 89, 41, transfer);
    expect(marker(6).closest("li")!.dataset.landing).toBeUndefined();
  });
});