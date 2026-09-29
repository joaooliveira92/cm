/**
 * "then by the current sort" — the one clause of ticket 05 that no other spec in this change
 * proves. `lineup-fit.test.ts` pins the ranking and `lineup-fit-context.test.tsx` pins the wiring,
 * but every one of them reads the DEFAULT order, where the sort is a no-op. Re-ordering the data
 * before TanStack saw it instead of re-ordering TanStack's sorted output produces byte-identical
 * results in all of them, and only differs once a real sort is in force — because a later sort
 * re-interleaves the tiers.
 *
 * So the squad here is built so that a re-order-then-sort is *visibly* wrong:
 *
 *   wire order   Bravo 30 DC natural · Alpha 24 DC natural · Zulu 22 DM · Yankee 26 DC competent
 *                · Xray 19 ST · Whiskey 35 DC unfamiliar
 *
 * The Competent DC (26) sorts BETWEEN the two Natural DCs (24, 30). Sort first and bucket, the
 * tiers stay contiguous; bucket first and sort, they shatter — which is what makes this fixture
 * able to fail rather than merely pass. Both buckets that hold more than one player hold players of
 * DIFFERENT ages, so "internally sorted" is a real claim about each bucket and not a tautology
 * about a one-element list.
 */
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SaveId } from "@cm-clone/contracts";
import { type FamiliarityTier } from "@cm-clone/shared";
import { SquadScreen } from "../../../src/renderer/squad/SquadScreen.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { ScreenToolbarSlot } from "../../../src/renderer/chrome/ScreenToolbarSlot.js";
import { resetActionHandlers } from "../../../src/renderer/actions/dispatch.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";
import { resetTableSessions } from "../../../src/renderer/table/tableState.js";
import { resetAnnouncements } from "../../../src/renderer/table/announcement.js";
import { renderInRouter } from "../../setup/renderInRouter.js";
import { chooseOptionByLabel } from "../../setup/baseUiSelect.js";
import { attributes, squadView, tacticsView } from "../../setup/squadFixtures.js";
import { saveSquadViewId } from "../../../src/renderer/squad/squadViews.js";
import type { SquadViewId } from "../../../src/renderer/squad/squadViews.js";

const rid = (s: string) => SaveId.make(s);

const player = (
  id: string,
  lastName: string,
  age: number,
  position: string,
  familiarity: FamiliarityTier,
): unknown => ({
  id: rid(id),
  firstName: "Pep",
  lastName,
  dateOfBirth: "1990-01-01",
  age,
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

/** Wire order, which is the order the table is handed. Not already age-sorted, and the fitters
 *  are interleaved with the rest, so neither "grouped them" nor "left them alone" can pass. */
const SQUAD = [
  player("p1", "Bravo", 30, "DC", "natural"),
  player("p2", "Alpha", 24, "DC", "natural"),
  player("p3", "Zulu", 22, "DM", "natural"),
  player("p4", "Yankee", 26, "DC", "competent"),
  player("p5", "Xray", 19, "ST", "natural"),
  player("p6", "Whiskey", 35, "DC", "unfamiliar"),
];

/** The rank each player would be given for a DC slot: 0 natural, 1 competent, 2 unfamiliar,
 *  3 no DC at all. Written out rather than derived, so the expectation does not run through the
 *  ranking code it is meant to check. */
const FIT_RANK: Readonly<Record<string, number>> = {
  Bravo: 0,
  Alpha: 0,
  Yankee: 1,
  Whiskey: 2,
  Zulu: 3,
  Xray: 3,
};

const AGE: Readonly<Record<string, number>> = {
  Bravo: 30,
  Alpha: 24,
  Zulu: 22,
  Yankee: 26,
  Xray: 19,
  Whiskey: 35,
};

const BY_ID: ReadonlyMap<string, string> = new Map(
  SQUAD.map((p, index) => [`p${index + 1}`, (p as { lastName: string }).lastName]),
);

/** Age ascending. Every age is distinct, so the order is total and nothing rests on stability. */
const BY_AGE_ASC: readonly string[] = ["Xray", "Zulu", "Alpha", "Yankee", "Bravo", "Whiskey"];

/** Age ascending, then DC fitters by tier, each tier internally still in age order. */
const FIT_OVER_AGE_ASC: readonly string[] = ["Alpha", "Bravo", "Yankee", "Whiskey", "Xray", "Zulu"];

const mount = async (): Promise<void> => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string) =>
      method === "getSquad"
        ? { _tag: "Success", value: squadView(rid("me"), "Test FC", SQUAD) }
        : method === "getTactics"
          ? { _tag: "Success", value: tacticsView(rid("me"), "Test FC", SQUAD) }
          : { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: rid("s1") } },
  };
  renderInRouter(
    <RegistryProvider>
      <ScreenToolbarSlot />
      <SquadScreen saveId={rid("s1")} />
    </RegistryProvider>,
  );
  await screen.findByRole("button", { name: "GK slot" });
};

