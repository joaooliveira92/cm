/**
 * The soft Position context, on the screen: selecting an empty starter slot in the match-day bar
 * brings the players who can fill it to the top of the roster and marks them, and every way out of
 * that selection puts the roster back exactly as it was.
 *
 * The ordering rules themselves are unit-tested in `lineup-fit.test.ts` and the keyboard contract
 * in `lineup-fit-keyboard.test.tsx`. This file is about the wiring — that the selection reaches
 * both layouts, that it changes no filter, and that it survives nothing it should not.
 */
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
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
import { saveSquadViewId } from "../../../src/renderer/squad/squadViews.js";
import { SQUAD_PREFERENCES_STORAGE_KEY } from "../../../src/renderer/table/columnPreferences.js";
import {
  presetById,
  SQUAD_PROTECTED_COLUMN_IDS,
} from "../../../src/renderer/table/features/visibility.js";
import { SQUAD_FIT_COLUMN_ID } from "../../../src/renderer/table/squad/squadColumns.js";

const rid = (s: string) => SaveId.make(s);

const NOT_FOUND = { _tag: "SaveNotFoundError", id: rid("s1") };

const attributes = (value: number): Record<string, number> => ({
  ...Object.fromEntries(OUTFIELD_ATTRIBUTES.map((a) => [a, value])),
  ...Object.fromEntries(GOALKEEPING_ATTRIBUTES.map((a) => [a, value])),
  ...Object.fromEntries(HIDDEN_ATTRIBUTES.map((a) => [a, value])),
});

