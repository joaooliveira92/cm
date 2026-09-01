// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SaveId } from "@cm-clone/contracts";
import { NON_CONTACT_CONDITION_THRESHOLD } from "@cm-clone/game-engine";
import {
  FAMILIARITY_TIERS,
  GOALKEEPING_ATTRIBUTES,
  HIDDEN_ATTRIBUTES,
  OUTFIELD_ATTRIBUTES,
  POSITIONS,
  STATURE_TIERS,
} from "@cm-clone/shared";
import { SquadScreen } from "../src/renderer/SquadScreen.js";
import { RegistryProvider } from "../src/renderer/rpc.js";
import { resetActionHandlers } from "../src/renderer/actions/dispatch.js";
import { resetScopeState } from "../src/renderer/actions/scopeState.js";
import { resetTableSessions } from "../src/renderer/table/tableState.js";
import { resetAnnouncements } from "../src/renderer/table/announcement.js";
import { scrollEdges } from "../src/renderer/table/DataTable.js";
import {
  RESERVED_STATUSES,
  statusesOf,
  statusTermsOf,
} from "../src/renderer/table/squad/playerStatus.js";
import {
  SQUAD_PROTECTED_COLUMN_IDS,
  SQUAD_TOGGLEABLE_COLUMN_IDS,
  toggleColumn,
} from "../src/renderer/table/features/visibility.js";

const rid = (s: string) => SaveId.make(s);

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const NOT_FOUND = { _tag: "SaveNotFoundError", id: rid("s1") };

const attributes = (value: number): Record<string, number> => ({
  ...Object.fromEntries(OUTFIELD_ATTRIBUTES.map((a) => [a, value])),
  ...Object.fromEntries(GOALKEEPING_ATTRIBUTES.map((a) => [a, value])),
  ...Object.fromEntries(HIDDEN_ATTRIBUTES.map((a) => [a, value])),
});

const squadPlayer = (id: string, name: string, condition: number) => ({
  id: rid(id),
  firstName: name,
  lastName: "Player",
  dateOfBirth: "1990-01-01",
  age: 25,
  attributes: attributes(12),
  positions: [{ position: POSITIONS[2], familiarity: FAMILIARITY_TIERS[0] }],
  overallRating: 80,
  positionRatings: { ST: 12 },
  condition,
  trainingFocus: null,
});

const squadView = (players: ReturnType<typeof squadPlayer>[]) => ({
  club: { id: rid("me"), name: "Test FC", statureTier: STATURE_TIERS[0] },
  players,
});

const mountSquad = async (view: unknown): Promise<void> => {
  mockPreload(async (method) =>
    method === "getSquad"
      ? ({ _tag: "Success", value: view } as never)
      : ({ _tag: "Failure", error: NOT_FOUND } as never),
  );
  render(
    <RegistryProvider>
      <SquadScreen saveId={rid("s1")} />
    </RegistryProvider>,
  );
};

const FRESH = 100;
const TIRED = NON_CONTACT_CONDITION_THRESHOLD - 1;

const rowOf = (name: string): HTMLElement => {
  const cell = screen.getByText(new RegExp(`${name} Player`));
  return cell.closest("tr") as HTMLElement;
};

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

describe("the reserved status catalogue", () => {
  it("carries the full CM 03/04 vocabulary, each slot with a likelihood note", () => {
    expect(RESERVED_STATUSES.map((s) => s.abbreviation)).toEqual([
      "Lmp", "Inj", "Sus", "Wnt", "Bid", "Yel", "Int", "Fgn", "Ine", "Wpm",
      "Tir", "Cup", "Loa", "Lst", "Unh", "Unf", "Sct", "Yth", "Req",
    ]);
    for (const status of RESERVED_STATUSES) {
      expect(status.term.length).toBeGreaterThan(status.abbreviation.length);
      expect(status.note).not.toBe("");
    }
  });

  it("renders only engine-modeled state: Condition below the engine's fatigue threshold, nothing else", () => {
    expect(statusesOf({ condition: FRESH })).toEqual([]);
    expect(statusesOf({ condition: NON_CONTACT_CONDITION_THRESHOLD })).toEqual([]);
    expect(statusTermsOf({ condition: TIRED })).toEqual(["Tired"]);
    // Exactly one slot is modeled today; every other one is a reservation and
    // must stay unrenderable until the engine grows the state behind it.
    expect(RESERVED_STATUSES.filter((s) => s.likelihood === "modeled")).toHaveLength(1);
  });
});

