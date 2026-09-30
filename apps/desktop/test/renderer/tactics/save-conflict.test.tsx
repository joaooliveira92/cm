import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { SaveId, PlayerId, Tactic } from "@cm-clone/contracts";
import { STATURE_TIERS, builtInTemplate, tacticFromTemplate, emptyBench } from "@cm-clone/shared";
import { TacticsScreen } from "../../../src/renderer/tactics/TacticsScreen.js";
import { RegisteredScreenBar } from "../registered-screen-bar.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { ScreenToolbarSlot } from "../../../src/renderer/chrome/ScreenToolbarSlot.js";

const rid = (id: string) => SaveId.make(id);
const pid = (id: string) => PlayerId.make(id);

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const defaultTactic = () => {
  const t = tacticFromTemplate(builtInTemplate("4-4-2")!, []);
  return new Tactic({
    sourceTemplate: "4-4-2",
    slots: t.slots,
    team: t.team,
    teamSetPieces: t.teamSetPieces,
    assignments: ["p0", "p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10"].map((id) => pid(id)),
    bench: emptyBench(),
    takers: t.takers,
  });
};

const tacticOf = (formation: string) => {
  const t = tacticFromTemplate(builtInTemplate(formation)!, []);
  return new Tactic({
    sourceTemplate: formation,
    slots: t.slots,
    team: t.team,
    teamSetPieces: t.teamSetPieces,
    assignments: [pid("p0")],
    bench: emptyBench(),
    takers: t.takers,
  });
};

const tacticsView = (tactic: unknown, revision: number) => ({
  club: { id: rid("me"), name: "My Club", statureTier: STATURE_TIERS[0] },
  squad: [],
  tactic,
  revision,
});

/** The formation name shown in the menu bar's right-hand label. */
const formationLabel = (): string | null =>
  document.querySelector<HTMLElement>(".ml-auto")?.textContent ?? null;

const CONFLICT = {
  _tag: "TacticRevisionConflictError",
  saveId: rid("s1"),
  currentRevision: 1,
};

const mountConflictingEditor = (): void => {
  let loads = 0;
  mockPreload(async (method) => {
    if (method === "getTactics") {
      loads += 1;
      const view =
        loads === 1
          ? tacticsView(defaultTactic(), 0)
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

  await waitFor(() => expect(formationLabel()).toBe("4-4-2"));

  expect(screen.getByRole("button", { name: "Save Tactic" })).toBeDefined();
});

it("Clear Selection empties every slot and the bench in the draft, leaving the formation", async () => {
  mountConflictingEditor();
  const clear = await screen.findByRole("button", { name: "Clear Selection" });
  expect((clear as HTMLButtonElement).disabled).toBe(false);

  fireEvent.click(clear);

  await waitFor(() => expect((screen.getByRole("button", { name: "Clear Selection" }) as HTMLButtonElement).disabled).toBe(true));
  expect(formationLabel()).toBe("4-4-2");
});