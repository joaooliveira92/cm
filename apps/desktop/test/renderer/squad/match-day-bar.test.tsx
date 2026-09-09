// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SaveId } from "@cm-clone/contracts";
import {
  FAMILIARITY_TIERS,
  FORMATION_SLOTS,
  GOALKEEPING_ATTRIBUTES,
  HIDDEN_ATTRIBUTES,
  OUTFIELD_ATTRIBUTES,
  POSITION_ROLES,
  STATURE_TIERS,
} from "@cm-clone/shared";
import { SquadScreen } from "../../../src/renderer/squad/SquadScreen.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { resetActionHandlers } from "../../../src/renderer/actions/dispatch.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";
import { resetTableSessions } from "../../../src/renderer/table/tableState.js";
import { resetAnnouncements } from "../../../src/renderer/table/announcement.js";

const rid = (s: string) => SaveId.make(s);

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const NOT_FOUND = { _tag: "SaveNotFoundError", id: rid("s1") };
const CONFLICT = {
  _tag: "TacticRevisionConflictError",
  saveId: rid("s1"),
  currentRevision: 4,
};

const attributes = (value: number): Record<string, number> => ({
  ...Object.fromEntries(OUTFIELD_ATTRIBUTES.map((a) => [a, value])),
  ...Object.fromEntries(GOALKEEPING_ATTRIBUTES.map((a) => [a, value])),
  ...Object.fromEntries(HIDDEN_ATTRIBUTES.map((a) => [a, value])),
});

const player = (id: string, lastName: string): unknown => ({
  id: rid(id),
  firstName: "Pep",
  lastName,
  dateOfBirth: "1990-01-01",
  age: 25,
  attributes: attributes(12),
  positions: [{ position: "DC", familiarity: FAMILIARITY_TIERS[0] }],
  overallRating: 80,
  positionRatings: { DC: 74 },
  condition: 100,
  trainingFocus: null,
  nationality: "Brazil",
  birthplace: "Santos",
});

interface SquadOverrides {
  readonly tactic?: unknown;
  readonly revision?: number;
  readonly changeTactics?: (payload: unknown) => Promise<unknown>;
  readonly getTactics?: () => Promise<unknown>;
}

/** A starter-shaped wire Tactic: p0/p1/p2 start, the rest spots empty, an unnamed bench. */
const seededTactic = () => ({
  formation: "4-4-2" as const,
  slots: FORMATION_SLOTS["4-4-2"].map((position, index) => ({
    position,
    role: POSITION_ROLES[position],
    playerId: index < 3 ? rid(`p${index}`) : "",
  })),
  bench: [null, null, null, null, null, null, null],
  mentality: "balanced" as const,
  tempo: "normal" as const,
  pressing: "medium" as const,
});

/** jsdom has no DataTransfer; a drop needs a fake that remembers what a drag wrote. */
const makeDataTransfer = (): { effectAllowed: string; setData: (t: string, v: string) => void; getData: (t: string) => string } => {
  const store = new Map<string, string>();
  return {
    effectAllowed: "move",
    setData: (t: string, v: string) => store.set(t, v),
    getData: (t: string) => store.get(t) ?? "",
  };
};

const drag = (source: Element, target: Element): void => {
  const dataTransfer = makeDataTransfer();
  fireEvent.dragStart(source, { dataTransfer });
  fireEvent.dragOver(target, { dataTransfer });
  fireEvent.drop(target, { dataTransfer });
};

const mountSquadScreen = async (overrides: SquadOverrides = {}): Promise<void> => {
  const squad = [p0, p1, p2, p3, p4, p5];
  mockPreload(async (method, payload) => {
    if (method === "getSquad") {
      return {
        _tag: "Success",
        value: { club: { id: rid("me"), name: "Test FC", statureTier: STATURE_TIERS[0] }, players: squad },
      } as never;
    }
    if (method === "getTactics" && overrides.getTactics !== undefined) {
      return overrides.getTactics();
    }
    if (method === "getTactics") {
      return {
        _tag: "Success",
        value: {
          club: { id: rid("me"), name: "Test FC", statureTier: STATURE_TIERS[0] },
          squad,
          tactic: overrides.tactic ?? seededTactic(),
          revision: overrides.revision ?? 0,
        },
      } as never;
    }
    if (method === "changeTactics") {
      if (overrides.changeTactics !== undefined) return overrides.changeTactics(payload);
      return { _tag: "Failure", error: NOT_FOUND } as never;
    }
    return { _tag: "Failure", error: NOT_FOUND } as never;
  });
  render(
    <RegistryProvider>
      <SquadScreen saveId={rid("s1")} />
    </RegistryProvider>,
  );
  await screen.findByRole("button", { name: "GK slot, Pep Shearer" });
};

