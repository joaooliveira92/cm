// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SaveId } from "@cm-clone/contracts";
import { FORMATION_SLOTS, FORMATIONS, POSITION_ROLES, STATURE_TIERS } from "@cm-clone/shared";
import { TacticsScreen } from "../src/renderer/TacticsScreen.js";
import { RegistryProvider } from "../src/renderer/rpc.js";

const rid = (id: string) => SaveId.make(id);

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const NOT_FOUND = { _tag: "SaveNotFoundError", id: rid("s1") };

const tacticOf = (formation: (typeof FORMATIONS)[number]) => ({
  formation,
  slots: (FORMATION_SLOTS[formation] ?? []).map((position, index) => ({
    position,
    role: POSITION_ROLES[position],
    playerId: rid(`p-${index}`),
  })),
  mentality: "balanced" as const,
  tempo: "normal" as const,
  pressing: "medium" as const,
});

const tacticsView = (tactic = tacticOf(FORMATIONS[0])) => ({
  club: { id: rid("me"), name: "My Club", statureTier: STATURE_TIERS[0] },
  squad: [],
  tactic,
});

const mountTactics = async (view: unknown = tacticsView()): Promise<void> => {
  mockPreload(async (method) => {
    if (method === "getTactics") return { _tag: "Success", value: view } as never;
    if (method === "changeTactics") return { _tag: "Success", value: view } as never;
    return { _tag: "Failure", error: NOT_FOUND } as never;
  });
  render(
    <RegistryProvider>
      <TacticsScreen saveId={rid("s1")} />
    </RegistryProvider>,
  );
};

beforeEach(() => cleanup());
afterEach(() => cleanup());

describe("tier-3 remainder — Tactics is driveable with no mouse (Level 1 guarantees)", () => {
  it("every Tactics control is a native button or select in tab order, with the focus ring", async () => {
    await mountTactics();
    await screen.findByRole("button", { name: "Save Tactic" });

    const controls = [...document.querySelectorAll<HTMLElement>("main button, main select")];
    const ids = controls.map((c) => c.dataset.actionId);

    // Native tab order: the five formation buttons come first, then the three
    // instruction sliders' option buttons, then the 11 slot player selects
    // (v1 formations include the explicit GK slot), then Save Tactic.
    expect(ids.slice(0, 5)).toEqual(Array(5).fill("set-formation"));
    const instructionControls = ids.slice(5, 14);
    for (const id of instructionControls) {
      expect(["set-mentality", "set-tempo", "set-pressing"]).toContain(id);
    }
    expect(ids.slice(14, 25)).toEqual(Array(11).fill("assign-slot-player"));
    expect(ids.slice(25)).toEqual(["save-tactic"]);

    // Every control is a native form control — the browser supplies Tab/arrows/
    // Enter/Space (Level 1: no custom widget can rob them of the default).
    for (const control of controls) {
      expect(["BUTTON", "SELECT"]).toContain(control.tagName);
      expect(control.className).toContain("focus-visible:ring-2");
    }
  });

  it("focused formation buttons activate on Enter (native button activation path)", async () => {
    await mountTactics();
    const fourThreeThree = (): HTMLElement =>
      screen.getByRole("button", { name: "4-3-3" });
    await screen.findByRole("button", { name: "4-4-2" });

    // The browser synthesizes a click for Enter on a focused native button;
    // jsdom leaves that to us, so drive the same two-step a real keypress makes.
    fourThreeThree().focus();
    fireEvent.keyDown(fourThreeThree(), { key: "Enter" });
    fireEvent.click(fourThreeThree());
    // The formation buttons are part of one selected-state toggle: 4-3-3 is
    // now the selected formation (the draft re-fills its slots).
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "4-3-3" }).className,
      ).toContain("bg-slate-100"),
    );
  });

  it("the slot player selects and Save Tactic are reachable and activate through their actions", async () => {
    await mountTactics();
    await screen.findByRole("button", { name: "Save Tactic" });

    // The eleven slot selects are native SELECTs (arrow keys navigate their options).
    const selects = [...document.querySelectorAll<HTMLSelectElement>("main select")];
    expect(selects.length).toBe(11);
    expect(selects[0]!.disabled).toBe(false);

    // Save Tactic dispatches the registered save action and reports progress.
    const save = screen.getByRole("button", { name: "Save Tactic" });
    save.focus();
    fireEvent.keyDown(save, { key: "Enter" });
    fireEvent.click(save);
    await screen.findByText("Saved.");
  });
});