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

/** Open the dialog, run `act` inside it, and wait for it to close. */
const inDialog = async (act: (dialog: HTMLElement) => void): Promise<void> => {
  fireEvent.click(screen.getByRole("button", { name: TRIGGER }));
  const dialog = await screen.findByRole("dialog", { name: "Filter by attribute" }, { timeout: 2000 });
  act(dialog);
  await waitFor(() => {
    expect(screen.queryByRole("dialog")).toBeNull();
  });
};

/** An Attribute's button: its name, then its drafted minimum when it has one ("Pace 15+"). */
const attributeButton = (dialog: HTMLElement, attribute: string): HTMLElement =>
  within(dialog).getByRole("button", { name: new RegExp(`^${attribute}( \\d+\\+)?$`) });

/** Draft one threshold inside an open dialog: the Attribute, then its minimum. */
const draft = (dialog: HTMLElement, attribute: string, min: string): void => {
  fireEvent.click(attributeButton(dialog, attribute));
  fireEvent.click(within(dialog).getByRole("button", { name: min }));
};

/** Draft one threshold and Apply, keeping any other threshold already set. */
const chooseAttribute = (attribute: string, min: string): Promise<void> =>
  inDialog((dialog) => {
    draft(dialog, attribute, min);
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
  });

const clearAttribute = (): Promise<void> =>
  inDialog((dialog) => {
    fireEvent.click(within(dialog).getByRole("button", { name: "Clear all" }));
  });

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

describe("Squad attribute filter (Screen 71, group-e 04, 05)", () => {
  it("keeps players at or above the minimum, and clears without touching Position or Status", async () => {
    mountSquad();
    await screen.findByText(/Tom Player/);

    await chooseAttribute("Pace", "15+");
    await expectVisible(["Tom", "Fay"]);
    expect(screen.getByRole("button", { name: TRIGGER }).textContent).toContain("Attribute: Pace 15+");

    await chooseToolbarOption("Filter squad by status", "Tired");
    await expectVisible(["Tom"]);

    // Clearing the attribute leaves Status in place, and the reverse.
    await clearAttribute();
    await expectVisible(["Tom", "Tia"]);
    await chooseAttribute("Pace", "16+");
    await chooseToolbarOption("Filter squad by status", "Any status");
    await expectVisible(["Tom"]);
  });

  it("applies several thresholds together, and Any drops one of them", async () => {
    mountSquad();
    await screen.findByText(/Tom Player/);
    await chooseAttribute("Pace", "15+");
    await expectVisible(["Tom", "Fay"]);
    // Every player has 12 Strength, so 13+ joins Pace and leaves nobody.
    await chooseAttribute("Strength", "13+");
    await expectVisible([]);
    expect(screen.getByRole("button", { name: TRIGGER }).textContent).toContain("Attributes: Pace 15+ +1");

    await inDialog((dialog) => {
      fireEvent.click(attributeButton(dialog, "Strength"));
      fireEvent.click(within(dialog).getByRole("button", { name: "Any" }));
      fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    });
    await expectVisible(["Tom", "Fay"]);
    expect(screen.getByRole("button", { name: TRIGGER }).textContent).toContain("Attribute: Pace 15+");
  });

  it("counts the players the draft would leave before it is applied", async () => {
    mountSquad("/?filters=status:Tir");
    await expectVisible(["Tom", "Tia"]);
    await inDialog((dialog) => {
      const count = within(dialog).getByRole("status");
      expect(count.textContent).toBe("2 players match");
      draft(dialog, "Pace", "15+");
      // Status still applies: Fay is fast but fresh.
      expect(count.textContent).toBe("1 player matches");
      fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    });
    await expectVisible(["Tom", "Tia"]);
  });

  it("restores an attribute clause from the URL, through the real decode path", async () => {
    mountSquad("/?filters=pos:DC,attr:pace:16");
    await expectVisible(["Tom"]);
    expect(screen.getByRole("button", { name: TRIGGER }).textContent).toContain("Attribute: Pace 16+");
  });

  it("opens on the live clause, and Cancel leaves it untouched", async () => {
    mountSquad("/?filters=attr:pace:16");
    await expectVisible(["Tom"]);
    await inDialog((dialog) => {
      expect(attributeButton(dialog, "Pace").getAttribute("aria-pressed")).toBe("true");
      expect(within(dialog).getByRole("button", { name: "16+" }).getAttribute("aria-pressed")).toBe("true");
      draft(dialog, "Strength", "5+");
      fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    });
    await expectVisible(["Tom"]);
    expect(screen.getByRole("button", { name: TRIGGER }).textContent).toContain("Attribute: Pace 16+");
  });
});
