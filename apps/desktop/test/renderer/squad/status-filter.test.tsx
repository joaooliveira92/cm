import { cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SaveId } from "@cm-clone/contracts";
import { NON_CONTACT_CONDITION_THRESHOLD } from "@cm-clone/game-engine";
import {
  FAMILIARITY_TIERS,
  GOALKEEPING_ATTRIBUTES,
  HIDDEN_ATTRIBUTES,
  OUTFIELD_ATTRIBUTES,
  STATURE_TIERS,
} from "@cm-clone/shared";
import { SquadScreen } from "../../../src/renderer/squad/SquadScreen.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { ScreenToolbarSlot } from "../../../src/renderer/chrome/ScreenToolbarSlot.js";
import { saveSquadViewId } from "../../../src/renderer/squad/squadViews.js";
import { resetActionHandlers } from "../../../src/renderer/actions/dispatch.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";
import { resetTableSessions } from "../../../src/renderer/table/tableState.js";
import { resetAnnouncements } from "../../../src/renderer/table/announcement.js";
import { chooseToolbarOption } from "../../setup/toolbarPopover.js";
import { renderInRouter } from "../../setup/renderInRouter.js";
import { positionSummaryFor } from "../../setup/positionFixtures.js";

const rid = (s: string) => SaveId.make(s);

const attributes = (value: number): Record<string, number> => ({
  ...Object.fromEntries(OUTFIELD_ATTRIBUTES.map((a) => [a, value])),
  ...Object.fromEntries(GOALKEEPING_ATTRIBUTES.map((a) => [a, value])),
  ...Object.fromEntries(HIDDEN_ATTRIBUTES.map((a) => [a, value])),
});

const squadPlayer = (id: string, name: string, position: string, condition: number) => ({
  id: rid(id),
  firstName: name,
  lastName: "Player",
  dateOfBirth: "1990-01-01",
  age: 25,
  attributes: attributes(12),
  positions: [{ position, familiarity: FAMILIARITY_TIERS[0] }],
  ...positionSummaryFor(position),
  overallRating: 80,
  positionRatings: { ST: 12 },
  cellRatings: {},
  suitability: {},
  retrainingTarget: null,
  condition,
  trainingFocus: null,
  nationality: "England",
  birthplace: "London",
  foreign: false,
  contractWage: 9000,
  contractExpiryDate: "2028-06-30",
  transferValue: 1200000,
});

const TIRED = NON_CONTACT_CONDITION_THRESHOLD - 1;
const FRESH = 100;

const mountSquad = (initialEntry = "/"): void => {
  const view = {
    club: { id: rid("me"), name: "Test FC", statureTier: STATURE_TIERS[0] },
    players: [
      squadPlayer("p1", "Tom", "DC", TIRED),
      squadPlayer("p2", "Fay", "DC", FRESH),
      squadPlayer("p3", "Tia", "ST", TIRED),
    ],
  };
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string) =>
      method === "getSquad"
        ? { _tag: "Success", value: view }
        : { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: rid("s1") } },
  };
  renderInRouter(
    <RegistryProvider>
      <ScreenToolbarSlot />
      <SquadScreen saveId={rid("s1")} />
    </RegistryProvider>,
    initialEntry,
  );
};

/** The first names of the rows the table currently shows. */
const visible = (): readonly string[] =>
  ["Tom", "Fay", "Tia"].filter((name) => screen.queryByText(new RegExp(`${name} Player`)) !== null);

const expectVisible = (names: readonly string[]) =>
  waitFor(() => {
    expect(visible()).toEqual(names);
  });

const reset = () => {
  cleanup();
  resetActionHandlers();
  resetScopeState();
  resetTableSessions();
  resetAnnouncements();
  window.localStorage.clear();
  saveSquadViewId("general");
};

beforeEach(reset);
afterEach(reset);

describe("Squad status filter (Screen 71, group-e 02)", () => {
  it("filters by Tired, and clearing either dropdown leaves the other's clause in place", async () => {
    mountSquad();
    await screen.findByText(/Tom Player/);

    await chooseToolbarOption("Filter squad by status", "Tired");
    await expectVisible(["Tom", "Tia"]);
    expect(screen.getByRole("button", { name: "Filter squad by status" }).textContent).toContain("Status: Tired");

    await chooseToolbarOption("Filter squad by position", "D C");
    await expectVisible(["Tom"]);

    // The regression: "All positions" used to clear every clause, Status included.
    await chooseToolbarOption("Filter squad by position", "All positions");
    await expectVisible(["Tom", "Tia"]);

    await chooseToolbarOption("Filter squad by position", "F C");
    await chooseToolbarOption("Filter squad by status", "Any status");
    await expectVisible(["Tia"]);
    expect(screen.getByRole("button", { name: "Filter squad by position" }).textContent).toContain("Position: F C");
  });

  it("restores a status clause from the URL, through the real decode path", async () => {
    // Lower-cased on purpose: a hand-edited code still means Tired once canonicalised.
    mountSquad("/?filters=pos:D%20C,status:tir");
    await expectVisible(["Tom"]);
    expect(screen.getByRole("button", { name: "Filter squad by status" }).textContent).toContain("Status: Tired");
    expect(screen.getByRole("button", { name: "Filter squad by position" }).textContent).toContain("Position: D C");
  });
});
