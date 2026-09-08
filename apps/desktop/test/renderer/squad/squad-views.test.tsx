// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SaveId } from "@cm-clone/contracts";
import {
  FAMILIARITY_TIERS,
  GOALKEEPING_ATTRIBUTES,
  HIDDEN_ATTRIBUTES,
  OUTFIELD_ATTRIBUTES,
  STATURE_TIERS,
} from "@cm-clone/shared";
import { SquadScreen } from "../../../src/renderer/squad/SquadScreen.js";
import {
  DEFAULT_SQUAD_VIEW_ID,
  loadSquadViewId,
  SQUAD_VIEWS,
  SQUAD_VIEW_STORAGE_KEY,
  isSquadViewId,
} from "../../../src/renderer/squad/squadViews.js";
import {
  leftColumnLength,
  nextPositionIndex,
} from "../../../src/renderer/squad/SquadPositionList.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { resetActionHandlers } from "../../../src/renderer/actions/dispatch.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";
import { resetTableSessions } from "../../../src/renderer/table/tableState.js";
import { resetAnnouncements } from "../../../src/renderer/table/announcement.js";
import { chooseOptionByLabel } from "../../setup/baseUiSelect.js";

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

const player = (id: string, firstName: string, lastName: string) => ({
  id: rid(id),
  firstName,
  lastName,
  dateOfBirth: "1990-01-01",
  age: 25,
  attributes: attributes(12),
  positions: [
    { position: "DC", familiarity: FAMILIARITY_TIERS[0] },
    { position: "DL", familiarity: FAMILIARITY_TIERS[1] },
  ],
  overallRating: 80,
  positionRatings: { DC: 74, DL: 61 },
  condition: 100,
  trainingFocus: null,
  nationality: "Brazil",
  birthplace: "Santos",
});

const mountSquad = async (players: ReturnType<typeof player>[]): Promise<void> => {
  mockPreload(async (method) =>
    method === "getSquad"
      ? ({
          _tag: "Success",
          value: {
            club: { id: rid("me"), name: "Test FC", statureTier: STATURE_TIERS[0] },
            players,
          },
        } as never)
      : ({ _tag: "Failure", error: NOT_FOUND } as never),
  );
  render(
    <RegistryProvider>
      <SquadScreen saveId={rid("s1")} />
    </RegistryProvider>,
  );
  await screen.findByRole("heading", { name: /^Players/ });
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

describe("the Squad view catalogue", () => {
  it("opens on the position list and offers every column preset beside it", () => {
    expect(DEFAULT_SQUAD_VIEW_ID).toBe("positions");
    expect(SQUAD_VIEWS[0]).toMatchObject({ id: "positions", layout: "list" });
    expect(SQUAD_VIEWS.filter((view) => view.layout === "table").length).toBe(
      SQUAD_VIEWS.length - 1,
    );
    // Every table view names the preset that supplies its columns, so a view
    // can never draw a table with no column set behind it.
    for (const view of SQUAD_VIEWS.slice(1)) expect(view.presetId).toBe(view.id);
  });

  it("reads an unknown, renamed or absent stored view as the default", () => {
    expect(loadSquadViewId()).toBe(DEFAULT_SQUAD_VIEW_ID);
    window.localStorage.setItem(SQUAD_VIEW_STORAGE_KEY, "contract-view-from-2003");
    expect(loadSquadViewId()).toBe(DEFAULT_SQUAD_VIEW_ID);
    expect(isSquadViewId("contract-view-from-2003")).toBe(false);
  });
});

describe("the position list's two-column geometry", () => {
  it("puts the extra player at the foot of the left column", () => {
    expect(leftColumnLength(0)).toBe(0);
    expect(leftColumnLength(1)).toBe(1);
    expect(leftColumnLength(7)).toBe(4);
    expect(leftColumnLength(8)).toBe(4);
  });

  it("roves down a column, crosses at the same offset, and stays put at the right edge", () => {
    // Eight players: indexes 0-3 left, 4-7 right.
    expect(nextPositionIndex("ArrowDown", 0, 8)).toBe(1);
    expect(nextPositionIndex("ArrowUp", 0, 8)).toBe(7);
    expect(nextPositionIndex("ArrowRight", 1, 8)).toBe(5);
    expect(nextPositionIndex("ArrowLeft", 5, 8)).toBe(1);
    expect(nextPositionIndex("ArrowRight", 5, 8)).toBe(5);
    expect(nextPositionIndex("ArrowLeft", 1, 8)).toBe(1);
    expect(nextPositionIndex("Home", 5, 8)).toBe(0);
    expect(nextPositionIndex("End", 0, 8)).toBe(7);
    expect(nextPositionIndex("q", 0, 8)).toBeNull();
    expect(nextPositionIndex("ArrowDown", 0, 0)).toBeNull();
  });

  // An odd count has a longer left column, so the last left row has no partner
  // to cross to; it lands on the last row instead of past the end.
  it("clamps a right-arrow that would leave the list", () => {
    expect(nextPositionIndex("ArrowRight", 2, 5)).toBe(4);
  });
});

describe("choosing a view", () => {
  it("draws the squad as a two-column list of names and positions, not a table", async () => {
    await mountSquad([player("p1", "Alan", "Shearer"), player("p2", "Bobby", "Moore")]);

    expect(screen.getByRole("heading", { name: "Players (Position(s))" })).toBeTruthy();
    expect(document.querySelector("table")).toBeNull();
    expect(screen.getByText(/Shearer, Alan/)).toBeTruthy();
    expect(screen.getByText(/Moore, Bobby/)).toBeTruthy();
    // One tab stop into the sequence, as on the table (AC-28).
    const nameButtons = [...document.querySelectorAll("button[data-focus-id]")];
    expect(nameButtons.length).toBe(2);
    expect(nameButtons.filter((b) => b.getAttribute("tabindex") === "0").length).toBe(1);
  });

  it("swaps the layout and the information set, names it in the heading, and remembers it", async () => {
    await mountSquad([player("p1", "Alan", "Shearer")]);

    await chooseOptionByLabel("Squad view", "Personal details");

    expect(screen.getByRole("heading", { name: "Players (Personal details)" })).toBeTruthy();
    expect(document.querySelector("table")).not.toBeNull();
    expect(screen.getByRole("columnheader", { name: "Nationality" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Birthplace" })).toBeTruthy();
    expect(screen.getByText("Brazil")).toBeTruthy();
    expect(screen.getByText("Santos")).toBeTruthy();
    // None is a first-class Training Focus value, spelled out rather than blank.
    expect(screen.getByText("None")).toBeTruthy();
    expect(loadSquadViewId()).toBe("personal");
  });
});