describe("the Status column in the Squad table", () => {
  it("renders the full term for assistive technology and never the bare abbreviation", async () => {
    await mountSquad(squadView([squadPlayer("p1", "Alan", TIRED), squadPlayer("p2", "Bob", FRESH)]));
    await screen.findByText(/Alan Player/);

    const tired = within(rowOf("Alan"));
    expect(tired.getByText("Tired")).toBeTruthy();
    // The code is decoration only — hidden from the accessibility tree.
    expect(tired.getByText("Tir").getAttribute("aria-hidden")).toBe("true");

    // Nothing is modeled for a fully fit player, so the cell stays empty
    // rather than inventing a status.
    expect(within(rowOf("Bob")).queryByText("Tired")).toBeNull();
    expect(within(rowOf("Bob")).queryByText("Tir")).toBeNull();
  });

  it("speaks the full term, not the abbreviation, when the row takes focus", async () => {
    await mountSquad(squadView([squadPlayer("p1", "Alan", TIRED), squadPlayer("p2", "Bob", FRESH)]));
    await screen.findByText(/Alan Player/);

    const announcer = document.querySelector('[role="status"][aria-live="polite"]')!;
    const nameButton = document.querySelector(
      '[data-focus-id="squad.squadTable.p1"]',
    ) as HTMLElement;
    fireEvent.focus(nameButton);

    expect(announcer.textContent).toContain("Alan Player: Tired.");
    expect(announcer.textContent).not.toMatch(/\bTir\b/);
  });

  it("survives every column preset and is absent from the show/hide toggles", async () => {
    await mountSquad(squadView([squadPlayer("p1", "Alan", TIRED)]));
    await screen.findByText(/Alan Player/);

    const header = () => screen.getByRole("button", { name: /status/i });
    expect(header()).toBeTruthy();

    // Overview hides most columns; Goalkeeping swaps the attribute set. The
    // protected pair rides through both.
    fireEvent.change(screen.getByLabelText("Squad column preset"), { target: { value: "goalkeeping" } });
    expect(header()).toBeTruthy();
    expect(screen.getByText(/Alan Player/)).toBeTruthy();

    fireEvent.click(screen.getByText("Show / hide columns"));
    for (const protectedId of SQUAD_PROTECTED_COLUMN_IDS) {
      expect(SQUAD_TOGGLEABLE_COLUMN_IDS).not.toContain(protectedId);
    }
    expect(screen.queryByLabelText("Status")).toBeNull();
  });

  it("refuses to hide a protected column however the toggle is called", () => {
    for (const protectedId of SQUAD_PROTECTED_COLUMN_IDS) {
      expect(toggleColumn(["name", "status", "age"], protectedId)).toContain(protectedId);
      expect(toggleColumn(["age"], protectedId)).toContain(protectedId);
    }
    expect(toggleColumn(["name", "status", "age"], "age")).not.toContain("age");
  });
});

describe("the abbreviation legend (Term Disclosure)", () => {
  it("expands from the Status header without a mouse and lists every reserved slot", async () => {
    await mountSquad(squadView([squadPlayer("p1", "Alan", FRESH)]));
    await screen.findByText(/Alan Player/);

    const header = screen.getByRole("button", { name: /status/i });
    expect(header.getAttribute("aria-expanded")).toBe("false");
    const legendId = header.getAttribute("aria-controls")!;
    expect(document.getElementById(legendId)).toBeNull();

    // A button, so Enter/Space activate it in the ordinary keyboard way.
    fireEvent.click(header);
    expect(screen.getByRole("button", { name: /status/i }).getAttribute("aria-expanded")).toBe("true");

    const legend = document.getElementById(legendId)!;
    for (const status of RESERVED_STATUSES) {
      expect(within(legend).getByText(status.abbreviation)).toBeTruthy();
      expect(legend.textContent).toContain(status.term);
    }
    // The reservation reads as a contract, not a promise.
    expect(legend.textContent).toContain("Reserved — unlikely");
    expect(legend.textContent).toContain("Shown today");

    fireEvent.click(screen.getByRole("button", { name: /status/i }));
    expect(document.getElementById(legendId)).toBeNull();
  });
});

describe("the horizontal overflow edge", () => {
  it("fades the side that has hidden content, and neither side when nothing overflows", () => {
    expect(scrollEdges({ scrollLeft: 0, scrollWidth: 400, clientWidth: 400 })).toEqual({
      left: false,
      right: false,
    });
    expect(scrollEdges({ scrollLeft: 0, scrollWidth: 1200, clientWidth: 400 })).toEqual({
      left: false,
      right: true,
    });
    expect(scrollEdges({ scrollLeft: 400, scrollWidth: 1200, clientWidth: 400 })).toEqual({
      left: true,
      right: true,
    });
    expect(scrollEdges({ scrollLeft: 800, scrollWidth: 1200, clientWidth: 400 })).toEqual({
      left: true,
      right: false,
    });
  });
});
