import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SaveId } from "@cm-clone/contracts";
import { SquadScreen } from "../../../src/renderer/squad/SquadScreen.js";
import { SQUAD_SORT_OPTION_IDS } from "../../../src/renderer/squad/SquadSortSelect.js";
import { SQUAD_COLUMN_LABELS } from "../../../src/renderer/table/squad/squadColumns.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { ScreenToolbarSlot } from "../../../src/renderer/chrome/ScreenToolbarSlot.js";
import { resetActionHandlers } from "../../../src/renderer/actions/dispatch.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";
import { resetTableSessions } from "../../../src/renderer/table/tableState.js";
import { resetAnnouncements } from "../../../src/renderer/table/announcement.js";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { renderInRouter } from "../../setup/renderInRouter.js";
import { chooseToolbarOption } from "../../setup/toolbarPopover.js";
import { chooseOptionByLabel, pickOpenOption } from "../../setup/baseUiSelect.js";
import { squadPlayer, squadView, tacticsView } from "../../setup/squadFixtures.js";

const rid = (s: string) => SaveId.make(s);

/** Two players whose natural order and whose sorted orders differ: "Ann"/"Zoe"
 *  ascending by name is also their read order, so sorting by Wage or Age is
 *  what proves the control changed the ordering rather than the list re-rendering. */
const mountSquad = async (
  players: ReadonlyArray<ReturnType<typeof squadPlayer>>,
): Promise<void> => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string) =>
      method === "getSquad"
        ? { _tag: "Success", value: squadView(rid("me"), "Test FC", players) }
        : method === "getTactics"
          ? { _tag: "Success", value: tacticsView(rid("me"), "Test FC", players) }
          : { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: rid("s1") } },
  };
  renderInRouter(
    <RegistryProvider>
      <ScreenToolbarSlot />
      <SquadScreen saveId={rid("s1")} />
    </RegistryProvider>,
  );
  await screen.findByRole("heading", { name: /^Players/ });
};

/** The rows currently drawn, in the order the screen reads them — the position
 *  list's "Last, First" rows or the table's "First Last" cells, whichever layout
 *  is on screen. Both carry the same `data-focus-id` the roving focus uses, and
 *  neither the match-day bar nor any other control does. */
const rowNames = (): readonly string[] =>
  [...document.querySelectorAll("tbody button[data-focus-id]")].map(
    (button) => button.textContent ?? "",
  );

const sortTrigger = () => screen.getByRole("combobox", { name: "Sort squad" });

const reset = () => {
  cleanup();
  bindRouter({
    navigate: () => undefined,
    history: { back: () => undefined, forward: () => undefined, canGoBack: () => false },
  } as never);
  resetActionHandlers();
  resetScopeState();
  resetTableSessions();
  resetAnnouncements();
  window.localStorage.clear();
};

beforeEach(reset);
afterEach(reset);

describe("the Sort control's options", () => {
  // The list offers what the instruction asks for, and every option names a real
  // column through the one shared header map — a renamed or dropped column fails
  // here rather than as a raw id in the popup.
  it("offers the list's five columns then the Contract view's three, each with a header label", () => {
    expect(SQUAD_SORT_OPTION_IDS).toEqual([
      "positions",
      "name",
      "age",
      "overall",
      "condition",
      "wage",
      "contractEnds",
      "transferValue",
    ]);
    for (const columnId of SQUAD_SORT_OPTION_IDS) {
      expect(SQUAD_COLUMN_LABELS[columnId]).toBeTruthy();
    }
  });
});

