// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { SaveId } from "@cm-clone/contracts";
import { FORMATION_SLOTS, POSITION_ROLES, STATURE_TIERS, type FORMATIONS } from "@cm-clone/shared";
import { TacticsScreen } from "../../../src/renderer/tactics/TacticsScreen.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";

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
      <TacticsScreen saveId={rid("s1")} />
    </RegistryProvider>,
  );
};

beforeEach(() => cleanup());
afterEach(() => cleanup());

it("a concurrent edit between read and save surfaces a distinct conflicted state with a Refresh path, and the draft survives", async () => {
  mountConflictingEditor();
  await screen.findByRole("button", { name: "Save Tactic" });

  // Edit the draft (4-3-3) — it must survive untouched through the conflict.
  fireEvent.click(screen.getByRole("button", { name: "4-3-3" }));
  expect(screen.getByRole("button", { name: "4-3-3" }).getAttribute("aria-pressed")).toBe("true");

  fireEvent.click(screen.getByRole("button", { name: "Save Tactic" }));

  // A distinct conflicted state, not the generic failure line, with a Refresh affordance.
  const alert = await screen.findByTestId("tactic-conflict");
  expect(alert.textContent).toMatch(/newer tactic was saved/);
  expect(screen.getByRole("button", { name: "Refresh" })).toBeDefined();

  // The edited draft is preserved rather than lost.
  expect(screen.getByRole("button", { name: "4-3-3" }).getAttribute("aria-pressed")).toBe("true");

  // Refresh loads the current server state and discards the stale draft.
  fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "5-3-2" }).getAttribute("aria-pressed")).toBe("true"),
  );
  expect(screen.queryByTestId("tactic-conflict")).toBeNull();
});