/** The roster in the order it is DRAWN, read off each row's focus id. */
const drawnNames = (): string[] =>
  [...document.querySelectorAll("[data-focus-id]")]
    .map((element) => element.getAttribute("data-focus-id") ?? "")
    .filter((id) => id.startsWith("squad.squadTable."))
    .map((id) => BY_ID.get(id.slice("squad.squadTable.".length).split(".")[0]!) ?? "?");

const anEmptyDcSlot = (): HTMLElement => screen.getAllByRole("button", { name: "DC slot" })[0]!;

/**
 * The claim, split into the properties the ticket states separately so a failure names which one
 * broke. `drawn` must already be a complete permutation — a missing row would shift every index
 * and quietly satisfy the contiguity check, so the length is asserted first.
 */
const expectFitOverSort = (drawn: readonly string[]): void => {
  expect(drawn).toHaveLength(SQUAD.length);

  // (a) The tiers are contiguous: no fitter sits below a player who cannot fill the slot.
  const lastFitter = Math.max(...drawn.map((name, i) => (FIT_RANK[name]! < 3 ? i : -1)));
  const firstNonFitter = Math.min(
    ...drawn.map((name, i) => (FIT_RANK[name]! === 3 ? i : SQUAD.length)),
  );
  expect(lastFitter).toBeLessThan(firstNonFitter);

  // (b) Every tier is internally in the chosen sort. Read off the ages rather than the names, so
  //     this is a claim about the sort and not a second copy of the expected array.
  for (const rank of [0, 1, 2, 3]) {
    const ages = drawn.filter((name) => FIT_RANK[name] === rank).map((name) => AGE[name]!);
    expect(ages).toEqual([...ages].sort((a, b) => a - b));
  }

  // The two together, stated once as the sequence a manager reads.
  expect(drawn).toEqual([...FIT_OVER_AGE_ASC]);
};

/** The sort control each layout owns: a list has no header, a table has no reason for a second
 *  one. Both drive the same `cycleSort`, so the same expectation covers both. */
const sortByAge: Readonly<Record<string, () => void | Promise<unknown>>> = {
  list: () => chooseOptionByLabel("Sort squad", "Age"),
  table: () => {
    fireEvent.click(within(screen.getByRole("group", { name: "Squad" })).getByRole("button", { name: "Age" }));
  },
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

describe("the fit context orders within the current sort, not instead of it", () => {
  for (const [layout, viewId] of [
    ["list", "positions"],
    ["table", "general"],
  ] as ReadonlyArray<readonly [string, SquadViewId]>) {
    it(`groups the fitters and leaves each group in Age order (${layout} view)`, async () => {
      saveSquadViewId(viewId);
      await mount();
      await sortByAge[layout]!();

      // The sort itself has to be in force, or the rest of the test proves nothing.
      expect(drawnNames()).toEqual([...BY_AGE_ASC]);
      const beforeSelection = drawnNames();

      fireEvent.click(anEmptyDcSlot());

      expectFitOverSort(drawnNames());

      // (c) Clearing gives back the sorted order exactly, not merely "an order with the fitters
      //     somewhere sensible" — and not the wire order the screen started from.
      fireEvent.click(anEmptyDcSlot());
      expect(drawnNames()).toEqual(beforeSelection);
    });
  }
});
