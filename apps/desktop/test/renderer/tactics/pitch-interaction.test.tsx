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

const mountTactics = async (view: ReturnType<typeof tacticsView> = tacticsView()): Promise<void> => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string) =>
      method === "getTactics"
        ? { _tag: "Success", value: view }
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

/** The text showing the formation name and (modified) status, in the menu bar. */
const formationLabel = (): HTMLElement =>
  screen.getByTestId("tactic-template-label");

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

  it("a dragged marker names the cell it would land in, so a row's boundary shows before the drop", async () => {
    await mountTactics();
    const transfer = dataTransfer();
    fireEvent.dragStart(marker(6), { dataTransfer: transfer });
    dragAt("dragOver", pitch(), 50, 63, transfer);
    expect(marker(6).closest("li")!.textContent).toContain("DM C");
    dragAt("dragOver", pitch(), 50, 80, transfer);
    expect(marker(6).closest("li")!.textContent).toContain("SW C");
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
/** The marker's disc centre on the pitch, in percent, read back from its inline position. */
const drawnAt = (slot: number): { readonly x: number; readonly y: number } => {
  const li = marker(slot).closest("li")!;
  return { x: Number.parseFloat(li.style.left), y: Number.parseFloat(li.style.top.replace("calc(", "")) };
};

describe("a dragged marker stops where it is released", () => {
  it("a nudge within its own cell lands on the release point", async () => {
    await mountTactics();
    const transfer = dataTransfer();
    // Slot 6 (M R) stands at (89, 41); (84, 45) is still the M R cell.
    fireEvent.dragStart(marker(6), { dataTransfer: transfer });
    dragAt("dragOver", pitch(), 84, 45, transfer);
    expect(marker(6).closest("li")!.dataset.landing).toBe("true");
    dragAt("drop", pitch(), 84, 45, transfer);

    await waitFor(() => expect(drawnAt(6).x).toBeCloseTo(84, 1));
    expect(drawnAt(6).y).toBeCloseTo(45, 1);
  });

  it("the landing preview follows the pointer within a cell, not just across cells", async () => {
    await mountTactics();
    const transfer = dataTransfer();
    fireEvent.dragStart(marker(6), { dataTransfer: transfer });
    dragAt("dragOver", pitch(), 50, 70, transfer);
    expect(drawnAt(6).x).toBeCloseTo(50, 1);
    dragAt("dragOver", pitch(), 54, 72, transfer);
    expect(drawnAt(6).x).toBeCloseTo(54, 1);
    expect(drawnAt(6).y).toBeCloseTo(72, 1);
  });

  it("a marker grabbed by its caption lands with its disc where the disc was drawn, not under the pointer", async () => {
    await mountTactics();
    const transfer = dataTransfer();
    const disc = marker(6).querySelector<HTMLElement>("[data-disc]")!;
    // The disc is 28px wide at (89%, 41%) of a 440 × 640 pitch; the pointer holds the caption 24px below.
    disc.getBoundingClientRect = () =>
      ({ left: 391.6 - 14, top: 262.4 - 14, width: 28, height: 28 }) as DOMRect;
    const start = createEvent.dragStart(marker(6), { dataTransfer: transfer });
    Object.defineProperties(start, { clientX: { value: 391.6 }, clientY: { value: 262.4 + 24 } });
    fireEvent(marker(6), start);
    dragAt("drop", pitch(), 84, 45 + 24 / 6.4, transfer);

    await waitFor(() => expect(drawnAt(6).y).toBeCloseTo(45, 1));
    expect(drawnAt(6).x).toBeCloseTo(84, 1);
  });

  it("dropping on grass in a cell another slot holds swaps with that slot, never doubling up the cell", async () => {
    await mountTactics();
    const transfer = dataTransfer();
    // (80, 46) is in the M R cell, but over 20px from slot 6's disc at (89, 41).
    fireEvent.dragStart(marker(10), { dataTransfer: transfer });
    dragAt("drop", pitch(), 80, 46, transfer);

    await waitFor(() => expect(marker(6).getAttribute("aria-label")).toContain("First9 Last9"));
    expect(marker(10).getAttribute("aria-label")).toContain("First5 Last5");
    expect(formationLabel().textContent).not.toContain("(modified)");
  });
});

describe("the pitch moves a selected marker from the keyboard", () => {
  const key = (init: { key: string; shiftKey?: boolean; altKey?: boolean }) =>
    fireEvent.keyDown(screen.getByTestId("formation-pitch"), init);

  it("an arrow with nothing selected picks the first slot", async () => {
    await mountTactics();
    key({ key: "ArrowRight" });
    await waitFor(() => expect(marker(1).closest("li")!.dataset.selected).toBe("true"));
  });

  it("Shift+Up moves the selected slot one line forward into a free cell", async () => {
    await mountTactics();
    fireEvent.click(marker(6));
    key({ key: "ArrowUp", shiftKey: true });
    await waitFor(() => expect(marker(6).getAttribute("aria-label")).toContain("AM R:"));
    expect(formationLabel().textContent).toContain("(modified)");
  });

  it("Shift+arrow into a cell another slot holds swaps the two players", async () => {
    await mountTactics();
    fireEvent.click(marker(6));
    // M R's left neighbour, M RC, is held in a 4-4-2.
    const neighbour = [...document.querySelectorAll<HTMLElement>("button[data-slot-index]")].find((each) =>
      each.getAttribute("aria-label")!.includes("M RC:"),
    )!;
    key({ key: "ArrowLeft", shiftKey: true });
    await waitFor(() => expect(neighbour.getAttribute("aria-label")).toContain("First5 Last5"));
    expect(formationLabel().textContent).not.toContain("(modified)");
  });

  it("Alt+arrow nudges the selected slot within its cell, stopping at the cell's edge", async () => {
    await mountTactics();
    fireEvent.click(marker(6));
    key({ key: "ArrowLeft", altKey: true });
    await waitFor(() => expect(drawnAt(6).x).toBeLessThan(89));
    for (let press = 0; press < 10; press++) key({ key: "ArrowLeft", altKey: true });
    await waitFor(() => expect(drawnAt(6).x).toBeCloseTo(79.5, 1));
    expect(marker(6).getAttribute("aria-label")).toContain("M R:");
  });
});

describe("Team Selection fills the eleven", () => {
  /** Thirteen players: slots 3 and 7 name nobody, p-11 waits on the bench and p-12 in the reserves. */
  const gappyView = () => {
    const squad = Array.from({ length: 13 }, (_, index) => player(index));
    const assignments = squad.slice(0, 11).map((p, index) => (index === 3 || index === 7 ? pid("") : p.id));
    const bench = [pid("p-11"), null, null, null, null, null, null];
    return { ...tacticsView(), squad, tactic: new Tactic(tacticFromTemplate(builtInTemplate("4-4-2")!, assignments, bench)) };
  };
  const grid = () => screen.getByRole("grid", { name: "Team Selection" });
  const rowOf = (id: string) => grid().querySelector<HTMLElement>(`tr[data-player-id="${id}"]`)!;
  const starterRow = (slot: number) => grid().querySelectorAll<HTMLElement>("tbody tr")[slot]!;

  it("a reserve clicked into an empty slot fills it, and the selection moves to the next empty slot", async () => {
    await mountTactics(gappyView());
    fireEvent.click(starterRow(3));
    fireEvent.click(rowOf("p-12"));
    await waitFor(() => expect(marker(4).getAttribute("aria-label")).toContain("First12 Last12"));
    expect(marker(8).closest("li")!.dataset.selected).toBe("true");
  });

  it("a bench player comes into an empty slot, by keyboard as well as by click", async () => {
    await mountTactics(gappyView());
    fireEvent.click(starterRow(7));
    fireEvent.keyDown(rowOf("p-11"), { key: "Enter" });
    await waitFor(() => expect(marker(8).getAttribute("aria-label")).toContain("First11 Last11"));
    expect(marker(4).closest("li")!.dataset.selected).toBe("true");
  });

  it("a reserve replacing a starter keeps the selection on that slot", async () => {
    await mountTactics(gappyView());
    fireEvent.click(starterRow(1));
    fireEvent.click(rowOf("p-12"));
    await waitFor(() => expect(marker(2).getAttribute("aria-label")).toContain("First12 Last12"));
    expect(marker(2).closest("li")!.dataset.selected).toBe("true");
  });
});

describe("the right mouse button aims the selected slot's run", () => {
  const mouseAt = (type: "mouseDown" | "mouseMove" | "mouseUp", x: number, y: number) =>
    fireEvent[type](pitch(), { button: 2, clientX: x * 4.4, clientY: y * 6.4 });

  it("pressing previews an arrow that follows the pointer, and releasing sets the run there", async () => {
    await mountTactics();
    fireEvent.click(marker(6));
    mouseAt("mouseDown", 89, 41);
    mouseAt("mouseMove", 89, 13);
    expect(document.querySelector('[data-run-arrow="preview"]')).not.toBeNull();
    mouseAt("mouseUp", 89, 13);
    await waitFor(() => expect(marker(6).getAttribute("aria-label")).toContain("runs to F R"));
    expect(document.querySelector('[data-run-arrow="preview"]')).toBeNull();
    expect(document.querySelector('[data-run-arrow="set"]')).not.toBeNull();
  });

  it("releasing on the slot's own cell clears its run, and nothing selected aims nothing", async () => {
    await mountTactics();
    mouseAt("mouseDown", 89, 13);
    expect(document.querySelector('[data-run-arrow="preview"]')).toBeNull();
    fireEvent.click(marker(6));
    mouseAt("mouseDown", 89, 41);
    mouseAt("mouseUp", 89, 13);
    await waitFor(() => expect(marker(6).getAttribute("aria-label")).toContain("runs to F R"));
    mouseAt("mouseDown", 89, 13);
    mouseAt("mouseUp", 89, 41);
    await waitFor(() => expect(marker(6).getAttribute("aria-label")).not.toContain("runs to"));
  });
});
