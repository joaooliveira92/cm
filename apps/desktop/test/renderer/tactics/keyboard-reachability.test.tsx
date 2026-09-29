import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SaveId } from "@cm-clone/contracts";
import { FORMATION_SLOTS, FORMATIONS, POSITION_ROLES, STATURE_TIERS, emptyBench } from "@cm-clone/shared";
import { TacticsScreen } from "../../../src/renderer/tactics/TacticsScreen.js";
import { RegisteredScreenBar } from "../registered-screen-bar.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { ScreenToolbarSlot } from "../../../src/renderer/chrome/ScreenToolbarSlot.js";
import { chooseToolbarOption } from "../../setup/toolbarPopover.js";

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
  bench: emptyBench(),
  mentality: "balanced" as const,
  tempo: "normal" as const,
  pressing: "medium" as const,
});

const tacticsView = (tactic = tacticOf(FORMATIONS[0])) => ({
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
    await screen.findByRole("button", { name: "Save Tactic" });

    // The pitch markers are pointer shortcuts onto the slot pickers, deliberately out of tab order.
    const controls = [
      ...document.querySelectorAll<HTMLElement>(
        'main button:not([tabindex="-1"]), main select:not([tabindex="-1"])',
      ),
    ];
    const ids = controls.map((c) => c.dataset.actionId);

    // Native tab order within the screen: each slot's row, its player select, then (outfield
    // slots only) its position select — the keyboard path for moving a slot the pitch offers by
    // drag. Formation and the three instructions are menus in the chrome's toolbar, before the
    // screen; Save Tactic and Clear Selection are the shell's bottom bar, after it.
    expect(ids).toEqual([
      "assign-slot-player",
      ...Array.from({ length: 10 }, () => ["assign-slot-player", "set-slot-position"]).flat(),
    ]);
    const toolbar = [...document.querySelectorAll<HTMLElement>("header button")];
    expect(toolbar.map((c) => c.getAttribute("aria-label"))).toEqual([
      "Formation",
      "Mentality",
      "Tempo",
      "Pressing",
    ]);
    controls.push(...toolbar);
    const bar = [...document.querySelectorAll<HTMLElement>("footer button")];
    expect(bar.map((c) => c.dataset.actionId)).toEqual(["clear-tactic-selection", "save-tactic"]);
    controls.push(...bar);

    // Every control is a native form control — the browser supplies Tab/arrows/
    // Enter/Space (Level 1: no custom widget can rob them of the default).
    for (const control of controls) {
      expect(["BUTTON", "SELECT"]).toContain(control.tagName);
      expect(control.className).toContain("focus-visible:ring-2");
    }
  });

  it("the toolbar menus set the Formation and each team instruction", async () => {
    await mountTactics();
    await screen.findByRole("button", { name: "Formation" });

    // Each trigger names its current choice, so the selected state survives a restyle and reads
    // the same to a screen reader.
    await chooseToolbarOption("Formation", "4-3-3");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Formation" }).textContent).toBe("Formation: 4-3-3"),
    );
    await chooseToolbarOption("Mentality", "Attacking");
    await chooseToolbarOption("Tempo", "Fast");
    await chooseToolbarOption("Pressing", "High");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Pressing" }).textContent).toBe("Pressing: High"),
    );
    expect(screen.getByRole("button", { name: "Mentality" }).textContent).toBe("Mentality: Attacking");
    expect(screen.getByRole("button", { name: "Tempo" }).textContent).toBe("Tempo: Fast");
  });

  it("the slot player selects and Save Tactic are reachable and activate through their actions", async () => {
    await mountTactics();
    await screen.findByRole("button", { name: "Save Tactic" });

    // The eleven slot-player triggers are Base UI combobox buttons (the same picker the
    // migration vendored everywhere); each carries its slot's action id.
    const selects = [
      ...document.querySelectorAll<HTMLButtonElement>('main button[data-action-id="assign-slot-player"]'),
    ];
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