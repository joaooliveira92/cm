import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
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

const rid = (s: string) => SaveId.make(s);

const attributes = (value: number): Record<string, number> => ({
  ...Object.fromEntries(OUTFIELD_ATTRIBUTES.map((a) => [a, value])),
  ...Object.fromEntries(GOALKEEPING_ATTRIBUTES.map((a) => [a, value])),
  ...Object.fromEntries(HIDDEN_ATTRIBUTES.map((a) => [a, value])),
});

const squadPlayer = (id: string, name: string, position: string, condition: number, pace: number) => ({
  id: rid(id),
  firstName: name,
  lastName: "Player",
  dateOfBirth: "1990-01-01",
  age: 25,
  attributes: { ...attributes(12), pace },
  positions: [{ position, familiarity: FAMILIARITY_TIERS[0] }],
  overallRating: 80,
  positionRatings: { ST: 12 },
  condition,
  trainingFocus: null,
  nationality: "England",
  birthplace: "London",
  foreign: false,
});

const TIRED = NON_CONTACT_CONDITION_THRESHOLD - 1;
const FRESH = 100;

const mountSquad = (initialEntry = "/"): void => {
  const view = {
    club: { id: rid("me"), name: "Test FC", statureTier: STATURE_TIERS[0] },
    players: [
      squadPlayer("p1", "Tom", "DC", TIRED, 16),
      squadPlayer("p2", "Fay", "DC", FRESH, 15),
      squadPlayer("p3", "Tia", "ST", TIRED, 9),
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

const TRIGGER = "Filter squad by attribute";

/** The picker's two steps: the Attribute, then the minimum. */
const chooseAttribute = async (attribute: string, min: string): Promise<void> => {
  fireEvent.click(screen.getByRole("button", { name: TRIGGER }));
  const popup = await screen.findByRole("dialog", {}, { timeout: 2000 });
  fireEvent.click(within(popup).getByRole("button", { name: attribute }));
  fireEvent.click(await within(popup).findByRole("button", { name: min }));
  await waitFor(() => {
    expect(screen.queryByRole("dialog")).toBeNull();
  });
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
  saveSquadViewId("overview");
};

beforeEach(reset);
afterEach(reset);

describe("Squad attribute filter (Screen 71, group-e 04)", () => {
  it("keeps players at or above the minimum, and clears without touching Position or Status", async () => {
    mountSquad();
    await screen.findByText(/Tom Player/);

    await chooseAttribute("Pace", "15+");
    await expectVisible(["Tom", "Fay"]);
    expect(screen.getByRole("button", { name: TRIGGER }).textContent).toContain("Attribute: Pace 15+");

    await chooseToolbarOption("Filter squad by status", "Tired");
    await expectVisible(["Tom"]);

    // Clearing the attribute leaves Status in place, and the reverse.
    await chooseToolbarOption(TRIGGER, "Any attribute");
    await expectVisible(["Tom", "Tia"]);
    await chooseAttribute("Pace", "16+");
    await chooseToolbarOption("Filter squad by status", "Any status");
    await expectVisible(["Tom"]);
  });

  it("replaces the clause when another attribute is chosen", async () => {
    mountSquad();
    await screen.findByText(/Tom Player/);
    await chooseAttribute("Pace", "16+");
    await expectVisible(["Tom"]);
    // Every player has 12 Strength: a new attribute clause replaces Pace rather than joining it.
    await chooseAttribute("Strength", "12+");
    await expectVisible(["Tom", "Fay", "Tia"]);
    expect(screen.getByRole("button", { name: TRIGGER }).textContent).toContain("Attribute: Strength 12+");
  });

  it("restores an attribute clause from the URL, through the real decode path", async () => {
    mountSquad("/?filters=pos:DC,attr:pace:16");
    await expectVisible(["Tom"]);
    expect(screen.getByRole("button", { name: TRIGGER }).textContent).toContain("Attribute: Pace 16+");
  });
});
