import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SaveId, PlayerId, Tactic } from "@cm-clone/contracts";
import { OUTFIELD_ATTRIBUTES, STATURE_TIERS, builtInTemplate, tacticFromTemplate } from "@cm-clone/shared";
import { dispatchAction } from "../../../src/renderer/actions/dispatch.js";
import { TacticsScreen } from "../../../src/renderer/tactics/TacticsScreen.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { ScreenToolbarSlot } from "../../../src/renderer/chrome/ScreenToolbarSlot.js";
import { RegisteredScreenBar } from "../registered-screen-bar.js";

const rid = (id: string) => SaveId.make(id);
const pid = (id: string) => PlayerId.make(id);

const player = (index: number) => ({
  id: pid(`p-${String(index).padStart(2, "0")}`),
  firstName: `First${index}`,
  lastName: `Last${index}`,
  dateOfBirth: "2000-01-01",
  age: 25,
  attributes: Object.fromEntries(OUTFIELD_ATTRIBUTES.map((attribute) => [attribute, 12])),
  positions: [],
  positionLabel: "",
  canPlay: [],
  positionOrder: 0,
  overallRating: 50,
  positionRatings: {},
  cellRatings: {},
  suitability: {},
  retrainingTarget: null,
  condition: 100,
  trainingFocus: null,
  nationality: "England",
  birthplace: null,
  foreign: false,
  contractWage: 9000,
  contractExpiryDate: "2028-06-30",
  transferValue: 1200000,
});

const SQUAD = Array.from({ length: 14 }, (_, index) => player(index));
const STARTERS = SQUAD.slice(0, 11);

const tacticsView = (assignments: ReadonlyArray<PlayerId>) => ({
  club: { id: rid("me"), name: "My Club", statureTier: STATURE_TIERS[0] },
  squad: SQUAD,
  tactic: new Tactic(tacticFromTemplate(builtInTemplate("4-4-2")!, assignments)),
  revision: 0,
});

const mountTactics = async (view: ReturnType<typeof tacticsView>): Promise<void> => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string) =>
      method === "getTactics"
        ? { _tag: "Success", value: view }
        : { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: rid("s1") } },
  };
  render(
    <RegistryProvider>
      <ScreenToolbarSlot />
      <TacticsScreen saveId={rid("s1")} />
      <RegisteredScreenBar />
    </RegistryProvider>,
  );
  await screen.findByRole("list", { name: "4-4-2 on the pitch" });
};

/** Every pitch marker's accessible name, in slot order. */
const markerNames = (): ReadonlyArray<string> =>
  [...document.querySelectorAll<HTMLElement>("button[data-slot-index]")].map((marker) => marker.getAttribute("aria-label") ?? "");

const namesEveryStarter = (names: ReadonlyArray<string>, starters: ReadonlyArray<ReturnType<typeof player>>): boolean =>
  starters.every((starter) => names.some((name) => name.includes(`${starter.firstName} ${starter.lastName}`)));

beforeEach(() => cleanup());
afterEach(() => cleanup());

describe("the team selection across a formation change", () => {
  it("loading another formation keeps the same eleven on the pitch", async () => {
    await mountTactics(tacticsView(STARTERS.map((p) => p.id)));
    expect(namesEveryStarter(markerNames(), STARTERS)).toBe(true);

    await act(() => dispatchAction("set-formation", { formation: "4-3-3" }));

    await screen.findByRole("list", { name: "4-3-3 on the pitch" });
    expect(namesEveryStarter(markerNames(), STARTERS)).toBe(true);
  });
});

describe("the assistant manager picks the team", () => {
  it("fills an empty eleven in the current formation", async () => {
    await mountTactics(tacticsView(STARTERS.map(() => pid(""))));
    expect(namesEveryStarter(markerNames(), STARTERS)).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Assistant Picks Team" }));

    // Equal ratings everywhere, so the pick falls to id order: the first eleven.
    await waitFor(() => expect(namesEveryStarter(markerNames(), STARTERS)).toBe(true));
    expect(screen.getByTestId("tactic-template-label").textContent).toBe("4-4-2");
  });
});