describe("sorting the position list", () => {
  it("reorders the list by name, and re-choosing the same option reverses it", async () => {
    await mountSquad([
      { ...squadPlayer("p1", "Zoe", "ST"), lastName: "Zeta" },
      { ...squadPlayer("p2", "Ann", "ST"), lastName: "Alpha" },
    ]);
    expect(rowNames()).toEqual(["Zeta, Zoe", "Alpha, Ann"]);

    await chooseOptionByLabel("Sort squad", "Name");
    expect(rowNames()).toEqual(["Alpha, Ann", "Zeta, Zoe"]);

    // The same cycle a header gives: choosing the active option again flips it.
    await chooseOptionByLabel("Sort squad", "Name");
    expect(rowNames()).toEqual(["Zeta, Zoe", "Alpha, Ann"]);
  });

  it("orders by the numeric wage, not by the amount's text", async () => {
    // "10,000 Cr" precedes "9,000 Cr" as text; as an amount it follows.
    await mountSquad([
      { ...squadPlayer("p1", "Zoe", "ST"), contractWage: 10_000 },
      { ...squadPlayer("p2", "Ann", "ST"), contractWage: 9_000 },
    ]);

    await chooseOptionByLabel("Sort squad", "Wage");

    // The Wage column is hidden in this layout, and the list still orders by it:
    // the option set the shared sort, it did not add a second one.
    expect(rowNames()).toEqual(["Player, Ann", "Player, Zoe"]);
  });

  it("orders by pitch position, back to front and right-left-centre, not alphabetically", async () => {
    await mountSquad([
      squadPlayer("p1", "Stan", "ST"),
      squadPlayer("p2", "Amy", "AMC"),
      squadPlayer("p3", "Dee", "DC"),
      squadPlayer("p4", "Gus", "GK"),
      squadPlayer("p5", "Rob", "DR"),
      squadPlayer("p6", "Mia", "MC"),
      squadPlayer("p7", "Dom", "DM"),
      squadPlayer("p8", "Lou", "DL"),
    ]);

    await chooseOptionByLabel("Sort squad", "Position");

    expect(rowNames()).toEqual([
      "Player, Gus",
      "Player, Rob",
      "Player, Lou",
      "Player, Dee",
      "Player, Dom",
      "Player, Mia",
      "Player, Amy",
      "Player, Stan",
    ]);
  });

  it("clears the sort on the third choice, the whole cycle a header offers", async () => {
    await mountSquad([
      { ...squadPlayer("p1", "Zoe", "ST"), age: 30 },
      { ...squadPlayer("p2", "Ann", "ST"), age: 20 },
    ]);

    await chooseOptionByLabel("Sort squad", "Age");
    expect(rowNames()).toEqual(["Player, Ann", "Player, Zoe"]);

    await chooseOptionByLabel("Sort squad", "Age");
    expect(rowNames()).toEqual(["Player, Zoe", "Player, Ann"]);

    await chooseOptionByLabel("Sort squad", "Age");
    expect(sortTrigger().textContent).toContain("Sort");
    expect(rowNames()).toEqual(["Player, Zoe", "Player, Ann"]);
  });

  // Age is a number, and the two fixtures are chosen so its *text* order is the
  // wrong one: "30" precedes "9" as a string, so a column sorting on formatted
  // text puts the older player first.
  it("orders by age as a number, not as its two characters", async () => {
    await mountSquad([
      { ...squadPlayer("p1", "Zoe", "ST"), age: 30 },
      { ...squadPlayer("p2", "Ann", "ST"), age: 9 },
    ]);

    await chooseOptionByLabel("Sort squad", "Age");

    expect(rowNames()).toEqual(["Player, Ann", "Player, Zoe"]);
  });

  // Contract ends is a date, and the note fixes its shape: the last Season's
  // `seasonEndDate`, 31 May. These two are picked so their chronological order
  // and their formatted-text order disagree — rendered as "31 May 2027" and
  // "30 Jun 2028", a text sort reads "30" before "31" and puts the later
  // contract first. A column comparing ISO strings cannot.
  it("orders by contract end as a date, not as the text the column renders", async () => {
    await mountSquad([
      { ...squadPlayer("p1", "Zoe", "ST"), contractExpiryDate: "2028-06-30" },
      { ...squadPlayer("p2", "Ann", "ST"), contractExpiryDate: "2027-05-31" },
    ]);

    await chooseOptionByLabel("Sort squad", "Contract ends");
    expect(rowNames()).toEqual(["Player, Ann", "Player, Zoe"]);

    await chooseOptionByLabel("Sort squad", "Contract ends");
    expect(rowNames()).toEqual(["Player, Zoe", "Player, Ann"]);
  });
});

describe("the Sort trigger's focus", () => {
  // The toolbar re-registers itself whenever the sort changes, and registering
  // unmounts the old controls and mounts new ones. If that did not carry focus
  // across, a keyboard user who opens the control, picks, and reaches for the
  // keyboard again would be dumped on the body — and the third press of the
  // cycle, which clears the sort, would be unreachable without re-tabbing.
  it("returns focus to the trigger after a pick, across the re-register", async () => {
    await mountSquad([squadPlayer("p1", "Zoe", "ST"), squadPlayer("p2", "Ann", "ST")]);

    // jsdom does not move focus on Tab, so focusing the trigger stands in for
    // arriving on it by keyboard — which is the state under test.
    const trigger = sortTrigger();
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    // Enter on a native button is a click, and the Base UI trigger opens on the
    // click it gets from `useButton`'s native semantics. jsdom does not
    // synthesise that click from a keydown, so both halves are fired: the
    // keydown a keyboard user sends, then the click the browser would send for
    // it. Opening by click alone would skip the path under test.
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.click(trigger);
    await screen.findByRole("listbox");
    await pickOpenOption("Age");

    // The re-registration reuses this button rather than replacing it, and that
    // reuse is the whole mechanism: a fresh node would take focus with it, and
    // `document.activeElement` would be the body. Asserting the identity makes
    // the reason explicit, so a future change that starts remounting the
    // toolbar controls fails here with a diagnosis rather than as a mystery
    // focus bug three tests away.
    const after = sortTrigger();
    expect(after).toBe(trigger);
    expect(document.activeElement).toBe(after);
  });
});

describe("the Sort control belongs to the position list alone", () => {
  it("offers no Sort select in a table layout, whose headers sort instead", async () => {
    await mountSquad([squadPlayer("p1", "Zoe", "ST"), squadPlayer("p2", "Ann", "ST")]);
    expect(screen.queryByRole("combobox", { name: "Sort squad" })).not.toBeNull();

    await chooseToolbarOption("Squad view", "General Info");

    expect(screen.queryByRole("combobox", { name: "Sort squad" })).toBeNull();
    // The header is the control in this layout, and it still cycles. The table
    // reads a row as "First Last"; the list reads it "Last, First".
    const group = screen.getByRole("group", { name: "Squad" });
    fireEvent.click(within(group).getByRole("button", { name: "Name" }));
    expect(rowNames()).toEqual(["Ann Player", "Zoe Player"]);
  });

  it("keeps the sort it set across a switch to a table and back", async () => {
    await mountSquad([
      { ...squadPlayer("p1", "Zoe", "ST"), lastName: "Zeta" },
      { ...squadPlayer("p2", "Ann", "ST"), lastName: "Alpha" },
    ]);

    await chooseOptionByLabel("Sort squad", "Name");
    expect(rowNames()).toEqual(["Alpha, Ann", "Zeta, Zoe"]);

    // The table is drawing the same order, and coming back does not reset it.
    await chooseToolbarOption("Squad view", "General Info");
    expect(rowNames()).toEqual(["Ann Alpha", "Zoe Zeta"]);

    await chooseToolbarOption("Squad view", "Traditional");
    expect(sortTrigger().textContent).toContain("Name");
    expect(rowNames()).toEqual(["Alpha, Ann", "Zeta, Zoe"]);
  });
});
