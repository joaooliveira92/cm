import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { RegisteredScreenBar } from "../registered-screen-bar.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SaveId } from "@cm-clone/contracts";
import {
  FAMILIARITY_TIERS,
  GOALKEEPING_ATTRIBUTES,
  HIDDEN_ATTRIBUTES,
  OUTFIELD_ATTRIBUTES,
  STATURE_TIERS,
  BUILT_IN_TEMPLATES,
  slotLabel,
} from "@cm-clone/shared";
import { SquadScreen } from "../../../src/renderer/squad/SquadScreen.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { resetActionHandlers } from "../../../src/renderer/actions/dispatch.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";
import { resetTableSessions } from "../../../src/renderer/table/tableState.js";
import { resetAnnouncements } from "../../../src/renderer/table/announcement.js";
import { renderInRouter } from "../../setup/renderInRouter.js";
import { saveSquadViewId } from "../../../src/renderer/squad/squadViews.js";
import { positionSummaryFor } from "../../setup/positionFixtures.js";

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

const fourFourTwoTemplate = BUILT_IN_TEMPLATES.find((t) => t.name === "4-4-2")!;
const fourFourTwoCells = fourFourTwoTemplate.slots.map((s) => s.cell);
const fourFourTwoLabels = fourFourTwoCells.map((cell) => slotLabel(cell));

const slotInstructions = {
  passing: "team" as const,
  closingDown: "team" as const,
  tackling: "team" as const,
  marking: "team" as const,
  mentality: "team" as const,
  distribution: "default" as const,
  crossFrom: "default" as const,
  crossAim: "default" as const,
  crossBall: "normal" as const,
  longShots: "normal" as const,
  forwardRuns: "normal" as const,
  runWithBall: "normal" as const,
  tryThroughBalls: "normal" as const,
  freeRole: "normal" as const,
  holdUpBall: "normal" as const,
};

const slotRoles = {
  defendFreeKick: "default" as const,
  attackFreeKick: "default" as const,
  defendCorner: "default" as const,
  attackCorner: "default" as const,
  attackingThrowInLeft: "default" as const,
  attackingThrowInRight: "default" as const,
};

const teamInstructions = {
  passing: "mixed" as const,
  focusPassing: "mixed" as const,
  tackling: "normal" as const,
  closingDown: "default" as const,
  mentality: "normal" as const,
  offsideTrap: false,
  zonalMarking: true,
  counterAttack: false,
  menBehindTheBall: false,
};

const teamSetPieces = {
  cornersLeft: "default" as const,
  cornersRight: "default" as const,
  freeKicksLeft: "default" as const,
  freeKicksRight: "default" as const,
  throwInsLeft: "default" as const,
  throwInsRight: "default" as const,
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
  ...positionSummaryFor("DC"),
  overallRating: 80,
  positionRatings: { DC: 74 },
  suitability: {},
  retrainingTarget: null,
  condition: 100,
  trainingFocus: null,
  nationality: "Brazil",
  birthplace: "Santos",
  foreign: false,
  contractWage: 9000,
  contractExpiryDate: "2028-06-30",
  transferValue: 1200000,
});

interface SquadOverrides {
  readonly squad?: ReadonlyArray<unknown>;
  readonly tactic?: unknown;
  readonly revision?: number;
  readonly changeTactics?: (payload: unknown) => Promise<unknown>;
  readonly getTactics?: () => Promise<unknown>;
}

const seededTactic = () => ({
  sourceTemplate: "4-4-2",
  slots: fourFourTwoCells.map((cell) => ({
    cell,
    run: null,
    instructions: slotInstructions,
    setPieceRoles: slotRoles,
  })),
  team: teamInstructions,
  teamSetPieces,
  assignments: fourFourTwoLabels.map((_label, index) => (index < 3 ? rid(`p${index}`) : "")),
  bench: [null, null, null, null, null, null, null],
  takers: {
    captain: [],
    penalties: [],
    freeKicksLeft: [],
    freeKicksRight: [],
    cornersLeft: [],
    cornersRight: [],
    throwInsLeft: [],
    throwInsRight: [],
  },
});

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
  const squad = overrides.squad ?? [p0, p1, p2, p3, p4, p5];
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
  renderInRouter(
    <RegistryProvider>
      <SquadScreen saveId={rid("s1")} />
      <RegisteredScreenBar />
    </RegistryProvider>,
  );
  const firstLabel = fourFourTwoLabels[0]!;
  await screen.findByRole("button", { name: `${firstLabel} slot, Pep Shearer` });
};

