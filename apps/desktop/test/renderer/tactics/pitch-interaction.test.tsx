import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
      <TacticsScreen saveId={rid("s1")} />
    </RegistryProvider>,
  );
  await screen.findByRole("list", { name: "4-4-2 on the pitch" });
};

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

  it("dropping one marker on another swaps the two slots' players", async () => {
    await mountTactics();
    expect(marker(10).getAttribute("aria-label")).toContain("First9 Last9");
    expect(marker(1).getAttribute("aria-label")).toContain("First0 Last0");

    const transfer = dataTransfer();
    fireEvent.dragStart(marker(10), { dataTransfer: transfer });
    fireEvent.dragOver(marker(1), { dataTransfer: transfer });
    fireEvent.drop(marker(1), { dataTransfer: transfer });

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
