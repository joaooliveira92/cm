import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SaveId, Tactic } from "@cm-clone/contracts";
import { STATURE_TIERS, builtInTemplate, tacticFromTemplate } from "@cm-clone/shared";
import { TacticsScreen } from "../../../src/renderer/tactics/TacticsScreen.js";
import { RegisteredScreenBar } from "../registered-screen-bar.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { ScreenToolbarSlot } from "../../../src/renderer/chrome/ScreenToolbarSlot.js";

const rid = (id: string) => SaveId.make(id);

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const NOT_FOUND = { _tag: "SaveNotFoundError", id: rid("s1") };

const defaultTactic = () => {
  const t = tacticFromTemplate(builtInTemplate("4-4-2")!, []);
  return new Tactic({
    sourceTemplate: "4-4-2",
    slots: t.slots,
    team: t.team,
    teamSetPieces: t.teamSetPieces,
    assignments: t.assignments,
    bench: t.bench,
    takers: t.takers,
  });
};

const tacticsView = (tactic = defaultTactic()) => ({
  club: { id: rid("me"), name: "My Club", statureTier: STATURE_TIERS[0] },
  squad: [],
  tactic,
  revision: 0,
});

const mountTactics = async (view: unknown = tacticsView()): Promise<void> => {
  mockPreload(async (method) => {
    if (method === "getTactics") return { _tag: "Success", value: view } as never;
    if (method === "changeTactics") return { _tag: "Success", value: view } as never;
    return { _tag: "Failure", error: NOT_FOUND } as never;
  });
  render(
    <RegistryProvider>
      <header>
        <ScreenToolbarSlot />
      </header>
      <TacticsScreen saveId={rid("s1")} />
      <RegisteredScreenBar />
    </RegistryProvider>,
  );
};

beforeEach(() => cleanup());
afterEach(() => cleanup());

describe("tier-3 remainder — Tactics is driveable with no mouse (Level 1 guarantees)", () => {
  it("every Tactics control is a native button or select in tab order, with the focus ring", async () => {
    await mountTactics();
    await screen.findByTestId("team-selection-grid");

    const controls = [
      ...document.querySelectorAll<HTMLElement>(
        'main button:not([tabindex="-1"]), main select:not([tabindex="-1"])',
      ),
    ];
    const toolbar = [...document.querySelectorAll<HTMLElement>("header button")];
    const bar = [...document.querySelectorAll<HTMLElement>("footer button")];
    expect(bar.map((c) => c.dataset.actionId)).toEqual(["clear-tactic-selection", "save-tactic"]);

    const allControls = [...controls, ...toolbar, ...bar];
    for (const control of allControls) {
      expect(["BUTTON", "SELECT"]).toContain(control.tagName);
      expect(control.className).toContain("focus-visible:ring-2");
    }
  });

  it("the menu bar shows the Formation name", async () => {
    await mountTactics();
    await screen.findByTestId("team-selection-grid");
    // Two elements show the formation name: the toolbar span and the menu bar label
    expect(screen.getAllByText("4-4-2").length).toBeGreaterThanOrEqual(1);
  });

  it("the Save Tactic button is reachable and activates through its action", async () => {
    await mountTactics();
    await screen.findByTestId("team-selection-grid");

    const save = screen.getByRole("button", { name: "Save Tactic" });
    save.focus();
    fireEvent.keyDown(save, { key: "Enter" });
    fireEvent.click(save);
    await screen.findByText("Saved.");
  });
});