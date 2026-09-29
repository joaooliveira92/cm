/**
 * The keyboard contract at the match-day bar, which the fit context must not have bent: Enter or
 * Space on a FILLED slot still picks the player up, Enter on another slot still places them, and
 * Escape still releases a held player. The one new thing is that Enter or Space on an EMPTY slot
 * selects it instead of starting a carry — and the two never happen at once.
 *
 * Escape has two jobs now and one order: a held player comes first, because a manager mid-carry
 * has not finished the action they started, and only then does Escape drop the selection.
 */
import { cleanup, createEvent, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SaveId } from "@cm-clone/contracts";
import {
  FORMATION_SLOTS,
  GOALKEEPING_ATTRIBUTES,
  HIDDEN_ATTRIBUTES,
  OUTFIELD_ATTRIBUTES,
  POSITION_ROLES,
  STATURE_TIERS,
  type FamiliarityTier,
} from "@cm-clone/shared";
import { SquadScreen } from "../../../src/renderer/squad/SquadScreen.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { resetActionHandlers } from "../../../src/renderer/actions/dispatch.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";
import { resetTableSessions } from "../../../src/renderer/table/tableState.js";
import { resetAnnouncements } from "../../../src/renderer/table/announcement.js";
import { renderInRouter } from "../../setup/renderInRouter.js";

const rid = (s: string) => SaveId.make(s);
const NOT_FOUND = { _tag: "SaveNotFoundError", id: rid("s1") };

const attributes = (value: number): Record<string, number> => ({
  ...Object.fromEntries(OUTFIELD_ATTRIBUTES.map((a) => [a, value])),
  ...Object.fromEntries(GOALKEEPING_ATTRIBUTES.map((a) => [a, value])),
  ...Object.fromEntries(HIDDEN_ATTRIBUTES.map((a) => [a, value])),
});

const player = (id: string, lastName: string, position: string, familiarity: FamiliarityTier): unknown => ({
  id: rid(id),
  firstName: "Pep",
  lastName,
  dateOfBirth: "1990-01-01",
  age: 25,
  attributes: attributes(12),
  positions: [{ position, familiarity }],
  overallRating: 80,
  positionRatings: { [position]: 74 },
  condition: 100,
  trainingFocus: null,
  nationality: "Brazil",
  birthplace: "Santos",
  foreign: false,
  contractWage: 9000,
  contractExpiryDate: "2028-06-30",
  transferValue: 1200000,
});

const SQUAD = [
  player("p1", "Alpha", "DC", "natural"),
  player("p2", "Bravo", "ST", "natural"),
  player("p3", "Charlie", "DC", "unfamiliar"),
  player("p4", "Delta", "DM", "natural"),
  player("p5", "Echo", "DC", "competent"),
  player("p6", "Foxtrot", "GK", "natural"),
];

const GK_INDEX = FORMATION_SLOTS["4-4-2"].indexOf("GK");

/** Only the goalkeeper is on the lineup, so there is a filled slot to pick up and empty starters
 *  to select — the two things these keys mean, side by side. */
const TACTIC = {
  formation: "4-4-2" as const,
  slots: FORMATION_SLOTS["4-4-2"].map((position, index) => ({
    position,
    role: POSITION_ROLES[position],
    playerId: index === GK_INDEX ? rid("p6") : "",
  })),
  bench: [null, null, null, null, null, null, null],
  mentality: "balanced" as const,
  tempo: "normal" as const,
  pressing: "medium" as const,
};

const mountSquadScreen = async (): Promise<void> => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string) => {
      if (method === "getSquad") {
        return {
          _tag: "Success",
          value: { club: { id: rid("me"), name: "Test FC", statureTier: STATURE_TIERS[0] }, players: SQUAD },
        } as never;
      }
      if (method === "getTactics") {
        return {
          _tag: "Success",
          value: {
            club: { id: rid("me"), name: "Test FC", statureTier: STATURE_TIERS[0] },
            squad: SQUAD,
            tactic: TACTIC,
            revision: 0,
          },
        } as never;
      }
      return { _tag: "Failure", error: NOT_FOUND } as never;
    },
  };
  renderInRouter(
    <RegistryProvider>
      <SquadScreen saveId={rid("s1")} />
    </RegistryProvider>,
  );
  await screen.findByRole("button", { name: "GK slot, Pep Foxtrot" });
};

const anEmptyDcSlot = (): HTMLElement => screen.getAllByRole("button", { name: "DC slot" })[0]!;
const theFilledSlot = (): HTMLElement => screen.getByRole("button", { name: "GK slot, Pep Foxtrot" });
const carried = (): HTMLElement | null => screen.queryByTestId("lineup-carried");
const contextLine = (): HTMLElement | null => screen.queryByTestId("squad-fit-context");

const reset = () => {
  cleanup();
  resetActionHandlers();
  resetScopeState();
  resetTableSessions();
  resetAnnouncements();
  window.localStorage.clear();
};

beforeEach(reset);
afterEach(reset);

