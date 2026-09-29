import { cleanup, createEvent, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SaveId } from "@cm-clone/contracts";
import {
  FORMATION_SLOTS,
  OUTFIELD_ATTRIBUTES,
  POSITION_ROLES,
  STATURE_TIERS,
  emptyBench,
} from "@cm-clone/shared";
import { TacticsScreen } from "../../../src/renderer/tactics/TacticsScreen.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { ScreenToolbarSlot } from "../../../src/renderer/chrome/ScreenToolbarSlot.js";

const rid = (id: string) => SaveId.make(id);

const player = (index: number) => ({
  id: rid(`p-${index}`),
  firstName: `First${index}`,
  lastName: `Last${index}`,
  dateOfBirth: "2000-01-01",
  age: 25,
  attributes: Object.fromEntries(OUTFIELD_ATTRIBUTES.map((attribute) => [attribute, 12])),
  positions: [],
  overallRating: 50,
  positionRatings: {},
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

const tacticsView = () => ({
  club: { id: rid("me"), name: "My Club", statureTier: STATURE_TIERS[0] },
  squad: SQUAD,
  tactic: {
    formation: "4-4-2" as const,
    slots: FORMATION_SLOTS["4-4-2"].map((position, index) => ({
      position,
      role: POSITION_ROLES[position],
      playerId: rid(`p-${index}`),
    })),
    bench: emptyBench(),
    mentality: "balanced" as const,
    tempo: "normal" as const,
    pressing: "medium" as const,
  },
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

/** The Formation trigger in the toolbar names the Formation, with "(custom)" once reshaped. */
const formationTrigger = (): HTMLElement => screen.getByRole("button", { name: "Formation" });

const marker = (slot: number): HTMLElement =>
  document.querySelector<HTMLElement>(`button[data-slot-index="${slot - 1}"]`)!;

/** A drag's data store: jsdom hands drop handlers no DataTransfer of its own. */
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

describe("the formation pitch is a pointer shortcut onto the slot pickers", () => {
  it("clicking a marker opens that slot's picker", async () => {
    await mountTactics();
    const trigger = screen.getByRole("combobox", { name: "Slot 4 player" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(marker(4));

    await waitFor(() => expect(trigger.getAttribute("aria-expanded")).toBe("true"));
    expect(await screen.findByRole("listbox")).toBeTruthy();
  });

  it("dropping one marker on another's disc swaps the two slots' players", async () => {
    await mountTactics();
    expect(marker(10).getAttribute("aria-label")).toContain("First9 Last9");
    expect(marker(1).getAttribute("aria-label")).toContain("First0 Last0");

    // The GK's disc sits at (50%, 87%).
    const transfer = dataTransfer();
    fireEvent.dragStart(marker(10), { dataTransfer: transfer });
    dragAt("dragOver", pitch(), 50, 87, transfer);
    expect(screen.queryByTestId("pitch-drop-zone")).toBeNull();
    dragAt("drop", pitch(), 50, 87, transfer);

    await waitFor(() => expect(marker(1).getAttribute("aria-label")).toContain("First9 Last9"));
    expect(marker(10).getAttribute("aria-label")).toContain("First0 Last0");
    expect(screen.getByRole("combobox", { name: "Slot 1 player" }).textContent).toContain(
      "First9 Last9",
    );
  });

  it("markers stay out of the tab order, where the pickers stand for each slot", async () => {
    await mountTactics();
    const markers = document.querySelectorAll<HTMLElement>('[data-action-id="swap-slot-players"]');
    expect(markers).toHaveLength(11);
    for (const each of markers) expect(each.tabIndex).toBe(-1);
  });
});

/** The pitch at its full on-screen size, 440 × 640, since a marker's reach is measured in pixels. */
const pitch = (): HTMLElement => {
  const element = screen.getByTestId("formation-pitch");
  element.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 440, height: 640, right: 440, bottom: 640, x: 0, y: 0 }) as DOMRect;
  return element;
};

/** A drag event at a point given in percent of the pitch: jsdom has no DragEvent, so the
 *  coordinates are set by hand. */
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

const positionPicker = (slot: number): HTMLElement =>
  screen.getByRole("combobox", { name: `Slot ${slot} position` });

describe("the formation pitch reshapes the formation", () => {
  it("dropping a midfielder on the back line moves the slot to DC and marks the shape custom", async () => {
    await mountTactics();
    expect(formationTrigger().textContent).not.toContain("(custom)");
    // Slot 6 is the 4-4-2 template's first MC.
    const transfer = dataTransfer();
    fireEvent.dragStart(marker(6), { dataTransfer: transfer });
    const grass = pitch();
    dragAt("dragOver", grass, 50, 74, transfer);
    // The zone under the pointer names the Position, and the dragged marker is drawn where it
    // will land, in a back line that has made room for it.
    expect(screen.getByTestId("pitch-drop-zone").textContent).toBe("DC");
    expect(marker(6).closest("li")!.dataset.landing).toBe("true");
    dragAt("drop", grass, 50, 74, transfer);
    expect(screen.queryByTestId("pitch-drop-zone")).toBeNull();

    await waitFor(() => expect(positionPicker(6).textContent).toContain("DC"));
    expect(marker(6).getAttribute("aria-label")).toContain("DC: First5 Last5");
    expect(formationTrigger().textContent).toBe("Formation: 4-4-2 (custom)");
  });

  it("a flank third of a line takes that flank's Position", async () => {
    await mountTactics();
    const transfer = dataTransfer();
    fireEvent.dragStart(marker(10), { dataTransfer: transfer });
    dragAt("drop", pitch(), 10, 42, transfer);
    await waitFor(() => expect(positionPicker(10).textContent).toContain("ML"));
  });

  it("the keeper never moves, and no outfield slot moves into the keeper's end", async () => {
    await mountTactics();
    const keeper = dataTransfer();
    fireEvent.dragStart(marker(1), { dataTransfer: keeper });
    dragAt("drop", pitch(), 50, 42, keeper);
    const striker = dataTransfer();
    fireEvent.dragStart(marker(10), { dataTransfer: striker });
    dragAt("drop", pitch(), 20, 92, striker);

    expect(marker(1).getAttribute("aria-label")).toContain("GK: First0 Last0");
    expect(positionPicker(10).textContent).toContain("ST");
    expect(formationTrigger().textContent).not.toContain("(custom)");
  });

  it("dragging over the slot's own zone previews no landing, since it would not move", async () => {
    await mountTactics();
    const transfer = dataTransfer();
    fireEvent.dragStart(marker(6), { dataTransfer: transfer });
    dragAt("dragOver", pitch(), 50, 42, transfer);
    expect(screen.getByTestId("pitch-drop-zone").textContent).toBe("MC");
    expect(marker(6).closest("li")!.dataset.landing).toBeUndefined();
  });

  it("Reset restores the Formation's template and keeps the eleven", async () => {
    await mountTactics();
    const transfer = dataTransfer();
    fireEvent.dragStart(marker(6), { dataTransfer: transfer });
    dragAt("drop", pitch(), 50, 74, transfer);
    await waitFor(() => expect(formationTrigger().textContent).toContain("(custom)"));

    fireEvent.click(screen.getByRole("button", { name: "Reset to 4-4-2" }));

    await waitFor(() => expect(formationTrigger().textContent).not.toContain("(custom)"));
    expect(positionPicker(6).textContent).toContain("MC");
    expect(marker(6).getAttribute("aria-label")).toContain("First5 Last5");
  });
});