/** One player, whose Name is `<first> <last>` and whose Position carries an explicit tier. */
const player = (
  id: string,
  lastName: string,
  position: string,
  familiarity: FamiliarityTier,
): unknown => ({
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

/** Deliberately NOT in fit order: the two DCs that share a tier sit apart in the input, and a
 *  non-fitter sits between them, so a re-order that merely grouped them would be caught. */
const SQUAD = [
  player("p1", "Alpha", "DC", "natural"),
  player("p2", "Bravo", "ST", "natural"),
  player("p3", "Charlie", "DC", "unfamiliar"),
  player("p4", "Delta", "DM", "natural"),
  player("p5", "Echo", "DC", "competent"),
  player("p6", "Foxtrot", "GK", "natural"),
];

const BY_NAME: ReadonlyMap<string, string> = new Map([
  ["Alpha", "p1"],
  ["Bravo", "p2"],
  ["Charlie", "p3"],
  ["Delta", "p4"],
  ["Echo", "p5"],
  ["Foxtrot", "p6"],
]);

/** Nobody is on the lineup, so every starter slot — the two DCs included — is empty and
 *  selectable. The bar says the lineup is not saved yet, which is true and irrelevant here. */
const EMPTY_TACTIC = {
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
            tactic: EMPTY_TACTIC,
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
  await screen.findByRole("button", { name: "GK slot" });
};

/** The roster in the order it is DRAWN, read off each row's focus id. Both layouts give a row
 *  that id, and the id carries the player, so this is the visual order rather than the data
 *  order — and it doubles as proof that the roving-focus universe walks what the eye sees. */
const drawnOrder = (): string[] =>
  [...document.querySelectorAll("[data-focus-id]")]
    .map((element) => element.getAttribute("data-focus-id") ?? "")
    .filter((id) => id.startsWith("squad.squadTable."))
    .map((id) => id.slice("squad.squadTable.".length).split(".")[0]!);

/** The drawn order as last names, which is what an assertion reads. */
const drawnNames = (): string[] =>
  drawnOrder().map((id) => [...BY_NAME.entries()].find(([, v]) => v === id)?.[0] ?? id);

const UNSORTED = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot"];
/** Natural before Competent before Unfamiliar, then everyone who cannot play DC. */
const FITTING_FIRST = ["Alpha", "Echo", "Charlie", "Bravo", "Delta", "Foxtrot"];

/** 4-4-2 names DC twice, so the slot under test is found by position, not by index. */
const anEmptyDcSlot = (): HTMLElement => screen.getAllByRole("button", { name: "DC slot" })[0]!;

/** The mark's accessible text for a player, or null when that player is not marked. Scoped to the
 *  mark itself: the leading match-day indicator in the same row is also an `.sr-only` span, and
 *  asking the row for "the screen-reader text" would find that one first. */
const markFor = (lastName: string): string | null => {
  const row = document.querySelector(`[data-focus-id="squad.squadTable.${BY_NAME.get(lastName)}"]`);
  const container =
    row?.tagName === "BUTTON" ? (row.closest("tr") ?? null) : (row?.parentElement ?? null);
  return container?.querySelector("[data-testid='squad-fit-mark'] .sr-only")?.textContent ?? null;
};

/** Every roster row element, whichever layout drew it. */
const rosterRows = (): Element[] => [...document.querySelectorAll("tbody tr")];

const selectDc = (): void => {
  fireEvent.click(anEmptyDcSlot());
};

const contextLine = (): HTMLElement => screen.getByTestId("squad-fit-context");

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

/** Each layout is a separate mount: the ticket requires the behaviour of both, and a bug that
 *  only one of them had would not show if they shared a render. */
const eachLayout = (name: string, run: () => Promise<void>): void => {
  for (const view of ["positions", "general"] as const) {
    it(`${name} (${view} view)`, async () => {
      saveSquadViewId(view);
      await run();
    });
  }
};

describe("selecting an empty starter slot", () => {
  eachLayout("brings every fitting player above every player who cannot fill it, and hides nobody", async () => {
    await mountSquadScreen();
    expect(drawnNames()).toEqual(UNSORTED);

    selectDc();

    expect(drawnNames()).toEqual(FITTING_FIRST);
    // Nobody left the screen: the roster is longer, not smaller.
    expect(drawnOrder()).toHaveLength(SQUAD.length);
  });

  eachLayout("marks the fitting players and leaves the others unmarked", async () => {
    await mountSquadScreen();
    selectDc();

    expect(markFor("Alpha")).toBe("Fits DC, Natural");
    expect(markFor("Echo")).toBe("Fits DC, Competent");
    expect(markFor("Charlie")).toBe("Fits DC, Unfamiliar");
    expect(markFor("Bravo")).toBeNull();
    expect(markFor("Foxtrot")).toBeNull();
  });

  eachLayout("says which position it is showing, and offers a way to stop", async () => {
    await mountSquadScreen();
    expect(screen.queryByTestId("squad-fit-context")).toBeNull();

    selectDc();

    expect(contextLine().textContent).toContain("Showing players for DC");
    expect(within(contextLine()).getByRole("button", { name: "Clear" })).toBeTruthy();
  });

  it("changes no filter, and so cannot reach the URL", async () => {
    await mountSquadScreen();
    const urlBefore = window.location.search;

    selectDc();

    // A Position filter would be a `position` clause, and this is not one. Two things say so: the
    // roster still shows the keeper, and the toolbar never grows the control that clears a filter
    // (it renders only while one is set).
    expect(drawnOrder()).toHaveLength(SQUAD.length);
    expect(markFor("Foxtrot")).toBeNull();
    expect(document.querySelector("[data-action-id='clear-squad-filters']")).toBeNull();
    expect(window.location.search).toBe(urlBefore);
  });
});

describe("clearing the context", () => {
  eachLayout("restores the previous order exactly when the slot is selected again", async () => {
    await mountSquadScreen();
    const before = drawnNames();
    selectDc();
    expect(drawnNames()).not.toEqual(before);

    selectDc();

    expect(drawnNames()).toEqual(before);
    expect(screen.queryByTestId("squad-fit-context")).toBeNull();
    expect(markFor("Alpha")).toBeNull();
  });

  eachLayout("restores the previous order exactly on Escape", async () => {
    await mountSquadScreen();
    const before = drawnNames();
    selectDc();

    fireEvent.keyDown(anEmptyDcSlot(), { key: "Escape" });

    expect(drawnNames()).toEqual(before);
    expect(screen.queryByTestId("squad-fit-context")).toBeNull();
  });

  eachLayout("restores the previous order exactly when the slot is filled", async () => {
    await mountSquadScreen();
    const before = drawnNames();
    selectDc();
    expect(drawnNames()).toEqual(FITTING_FIRST);

    // Filling the slot is a drop from the roster — any player, fitting or not.
    dragOnto(screen.getByRole("button", { name: /Bravo, Pep|Bravo$/ }), anEmptyDcSlot());

    await waitFor(() => expect(drawnNames()).toEqual(before));
    expect(screen.queryByTestId("squad-fit-context")).toBeNull();
  });

  eachLayout("restores the previous order exactly on the visible Clear control", async () => {
    await mountSquadScreen();
    const before = drawnNames();
    selectDc();

    fireEvent.click(within(contextLine()).getByRole("button", { name: "Clear" }));

    expect(drawnNames()).toEqual(before);
    expect(screen.queryByTestId("squad-fit-context")).toBeNull();
  });

  eachLayout("moves the selection to another slot rather than refusing to change", async () => {
    await mountSquadScreen();
    selectDc();
    expect(contextLine().textContent).toContain("Showing players for DC");

    // 4-4-2 names ST twice, like DC.
    fireEvent.click(screen.getAllByRole("button", { name: "ST slot" })[0]!);

    expect(contextLine().textContent).toContain("Showing players for ST");
  });

  it("does not come back after the screen unmounts — it is session state, not a preference", async () => {
    await mountSquadScreen();
    selectDc();
    expect(screen.getByTestId("squad-fit-context")).toBeTruthy();

    cleanup();
    await mountSquadScreen();

    expect(screen.queryByTestId("squad-fit-context")).toBeNull();
    expect(drawnNames()).toEqual(UNSORTED);
  });

  it("writes nothing to the stored column preferences, so the view a manager chose survives", async () => {
    // Seeded BEFORE the mount, through the exported key, and set to a view whose column set is
    // NOT the default. Both halves matter. A literal key string that appears nowhere in `src/`
    // reads `null` on both sides of the comparison, so the assertion degrades to
    // `expect(null).toBe(null)` and passes whatever the code does; and a default blob would be
    // reproduced byte-for-byte by a no-op write, so it cannot tell a write from no write. The
    // Contract view also puts the screen on the table layout, which is the layout whose column
    // set `applyPreferences` owns — the one write path a fit column would plausibly reach for.
    const contract = presetById("contract")!;
    window.localStorage.setItem(
      SQUAD_PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        visibleColumnIds: contract.visibleColumnIds,
        pinnedColumnIds: SQUAD_PROTECTED_COLUMN_IDS,
        activePresetId: contract.id,
      }),
    );
    saveSquadViewId("contract");

    await mountSquadScreen();
    // The app reconciles a stored blob on load and may write the reconciled result back, so the
    // baseline is taken AFTER the mount: that write is the app's, not the fit context's. Only
    // what the selection adds is in scope.
    const before = window.localStorage.getItem(SQUAD_PREFERENCES_STORAGE_KEY);
    expect(before).not.toBeNull();
    expect(screen.getByRole("columnheader", { name: "Wage" })).toBeTruthy();

    selectDc();

    // Byte-identical, not merely "still parses": a write that happened to reproduce the same shape
    // would survive a weaker check, and these bytes are what decide the view after a restart.
    expect(window.localStorage.getItem(SQUAD_PREFERENCES_STORAGE_KEY)).toBe(before);
    // The fit column is never something a preference owns, so it cannot have been persisted into
    // the stored universe as a column id a later load would restore.
    expect(before).not.toContain(SQUAD_FIT_COLUMN_ID);
    // And the preset the blob named is still the view on screen. A dropped blob would be silently
    // replaced by the default preset on the next load, which is the failure this catches that a
    // storage-only assertion cannot see.
    expect(screen.getByRole("columnheader", { name: "Wage" })).toBeTruthy();
    expect(screen.queryByRole("columnheader", { name: "Nationality" })).toBeNull();
  });
});