const p0 = player("p0", "Shearer");
const p1 = player("p1", "Moore");
const p2 = player("p2", "Nistelrooy");
const p3 = player("p3", "Van Persie");
const p4 = player("p4", "Beresford");
const p5 = player("p5", "Solano");

const FULL_SQUAD = [
  p0, p1, p2, p3, p4, p5,
  ...["Hall", "Ince", "Keane", "Lee", "Batty", "Speed"].map((name, index) => player(`p${index + 6}`, name)),
];

const completeTactic = () => ({
  ...seededTactic(),
  assignments: fourFourTwoLabels.map((_label, index) => rid(`p${index}`)),
});

const ML_INDEX = fourFourTwoLabels.indexOf("M L");

const successfulSave = (payload: unknown) =>
  ({
    _tag: "Success",
    value: {
      club: { id: rid("me"), name: "Test FC", statureTier: STATURE_TIERS[0] },
      squad: FULL_SQUAD,
      tactic: (payload as { tactic: unknown }).tactic,
      revision: (payload as { expectedRevision: number }).expectedRevision + 1,
    },
  }) as never;

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
    const starterLabels = fourFourTwoLabels.map((label, index) =>
      index < 3 ? `${label} slot, Pep ${["Shearer", "Moore", "Nistelrooy"][index]}` : `${label} slot`,
    );
    const benchLabels = ["SB1", "SB2", "SB3", "SB4", "SB5", "SB6", "SB7"].map((l) => `${l} slot`);
    expect(slotButtons.map((b) => b.getAttribute("aria-label"))).toEqual([
      ...starterLabels,
      ...benchLabels,
    ]);
  });

  it("assigns a squad player onto an empty slot by dragging from the roster", async () => {
    await mountSquadScreen();
    const mlLabel = fourFourTwoLabels[ML_INDEX]!;
    drag(
      screen.getByRole("button", { name: "Van Persie, Pep" }),
      screen.getByRole("button", { name: `${mlLabel} slot` }),
    );
    expect(screen.getByRole("button", { name: `${mlLabel} slot, Pep Van Persie` })).toBeTruthy();
  });

  it("flips the roster row's leading indicator to Playing as the player is dragged into a slot", async () => {
    await mountSquadScreen();
    expect(screen.getByText("Playing (GK)")).toBeTruthy();
    expect(screen.getAllByText("Not selected")).toHaveLength(3);

    const mlLabel = fourFourTwoLabels[ML_INDEX]!;
    drag(
      screen.getByRole("button", { name: "Van Persie, Pep" }),
      screen.getByRole("button", { name: `${mlLabel} slot` }),
    );
    await waitFor(() =>
      expect(screen.getByText(`Playing (${mlLabel})`)).toBeTruthy(),
    );
    expect(screen.getAllByText("Not selected")).toHaveLength(2);

    drag(
      screen.getByRole("button", { name: `${mlLabel} slot, Pep Van Persie` }),
      screen.getByTestId("lineup-bar"),
    );
    await waitFor(() =>
      expect(screen.getAllByText("Not selected")).toHaveLength(3),
    );
    expect(screen.queryByText(`Playing (${mlLabel})`)).toBeNull();
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
    const dcLabel = fourFourTwoLabels[1]!;
    drag(
      screen.getByRole("button", { name: "GK slot, Pep Shearer" }),
      screen.getByRole("button", { name: `${dcLabel} slot, Pep Moore` }),
    );
    expect(screen.getByRole("button", { name: "GK slot, Pep Moore" })).toBeTruthy();
    expect(screen.getByRole("button", { name: `${dcLabel} slot, Pep Shearer` })).toBeTruthy();
  });

  it("unassigns a slot by dragging it back onto the bar", async () => {
    await mountSquadScreen();
    drag(
      screen.getByRole("button", { name: "GK slot, Pep Shearer" }),
      screen.getByTestId("lineup-bar"),
    );
    expect(screen.getByRole("button", { name: "GK slot" })).toBeTruthy();
  });

  it("autosaves a complete lineup the moment it is edited, with no Save button", async () => {
    const saves: unknown[] = [];
    await mountSquadScreen({
      squad: FULL_SQUAD,
      tactic: completeTactic(),
      changeTactics: async (payload) => {
        saves.push(payload);
        return successfulSave(payload);
      },
    });
    expect(screen.queryByRole("button", { name: "Save Lineup" })).toBeNull();

    const mlLabel = fourFourTwoLabels[ML_INDEX]!;
    drag(
      screen.getByRole("button", { name: "Speed, Pep" }),
      screen.getByRole("button", { name: new RegExp(`^${mlLabel} slot, `) }),
    );
    expect(await screen.findByText("Saved.")).toBeTruthy();

    expect(saves).toHaveLength(1);
    const payload = saves[0] as {
      expectedRevision: number;
      tactic: { assignments: Array<unknown> };
    };
    expect(payload.expectedRevision).toBe(0);
    expect(String(payload.tactic.assignments[ML_INDEX])).toBe("p11");
    expect(String(payload.tactic.assignments[0])).toBe("p0");
  });

  it("does not save while a starter slot is empty, and says how many are missing", async () => {
    const saves: unknown[] = [];
    await mountSquadScreen({
      changeTactics: async (payload) => {
        saves.push(payload);
        return successfulSave(payload);
      },
    });
    const mlLabel = fourFourTwoLabels[ML_INDEX]!;
    drag(
      screen.getByRole("button", { name: "Van Persie, Pep" }),
      screen.getByRole("button", { name: `${mlLabel} slot` }),
    );
    expect(screen.getByText("Not saved yet: pick 7 more starters.")).toBeTruthy();
    expect(saves).toHaveLength(0);
  });

  it("sends edits made during a save as one follow-up save at the new revision", async () => {
    const saves: Array<{ expectedRevision: number; tactic: { assignments: Array<unknown> } }> = [];
    const pending: Array<() => void> = [];
    await mountSquadScreen({
      squad: FULL_SQUAD,
      tactic: completeTactic(),
      changeTactics: (payload) => {
        saves.push(payload as never);
        return new Promise((resolve) => pending.push(() => resolve(successfulSave(payload))));
      },
    });

    const mlLabel = fourFourTwoLabels[ML_INDEX]!;
    drag(screen.getByRole("button", { name: "Speed, Pep" }), screen.getByRole("button", { name: new RegExp(`^${mlLabel} slot, `) }));
    await waitFor(() => expect(saves).toHaveLength(1));
    drag(screen.getByRole("button", { name: "GK slot, Pep Shearer" }), screen.getByRole("button", { name: `${fourFourTwoLabels[1]!} slot, Pep Moore` }));
    drag(screen.getByRole("button", { name: "GK slot, Pep Moore" }), screen.getByRole("button", { name: `${fourFourTwoLabels[1]!} slot, Pep Shearer` }));
    expect(saves).toHaveLength(1);

    pending.shift()!();
    await waitFor(() => expect(saves).toHaveLength(2));
    expect(saves[1]!.expectedRevision).toBe(1);
    expect(String(saves[1]!.tactic.assignments[0])).toBe("p0");
    expect(String(saves[1]!.tactic.assignments[ML_INDEX])).toBe("p11");
    pending.shift()!();
    expect(await screen.findByText("Saved.")).toBeTruthy();
    expect(saves).toHaveLength(2);
  });

  it("surfaces a lost write race as a distinct conflict with a Refresh path", async () => {
    let loads = 0;
    await mountSquadScreen({
      squad: FULL_SQUAD,
      changeTactics: async () => ({ _tag: "Failure", error: CONFLICT } as never),
      getTactics: async () => {
        loads += 1;
        const revision = loads === 1 ? 3 : 5;
        const tactic = loads === 1 ? completeTactic() : { ...completeTactic(), sourceTemplate: "5-3-2" as const };
        return {
          _tag: "Success",
          value: {
            club: { id: rid("me"), name: "Test FC", statureTier: STATURE_TIERS[0] },
            squad: FULL_SQUAD,
            tactic,
            revision,
          },
        } as never;
      },
    });

    const mlLabel = fourFourTwoLabels[ML_INDEX]!;
    drag(
      screen.getByRole("button", { name: "Speed, Pep" }),
      screen.getByRole("button", { name: new RegExp(`^${mlLabel} slot, `) }),
    );

    const line = await screen.findByText(/newer tactic was saved/);
    expect(line.closest("[data-testid='lineup-bar']")).toBeNull();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(screen.queryByText(/newer tactic was saved/)).toBeNull());
    expect(screen.getByRole("button", { name: /^D R slot/ })).toBeTruthy();
  });

  it("carries a player by keyboard: Enter picks up a filled slot, Enter on a slot places them, Escape releases", async () => {
    await mountSquadScreen();
    const mlLabel = fourFourTwoLabels[ML_INDEX]!;
    const gk = screen.getByRole("button", { name: "GK slot, Pep Shearer" });
    fireEvent.keyDown(gk, { key: "Enter" });
    expect(screen.getByTestId("lineup-carried").textContent).toMatch(/Shearer/);
    expect(gk.getAttribute("aria-pressed")).toBe("true");

    fireEvent.keyDown(screen.getByRole("button", { name: `${mlLabel} slot` }), { key: "Enter" });
    expect(screen.getByRole("button", { name: `${mlLabel} slot, Pep Shearer` })).toBeTruthy();
    expect(screen.getByRole("button", { name: "GK slot" })).toBeTruthy();
    expect(screen.queryByTestId("lineup-carried")).toBeNull();

    const dcLabel = fourFourTwoLabels[1]!;
    const another = screen.getByRole("button", { name: `${dcLabel} slot, Pep Nistelrooy` });
    fireEvent.keyDown(another, { key: "Enter" });
    expect(screen.getByTestId("lineup-carried")).toBeTruthy();
    fireEvent.keyDown(another, { key: "Escape" });
    expect(screen.queryByTestId("lineup-carried")).toBeNull();
    expect(screen.getByRole("button", { name: `${dcLabel} slot, Pep Nistelrooy` })).toBeTruthy();
  });
});