const p0 = player("p0", "Shearer");
const p1 = player("p1", "Moore");
const p2 = player("p2", "Nistelrooy");
const p3 = player("p3", "Van Persie");
const p4 = player("p4", "Beresford");
const p5 = player("p5", "Solano");

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

describe("the match-day bar", () => {
  it("renders the seeded eighteen: starters by formation and the bench beneath", async () => {
    await mountSquadScreen();
    const slotButtons = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("aria-label")?.includes(" slot") ?? false);
    expect(slotButtons).toHaveLength(18);
    const starterLabels = FORMATION_SLOTS["4-4-2"].map((position, index) =>
      index < 3 ? `${position} slot, Pep ${["Shearer", "Moore", "Nistelrooy"][index]}` : `${position} slot`,
    );
    const benchLabels = ["SB1", "SB2", "SB3", "SB4", "SB5", "SB6", "SB7"].map((label) => `${label} slot`);
    expect(slotButtons.map((b) => b.getAttribute("aria-label"))).toEqual([
      ...starterLabels,
      ...benchLabels,
    ]);
  });

  it("assigns a squad player onto an empty slot by dragging from the roster", async () => {
    await mountSquadScreen();
    drag(
      screen.getByRole("button", { name: "Van Persie, Pep" }),
      screen.getByRole("button", { name: "ML slot" }),
    );
    expect(screen.getByRole("button", { name: "ML slot, Pep Van Persie" })).toBeTruthy();
  });

  it("flips the roster row's leading indicator to Playing as the player is dragged into a slot", async () => {
    await mountSquadScreen();
    // Seeded lineup: the first three slots are filled; six players, so three
    // rows read Not selected.
    expect(screen.getByRole("img", { name: "Playing (GK)" })).toBeTruthy();
    expect(screen.getAllByRole("img", { name: "Not selected" })).toHaveLength(3);

    drag(
      screen.getByRole("button", { name: "Van Persie, Pep" }),
      screen.getByRole("button", { name: "ML slot" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("img", { name: "Playing (ML)" })).toBeTruthy(),
    );
    expect(screen.getAllByRole("img", { name: "Not selected" })).toHaveLength(2);

    // Unassigning the slot hands the player back to the unselected pool, and
    // the indicator empties with it.
    drag(
      screen.getByRole("button", { name: "ML slot, Pep Van Persie" }),
      screen.getByTestId("lineup-bar"),
    );
    await waitFor(() =>
      expect(screen.getAllByRole("img", { name: "Not selected" })).toHaveLength(3),
    );
    expect(screen.queryByRole("img", { name: "Playing (ML)" })).toBeNull();
  });

  it("replaces the occupant when a squad player lands on a filled slot, the occupant leaves the lineup", async () => {
    await mountSquadScreen();
    drag(
      screen.getByRole("button", { name: "Van Persie, Pep" }),
      screen.getByRole("button", { name: "GK slot, Pep Shearer" }),
    );
    expect(screen.getByRole("button", { name: "GK slot, Pep Van Persie" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /slot, Pep Shearer/ })).toBeNull();
  });

  it("swaps two filled slots when one is dragged onto the other", async () => {
    await mountSquadScreen();
    drag(
      screen.getByRole("button", { name: "GK slot, Pep Shearer" }),
      screen.getByRole("button", { name: "DC slot, Pep Moore" }),
    );
    expect(screen.getByRole("button", { name: "GK slot, Pep Moore" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "DC slot, Pep Shearer" })).toBeTruthy();
  });

  it("unassigns a slot by dragging it back onto the bar", async () => {
    await mountSquadScreen();
    drag(
      screen.getByRole("button", { name: "GK slot, Pep Shearer" }),
      screen.getByTestId("lineup-bar"),
    );
    expect(screen.getByRole("button", { name: "GK slot" })).toBeTruthy();
  });

  it("persists the edited lineup through the shared save path on Save Lineup", async () => {
    const saves: unknown[] = [];
    await mountSquadScreen({
      changeTactics: async (payload) => {
        saves.push(payload);
        return {
          _tag: "Success",
          value: {
            club: { id: rid("me"), name: "Test FC", statureTier: STATURE_TIERS[0] },
            squad: [p0, p1, p2, p3, p4, p5],
            tactic: (payload as { tactic: unknown }).tactic,
            revision: (payload as { expectedRevision: number }).expectedRevision + 1,
          },
        } as never;
      },
    });

    drag(
      screen.getByRole("button", { name: "Van Persie, Pep" }),
      screen.getByRole("button", { name: "ML slot" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save Lineup" }));
    expect(await screen.findByText("Saved.")).toBeTruthy();

    expect(saves).toHaveLength(1);
    const payload = saves[0] as {
      expectedRevision: number;
      tactic: { slots: Array<{ position: string; playerId: unknown }> };
      saveId: unknown;
    };
    expect(payload.expectedRevision).toBe(0);
    const mlIndex = payload.tactic.slots.findIndex((slot) => slot.position === "ML");
    expect(String(payload.tactic.slots[mlIndex]!.playerId)).toBe("p3");
    expect(String(payload.tactic.slots[0]!.playerId)).toBe("p0");
  });

  it("surfaces a lost write race as a distinct conflict with a Refresh path", async () => {
    let loads = 0;
    await mountSquadScreen({
      changeTactics: async () => ({ _tag: "Failure", error: CONFLICT } as never),
      getTactics: async () => {
        loads += 1;
        const revision = loads === 1 ? 3 : 5;
        const tactic = loads === 1 ? seededTactic() : { ...seededTactic(), formation: "5-3-2" as const };
        return {
          _tag: "Success",
          value: {
            club: { id: rid("me"), name: "Test FC", statureTier: STATURE_TIERS[0] },
            squad: [p0, p1, p2, p3, p4, p5],
            tactic,
            revision,
          },
        } as never;
      },
    });

    drag(
      screen.getByRole("button", { name: "Van Persie, Pep" }),
      screen.getByRole("button", { name: "ML slot" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save Lineup" }));

    const alert = await screen.findByTestId("lineup-conflict");
    expect(alert.textContent).toMatch(/newer tactic was saved/);
    expect(screen.getByRole("button", { name: "Refresh" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(screen.queryByTestId("lineup-conflict")).toBeNull());
    // The refreshed view (5-3-2) re-seeds the draft.
    expect(screen.getByRole("button", { name: "DR slot" })).toBeTruthy();
  });

  it("carries a player by keyboard: Enter picks up a filled slot, Enter on a slot places them, Escape releases", async () => {
    await mountSquadScreen();
    const gk = screen.getByRole("button", { name: "GK slot, Pep Shearer" });
    fireEvent.keyDown(gk, { key: "Enter" });
    expect(screen.getByTestId("lineup-carried").textContent).toMatch(/Shearer/);
    expect(gk.getAttribute("aria-pressed")).toBe("true");

    fireEvent.keyDown(screen.getByRole("button", { name: "ML slot" }), { key: "Enter" });
    expect(screen.getByRole("button", { name: "ML slot, Pep Shearer" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "GK slot" })).toBeTruthy();
    expect(screen.queryByTestId("lineup-carried")).toBeNull();

    // Escape releases the carry without changing anything.
    const another = screen.getByRole("button", { name: "DC slot, Pep Nistelrooy" });
    fireEvent.keyDown(another, { key: "Enter" });
    expect(screen.getByTestId("lineup-carried")).toBeTruthy();
    fireEvent.keyDown(another, { key: "Escape" });
    expect(screen.queryByTestId("lineup-carried")).toBeNull();
    expect(screen.getByRole("button", { name: "DC slot, Pep Nistelrooy" })).toBeTruthy();
  });
});