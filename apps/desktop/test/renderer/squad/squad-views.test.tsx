import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
import { dispatchAction, resetActionHandlers } from "../../../src/renderer/actions/dispatch.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";
import { resetTableSessions } from "../../../src/renderer/table/tableState.js";
import { resetAnnouncements } from "../../../src/renderer/table/announcement.js";
import { renderInRouter } from "../../setup/renderInRouter.js";
import { ScreenToolbarSlot } from "../../../src/renderer/chrome/ScreenToolbarSlot.js";
import { RegisteredScreenBar } from "../registered-screen-bar.js";
import { chooseToolbarOption } from "../../setup/toolbarPopover.js";
import { chooseOptionByLabel } from "../../setup/baseUiSelect.js";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";

const rid = (s: string) => SaveId.make(s);

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const NOT_FOUND = { _tag: "SaveNotFoundError", id: rid("s1") };

/** An all-empty 4-4-2 Tactic: no starters, no named subs. The bar renders this as 18 empty slots
 *  with the whole squad as the draggable pool. */
const emptyTactic = () => ({
  formation: "4-4-2" as const,
  slots: FORMATION_SLOTS["4-4-2"].map((position) => ({
    position,
    role: POSITION_ROLES[position],
    playerId: "",
  })),
  bench: [null, null, null, null, null, null, null],
  mentality: "balanced" as const,
  tempo: "normal" as const,
  pressing: "medium" as const,
});

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
  positionLabel: "D LC",
  canPlay: ["D C", "D L"],
  positionOrder: 8,
  overallRating: 80,
  positionRatings: { DC: 74, DL: 61 },
  suitability: {},
  retrainingTarget: null,
  condition: 100,
  trainingFocus: null,
  nationality: "Brazil",
  birthplace: "Santos",
  foreign: false,
  contractWage: 9000 as number | null,
  contractExpiryDate: "2028-06-30" as string | null,
  transferValue: 1200000,
});

const mountSquad = async (
  players: ReturnType<typeof player>[],
  tactic: unknown = emptyTactic(),
): Promise<void> => {
  mockPreload(async (method) =>
    method === "getSquad"
      ? ({
          _tag: "Success",
          value: {
            club: { id: rid("me"), name: "Test FC", statureTier: STATURE_TIERS[0] },
            players,
          },
        } as never)
      : method === "getTactics"
        ? ({
            _tag: "Success",
            value: {
              club: { id: rid("me"), name: "Test FC", statureTier: STATURE_TIERS[0] },
              squad: players,
              tactic,
              revision: 0,
            },
          } as never)
        : ({ _tag: "Failure", error: NOT_FOUND } as never),
  );
  renderInRouter(
    <RegistryProvider>
      <ScreenToolbarSlot />
      <SquadScreen saveId={rid("s1")} />
      <RegisteredScreenBar />
    </RegistryProvider>,
  );
  await screen.findByRole("heading", { name: /^Players/ });
};

let navigateSpy: ReturnType<typeof vi.fn>;