describe("Enter and Space on an empty starter slot", () => {
  it("sets the context and does not start a carry", async () => {
    await mountSquadScreen();

    fireEvent.keyDown(anEmptyDcSlot(), { key: "Enter" });

    expect(contextLine()!.textContent).toContain("Showing players for DC");
    expect(carried()).toBeNull();
    expect(anEmptyDcSlot().getAttribute("aria-pressed")).toBe("false");
  });

  it("does the same on Space, and clears itself on the second press", async () => {
    await mountSquadScreen();

    fireEvent.keyDown(anEmptyDcSlot(), { key: " " });
    expect(contextLine()!.textContent).toContain("Showing players for DC");

    fireEvent.keyDown(anEmptyDcSlot(), { key: " " });
    expect(contextLine()).toBeNull();
  });

  it("marks the selected slot as the current one, separately from a held player", async () => {
    await mountSquadScreen();
    expect(anEmptyDcSlot().getAttribute("aria-current")).toBeNull();

    fireEvent.keyDown(anEmptyDcSlot(), { key: "Enter" });

    expect(anEmptyDcSlot().getAttribute("aria-current")).toBe("true");
    // A selection is not a pickup: `aria-pressed` stays false so the two never read alike.
    expect(anEmptyDcSlot().getAttribute("aria-pressed")).toBe("false");
  });

  // An empty starter is a real `<button>` carrying BOTH `onKeyDown` and `onClick`, and a button's
  // Enter and Space both synthesise a native activation `click` on top of the keydown. The bar
  // prevents the keydown's default precisely to suppress that, and this asserts the mechanism
  // rather than the outcome — because jsdom never synthesises the click, so every other test in
  // this file would stay green with the `preventDefault()` deleted and a real browser would
  // select-then-deselect. `defaultPrevented` is the thing that has to hold.
  it.each([
    ["Enter", "Enter"],
    ["Space", " "],
  ])("prevents the default action on %s, so no second click toggles the slot back off", async (
    _label,
    key,
  ) => {
    await mountSquadScreen();

    const event = createEvent.keyDown(anEmptyDcSlot(), { key, cancelable: true });
    fireEvent(anEmptyDcSlot(), event);

    expect(event.defaultPrevented).toBe(true);
    // And the press did its work anyway: preventing the default suppresses the browser's
    // activation, not this handler.
    expect(contextLine()!.textContent).toContain("Showing players for DC");
  });

  // The pointer path is the same single toggle. A click handler that both set and cleared would
  // also pass every keydown test above, because jsdom stops at the keydown.
  it("is one toggle per click, the same as the key, and not a set-then-clear", async () => {
    await mountSquadScreen();
    expect(contextLine()).toBeNull();

    fireEvent.click(anEmptyDcSlot());

    expect(contextLine()!.textContent).toContain("Showing players for DC");

    fireEvent.click(anEmptyDcSlot());

    expect(contextLine()).toBeNull();
  });
});

describe("Enter on a filled slot", () => {
  it("still picks the player up, and leaves the context alone", async () => {
    await mountSquadScreen();
    fireEvent.keyDown(anEmptyDcSlot(), { key: "Enter" });

    fireEvent.keyDown(theFilledSlot(), { key: "Enter" });

    expect(carried()!.textContent).toMatch(/Foxtrot/);
    expect(theFilledSlot().getAttribute("aria-pressed")).toBe("true");
    expect(theFilledSlot().getAttribute("aria-current")).toBeNull();
    expect(contextLine()!.textContent).toContain("Showing players for DC");
  });

  it("still places a held player on an empty slot rather than selecting it", async () => {
    await mountSquadScreen();
    fireEvent.keyDown(theFilledSlot(), { key: "Enter" });
    expect(carried()).toBeTruthy();

    fireEvent.keyDown(anEmptyDcSlot(), { key: "Enter" });

    expect(screen.getByRole("button", { name: "DC slot, Pep Foxtrot" })).toBeTruthy();
    expect(carried()).toBeNull();
  });
});

describe("Escape with a carry held", () => {
  it("releases the player first, and only the second Escape clears the context", async () => {
    await mountSquadScreen();
    fireEvent.keyDown(anEmptyDcSlot(), { key: "Enter" });
    fireEvent.keyDown(theFilledSlot(), { key: "Enter" });
    expect(carried()).toBeTruthy();
    expect(contextLine()).toBeTruthy();

    // First Escape: the carry goes, the context stays.
    fireEvent.keyDown(theFilledSlot(), { key: "Escape" });
    expect(carried()).toBeNull();
    expect(contextLine()!.textContent).toContain("Showing players for DC");
    expect(screen.getByRole("button", { name: "GK slot, Pep Foxtrot" })).toBeTruthy();

    // Second Escape: the context goes, and the lineup is untouched either way.
    fireEvent.keyDown(anEmptyDcSlot(), { key: "Escape" });
    expect(contextLine()).toBeNull();
    expect(screen.getByRole("button", { name: "GK slot, Pep Foxtrot" })).toBeTruthy();
  });
});

describe("carrying a non-fitting player into the selected slot", () => {
  it("places a player who cannot fill the slot, which then clears the context", async () => {
    await mountSquadScreen();
    fireEvent.keyDown(anEmptyDcSlot(), { key: "Enter" });
    expect(contextLine()!.textContent).toContain("Showing players for DC");

    // Foxtrot is a goalkeeper, so the DC slot is the wrong home for him — and it takes him anyway.
    fireEvent.keyDown(theFilledSlot(), { key: "Enter" });
    fireEvent.keyDown(anEmptyDcSlot(), { key: "Enter" });

    expect(screen.getByRole("button", { name: "DC slot, Pep Foxtrot" })).toBeTruthy();
    expect(contextLine()).toBeNull();
  });
});