describe("the fit mark", () => {
  it("carries an accessible name that is not the star", async () => {
    await mountSquadScreen();
    selectDc();

    const marks = screen.getAllByTestId("squad-fit-mark");
    expect(marks).toHaveLength(3);
    expect(marks.map((mark) => mark.querySelector(".sr-only")!.textContent)).toEqual([
      "Fits DC, Natural",
      "Fits DC, Competent",
      "Fits DC, Unfamiliar",
    ]);
    // The star itself is decoration: announcing "black star" would be the wrong answer.
    expect(marks[0]!.querySelector("[aria-hidden]")!.textContent).toBe("★");
  });

  eachLayout("adds no tab stop to a row", async () => {
    await mountSquadScreen();
    selectDc();

    const rows = rosterRows();
    expect(rows).toHaveLength(SQUAD.length);
    for (const row of rows) {
      const focusable = [...row.querySelectorAll("button, a[href], input, [tabindex]")];
      // One focusable control per row, the roving name button: the mark is a read on the row,
      // not a control on it, so it adds neither a second stop nor a bare tabindex.
      expect(focusable).toHaveLength(1);
      expect(focusable[0]!.hasAttribute("data-focus-id")).toBe(true);
    }
    expect(document.querySelectorAll("[data-testid='squad-fit-mark'][tabindex]")).toHaveLength(0);
    expect(document.querySelectorAll("[data-testid='squad-fit-mark'] button")).toHaveLength(0);
  });
});

/** jsdom has no DataTransfer; a drop needs a fake that remembers what a drag wrote. */
const dragOnto = (source: Element, target: Element): void => {
  const store = new Map<string, string>();
  const dataTransfer = {
    effectAllowed: "move",
    setData: (type: string, value: string) => store.set(type, value),
    getData: (type: string) => store.get(type) ?? "",
  };
  fireEvent.dragStart(source, { dataTransfer });
  fireEvent.dragOver(target, { dataTransfer });
  fireEvent.drop(target, { dataTransfer });
};