const reset = () => {
  cleanup();
  navigateSpy = vi.fn();
  bindRouter({
    navigate: navigateSpy,
    history: { back: vi.fn(), forward: vi.fn(), canGoBack: () => false },
  } as never);
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

  it("lists the views in the order the selector shows them", () => {
    expect(SQUAD_VIEWS.map((view) => view.label)).toEqual([
      "Traditional",
      "General Info",
      "Contract",
      "Physical",
      "Mental",
      "Goalkeeping",
      "Defensive",
      "Attacking",
    ]);
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
  it("draws the squad as two headerless tables of names and positions", async () => {
    await mountSquad([player("p1", "Alan", "Shearer"), player("p2", "Bobby", "Moore")]);


    expect(document.querySelectorAll("table[data-squad-layout='positions']")).toHaveLength(2);
    expect(document.querySelector("thead")).toBeNull();
    expect(screen.getByText(/Shearer, Alan/)).toBeTruthy();
    expect(screen.getByText(/Moore, Bobby/)).toBeTruthy();
    // One tab stop into the sequence, as on the table (AC-28).
    const nameButtons = [...document.querySelectorAll("button[data-focus-id]")];
    expect(nameButtons.length).toBe(2);
    expect(nameButtons.filter((b) => b.getAttribute("tabindex") === "0").length).toBe(1);
  });

  it("reads each row as match-day slot, status badge, name, positions", async () => {
    await mountSquad([{ ...player("p1", "Alan", "Shearer"), foreign: true }]);

    const name = screen.getByText(/Shearer, Alan/);
    const row = name.closest("tr")!;
    const badge = within(row).getByText("Fgn");
    expect(badge.getAttribute("aria-hidden")).toBe("true");
    expect(within(row).getByText("Foreign player")).toBeTruthy();
    const order = [
      within(row).getByText("Not selected"),
      badge,
      name,
      within(row).getByText("D LC"),
    ];
    for (let i = 1; i < order.length; i++) {
      expect(
        order[i - 1]!.compareDocumentPosition(order[i]!) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  it("names the screen with a level-one Squad heading in either layout", async () => {
    await mountSquad([player("p1", "Alan", "Shearer")]);
    expect(screen.getByRole("heading", { level: 1, name: "Squad" })).toBeTruthy();

    await chooseToolbarOption("Squad view", "General Info");
    expect(screen.getByRole("heading", { level: 1, name: "Squad" })).toBeTruthy();
  });

  it("swaps the layout and the information set, names it in the heading, and remembers it", async () => {
    await mountSquad([player("p1", "Alan", "Shearer")]);

    await chooseToolbarOption("Squad view", "General Info");

    expect(screen.getByRole("heading", { name: "Players (General Info)" })).toBeTruthy();
    expect(document.querySelector("table")).not.toBeNull();
    expect(screen.getByRole("columnheader", { name: "Nationality" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Birthplace" })).toBeTruthy();
    expect(screen.getByText("Brazil")).toBeTruthy();
    expect(screen.getByText("Santos")).toBeTruthy();
    // None is a first-class Training Focus value, spelled out rather than blank.
    expect(screen.getByText("None")).toBeTruthy();
    expect(loadSquadViewId()).toBe("general");
  });

  it("draws the table views at the position list's row height and name size", async () => {
    await mountSquad([player("p1", "Alan", "Shearer")]);
    const listRow = screen.getByText(/Shearer, Alan/).closest("tr")!;
    expect(listRow.classList.contains("h-9")).toBe(true);

    await chooseToolbarOption("Squad view", "General Info");

    const name = document.querySelector("tbody button[data-focus-id]")!;
    expect(name.closest("tr")!.classList.contains("h-9")).toBe(true);
    expect(name.classList.contains("text-body")).toBe(true);
  });

  it("leaves the pinned columns transparent until the table is scrolled under them", async () => {
    await mountSquad([player("p1", "Alan", "Shearer")]);
    await chooseToolbarOption("Squad view", "General Info");

    // jsdom lays nothing out, so the table reads as unscrolled.
    const pinned = [...document.querySelectorAll<HTMLElement>("th, td")].filter(
      (cell) => cell.style.position === "sticky",
    );
    expect(pinned.length).toBeGreaterThan(0);
    expect(pinned.some((cell) => cell.classList.contains("bg-bg-base"))).toBe(false);
  });

  it("says which view is showing in the bottom bar, not in the roster's status line", async () => {
    await mountSquad([player("p1", "Alan", "Shearer")]);

    await chooseToolbarOption("Squad view", "General Info");
    // The match-day lineup bar is a footer too; the shell's bar is the last one.
    const bar = screen.getAllByRole("contentinfo").at(-1)!;
    expect(bar.textContent).toContain("Showing the General Info columns.");

    await chooseToolbarOption("Squad view", "Traditional");
    expect(bar.textContent).toContain("Showing the squad by Traditional.");
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("says what every other toolbar and Actions-menu command did in the bottom bar too", async () => {
    await mountSquad([player("p1", "Alan", "Shearer"), player("p2", "Bob", "Moore")]);
    const bar = screen.getAllByRole("contentinfo").at(-1)!;

    await chooseToolbarOption(/Filter squad by position/, "D C");
    expect(bar.textContent).toContain("2 players match the current filters.");

    await chooseToolbarOption(/Filter squad by status/, "Tired");
    expect(bar.textContent).toContain("0 players match the current filters.");

    await chooseOptionByLabel("Sort squad", "Name");
    expect(bar.textContent).toContain("Sorted by Name, ascending.");

    await act(() => dispatchAction("assistant-pick-lineup"));
    expect(bar.textContent).toContain("The squad is too small to field a 4-4-2.");
    expect(screen.getByRole("status").textContent).toBe("");
  });
});

describe("the squad screen mounts the match-day bar", () => {
  it("renders the eighteen empty slots and says the lineup is not saved on a fresh squad", async () => {
    await mountSquad([player("p1", "Alan", "Shearer")]);

    // The eleven formation slots, labelled by the position they fill — a position repeats when
    // the formation calls for more than one of it (4-4-2 has two DCs and two MCs).
    for (const position of new Set(FORMATION_SLOTS["4-4-2"])) {
      const expected = FORMATION_SLOTS["4-4-2"].filter((p) => p === position).length;
      expect(screen.getAllByRole("button", { name: `${position} slot` })).toHaveLength(
        expected,
      );
    }
    // The bench is SB1..SB7.
    for (const label of ["SB1", "SB2", "SB3", "SB4", "SB5", "SB6", "SB7"]) {
      expect(screen.getByRole("button", { name: `${label} slot` })).toBeTruthy();
    }
    // An empty lineup leaves the whole squad in the roster, ready to be dragged in.
    expect(screen.getByRole("button", { name: "Shearer, Alan" })).toBeTruthy();
    // Lineups autosave, so there is no Save button; an empty lineup says what saving waits on.
    expect(screen.queryByRole("button", { name: "Save Lineup" })).toBeNull();
    expect(screen.getByText("Not saved yet: pick 11 more starters.")).toBeTruthy();
  });
});

describe("the leading match-day indicator", () => {
  it("reports the lineup slot each row is selected into: playing, on the bench, or not selected", async () => {
    // Shearer is handed a starter slot (GK), Moore a bench slot, Doe nothing.
    const lineupTactic = () => ({
      formation: "4-4-2" as const,
      slots: FORMATION_SLOTS["4-4-2"].map((position, index) => ({
        position,
        role: POSITION_ROLES[position],
        playerId: index === 0 ? rid("p1") : "",
      })),
      bench: [rid("p2"), null, null, null, null, null, null],
      mentality: "balanced" as const,
      tempo: "normal" as const,
      pressing: "medium" as const,
    });
    await mountSquad(
      [player("p1", "Alan", "Shearer"), player("p2", "Bobby", "Moore"), player("p3", "John", "Doe")],
      lineupTactic(),
    );

    // Playing reads the slot code the bar shows for the same slot; the bench
    // reads the slot it sits in (SB1..); an unselected player gets a hollow box.
    // The code is decoration (aria-hidden); the state is the text a screen reader reads.
    const codeOf = (state: string) =>
      screen.getByText(state).parentElement!.querySelector('[aria-hidden="true"]')!.textContent;
    expect(codeOf("Playing (GK)")).toBe("GK");
    expect(codeOf("On the bench")).toBe("SB1");
    expect(codeOf("Not selected")).toBe("");
    // Read-only, so not a control: the row's one tab stop stays the name button.
    expect(screen.queryByRole("button", { name: /Playing|On the bench|Not selected/ })).toBeNull();
  });
});

describe("the position list's player names are the way into the player screen", () => {
  /** The list is the layout the Squad screen opens on, so this is the click the game is most
   *  often asked for: CM 03/04 put the player screen behind the name, and so does this. */
  it("clicking a name opens that player's Profile", async () => {
    await mountSquad([player("p1", "Alan", "Shearer"), player("p2", "Bobby", "Moore")]);

    fireEvent.click(screen.getByRole("button", { name: "Moore, Bobby" }));

    expect(navigateSpy).toHaveBeenCalledWith(expect.objectContaining({
      to: "/career/$saveId/player/$playerId/profile",
      params: expect.objectContaining({ playerId: "p2" }),
    }));
  });
});

describe("the Contract view", () => {
  const namesInOrder = (): string[] =>
    [...document.querySelectorAll("tbody button[data-focus-id]")].map((b) => b.textContent ?? "");

  it("shows wage, contract end and Transfer Value, and a dash where there is no Contract", async () => {
    await mountSquad([
      player("p1", "Alan", "Shearer"),
      { ...player("p2", "Bobby", "Moore"), contractWage: null, contractExpiryDate: null },
    ]);

    await chooseToolbarOption("Squad view", "Contract");

    expect(screen.getByRole("heading", { name: "Players (Contract)" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Wage" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Contract ends" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Transfer Value" })).toBeTruthy();
    expect(screen.getByText(`${(9000).toLocaleString()} Cr`)).toBeTruthy();
    expect(screen.getByText("30 Jun 2028")).toBeTruthy();
    expect(screen.getAllByText("—").length).toBe(2);
  });

  it("sorts Wage by amount and Contract ends by date, not by the text shown", async () => {
    await mountSquad([
      { ...player("p1", "Alan", "Shearer"), contractWage: 10_000, contractExpiryDate: "2029-01-15" },
      { ...player("p2", "Bobby", "Moore"), contractWage: 9000, contractExpiryDate: "2028-12-31" },
    ]);
    await chooseToolbarOption("Squad view", "Contract");
    const group = screen.getByRole("group", { name: "Squad" });

    // "10,000 Cr" precedes "9,000 Cr" as text; as an amount it follows.
    fireEvent.click(within(group).getByRole("button", { name: "Wage" }));
    expect(namesInOrder()).toEqual(["Bobby Moore", "Alan Shearer"]);

    // "15 Jan 2029" precedes "31 Dec 2028" as text; as a date it follows.
    fireEvent.click(within(group).getByRole("button", { name: "Contract ends" }));
    expect(namesInOrder()).toEqual(["Bobby Moore", "Alan Shearer"]);
  });
});