describe("the table layouts lead with the same match-day indicator", () => {
  const statesByRow = (rowSelector: string): Record<string, string> =>
    Object.fromEntries(
      [...document.querySelectorAll(rowSelector)].map((row) => [
        row.querySelector("[data-focus-id]")!.getAttribute("data-focus-id"),
        row.querySelector(".sr-only")!.textContent,
      ]),
    );

  it("names each row's state in the table exactly as the position list does", async () => {
    saveSquadViewId("general");
    await mountSquadScreen();
    const table = statesByRow("tbody tr");
    expect(Object.values(table).filter((state) => state.startsWith("Playing"))).toHaveLength(3);
    expect(Object.values(table).filter((state) => state === "Not selected")).toHaveLength(3);

    cleanup();
    saveSquadViewId("positions");
    await mountSquadScreen();
    expect(statesByRow("[data-squad-layout='positions'] tbody tr")).toEqual(table);
  });

  it("follows the bar live, and adds no tab stop to a row", async () => {
    saveSquadViewId("general");
    await mountSquadScreen();
    const tbody = document.querySelector("tbody")!;
    expect(within(tbody).getByText("Playing (GK)")).toBeTruthy();

    drag(screen.getByRole("button", { name: "GK slot, Pep Shearer" }), screen.getByTestId("lineup-bar"));
    await waitFor(() => expect(within(tbody).queryByText("Playing (GK)")).toBeNull());
    expect(within(tbody).getAllByText("Not selected")).toHaveLength(4);

    const focusable = [...tbody.querySelectorAll("button, a[href], input, [tabindex]")];
    expect(focusable.length).toBe(6);
    expect(focusable.every((element) => element.hasAttribute("data-focus-id"))).toBe(true);
  });
});