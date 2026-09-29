import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { SaveId } from "@cm-clone/contracts";
import { FORMATION_SLOTS, POSITION_ROLES, STATURE_TIERS, emptyBench, type FORMATIONS } from "@cm-clone/shared";
import { TacticsScreen } from "../../../src/renderer/tactics/TacticsScreen.js";
import { RegisteredScreenBar } from "../registered-screen-bar.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { ScreenToolbarSlot } from "../../../src/renderer/chrome/ScreenToolbarSlot.js";
import { chooseToolbarOption } from "../../setup/toolbarPopover.js";

const rid = (id: string) => SaveId.make(id);

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

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

const tacticsView = (tactic: unknown, revision: number) => ({
  club: { id: rid("me"), name: "My Club", statureTier: STATURE_TIERS[0] },
  squad: [],
  tactic,
  revision,
});

const formationShown = (): string | null =>
  screen.getByRole("button", { name: "Formation" }).textContent;

const CONFLICT = {
  _tag: "TacticRevisionConflictError",
  saveId: rid("s1"),
  currentRevision: 1,
};

/**
 * getTactics answers revision 0 on first load, then a fresher revision 1 view after Refresh.
 * changeTactics always reports the conflict — a concurrent edit landed between read and save.
 */
const mountConflictingEditor = (): void => {
  let loads = 0;
  mockPreload(async (method) => {
    if (method === "getTactics") {
      loads += 1;
      const view =
        loads === 1
          ? tacticsView(tacticOf("4-4-2"), 0)
          : tacticsView(tacticOf("5-3-2"), 1);
      return { _tag: "Success", value: view } as never;
    }
    if (method === "changeTactics") return { _tag: "Failure", error: CONFLICT } as never;
    return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: rid("s1") } } as never;
  });
  render(
    <RegistryProvider>
      <ScreenToolbarSlot />
      <TacticsScreen saveId={rid("s1")} />
      <RegisteredScreenBar />
    </RegistryProvider>,
  );
};

beforeEach(() => cleanup());
afterEach(() => cleanup());

it("a concurrent edit between read and save surfaces a distinct conflicted state with a Refresh path, and the draft survives", async () => {
  mountConflictingEditor();
  await screen.findByRole("button", { name: "Save Tactic" });

  // Edit the draft (4-3-3) — it must survive untouched through the conflict.
  await chooseToolbarOption("Formation", "4-3-3");
  expect(formationShown()).toBe("Formation: 4-3-3");

  fireEvent.click(screen.getByRole("button", { name: "Save Tactic" }));

  // A distinct conflicted state, not the generic failure line, with a Refresh affordance.
  const alert = await screen.findByTestId("tactic-conflict");
  expect(alert.textContent).toMatch(/newer tactic was saved/);
  expect(screen.getByRole("button", { name: "Refresh" })).toBeDefined();

  // The edited draft is preserved rather than lost.
  expect(formationShown()).toBe("Formation: 4-3-3");

  // Refresh loads the current server state and discards the stale draft.
  fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
  await waitFor(() =>
    expect(formationShown()).toBe("Formation: 5-3-2"),
  );
  expect(screen.queryByTestId("tactic-conflict")).toBeNull();
});
it("Clear Selection empties every slot and the bench in the draft, leaving the formation", async () => {
  mountConflictingEditor();
  const clear = await screen.findByRole("button", { name: "Clear Selection" });
  expect((clear as HTMLButtonElement).disabled).toBe(false);

  fireEvent.click(clear);

  await waitFor(() => expect((screen.getByRole("button", { name: "Clear Selection" }) as HTMLButtonElement).disabled).toBe(true));
  // Disabled again means nothing is left to clear: every slot and bench place is empty.
  expect(formationShown()).toBe("Formation: 4-4-2");
});
