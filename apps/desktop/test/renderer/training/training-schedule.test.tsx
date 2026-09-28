import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { SaveId } from "@cm-clone/contracts";
import { TRAINING_SCHEDULE_TEMPLATES } from "@cm-clone/shared";
import { ACTION_REGISTRY, ALL_ACTIONS } from "../../../src/renderer/actions/allActions.js";
import { activeSet } from "../../../src/renderer/actions/registry.js";
import { getScopeState, resetScopeState, setScopeState } from "../../../src/renderer/actions/scopeState.js";
import { TrainingScheduleScreen } from "../../../src/renderer/training/TrainingScheduleScreen.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { RegisteredScreenBar } from "../registered-screen-bar.js";

// training-schedule-and-delegation 03: the schedule screen's draft, and Save/Reset in the bar.

const saveId = SaveId.make("s1");
const { balanced, heavy, recovery } = TRAINING_SCHEDULE_TEMPLATES;

const view = (sessions: unknown, revision: number, delegated = false) => ({
  sessions,
  template: null,
  revision,
  nextFixture: { fixtureId: 9, date: "2026-10-17", opponentClubName: "Eastfield", isHome: false },
  delegated,
  assistantName: "Ana Sousa",
  assistantReason: delegated ? "the squad has not recovered from the last match" : null,
});

const CONFLICT = { _tag: "TrainingScheduleRevisionConflictError", saveId: "s1", currentRevision: 4 };

let writes: Array<{ sessions: unknown; expectedRevision: number }>;
let delegations: Array<{ delegated: boolean; expectedRevision: number }>;

const mount = (onWrite: "accept" | "conflict" = "accept") => {
  writes = [];
  delegations = [];
  let loads = 0;
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (
      method: string,
      payload: { sessions: unknown; expectedRevision: number; delegated: boolean },
    ) => {
      if (method === "getTrainingSchedule") {
        loads += 1;
        return { _tag: "Success", value: loads === 1 ? view(balanced, 0) : view(heavy, 4) };
      }
      if (method === "setTrainingScheduleDelegation") {
        delegations.push({ delegated: payload.delegated, expectedRevision: payload.expectedRevision });
        return {
          _tag: "Success",
          value: view(payload.delegated ? recovery : balanced, payload.expectedRevision + 1, payload.delegated),
        };
      }
      if (method === "changeTrainingSchedule") {
        writes.push({ sessions: payload.sessions, expectedRevision: payload.expectedRevision });
        return onWrite === "conflict"
          ? { _tag: "Failure", error: CONFLICT }
          : { _tag: "Success", value: view(payload.sessions, payload.expectedRevision + 1) };
      }
      return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: "s1" } };
    },
  };
  return render(
    <RegistryProvider>
      <TrainingScheduleScreen saveId={saveId} />
      <RegisteredScreenBar />
    </RegistryProvider>,
  );
};

const barButton = (name: string) => screen.getByRole("button", { name }) as HTMLButtonElement;

beforeEach(() => {
  cleanup();
  resetScopeState();
});
afterEach(() => cleanup());

it("names the next Fixture and puts Save and Reset in the bottom bar as registered Actions, disabled with nothing changed", async () => {
  mount();
  await screen.findByText(/Planning for Eastfield \(away\)/);

  for (const [name, actionId] of [
    ["Save Schedule", "save-training-schedule"],
    ["Reset Schedule", "reset-training-schedule"],
  ] as const) {
    const button = barButton(name);
    expect(button.closest("footer")).not.toBeNull();
    expect(button.dataset.actionId).toBe(actionId);
    expect(ACTION_REGISTRY.get(actionId)?.scope).toBe("training");
    expect(button.disabled).toBe(true);
  }
});

it("applies a template to the draft only, and Reset returns to the saved schedule", async () => {
  mount();
  await screen.findByText(/Planning for Eastfield/);

  fireEvent.click(screen.getByRole("button", { name: "Heavy" }));
  expect(screen.getByRole("button", { name: "Heavy" }).getAttribute("aria-pressed")).toBe("true");
  expect(barButton("Save Schedule").disabled).toBe(false);
  expect(writes).toHaveLength(0);

  fireEvent.click(barButton("Reset Schedule"));
  await waitFor(() => expect(screen.getByRole("button", { name: "Balanced" }).getAttribute("aria-pressed")).toBe("true"));
  expect(barButton("Reset Schedule").disabled).toBe(true);
});

it("saves the draft against the revision it was read at", async () => {
  mount();
  await screen.findByText(/Planning for Eastfield/);

  fireEvent.click(screen.getByRole("button", { name: "Heavy" }));
  fireEvent.click(barButton("Save Schedule"));

  await screen.findByText("Saved.");
  expect(writes).toEqual([{ sessions: heavy, expectedRevision: 0 }]);
  expect(barButton("Save Schedule").disabled).toBe(true);
});

it("a stale save shows the conflict with Refresh and keeps the draft until the newer revision lands", async () => {
  mount("conflict");
  await screen.findByText(/Planning for Eastfield/);

  fireEvent.click(screen.getByRole("button", { name: "Recovery" }));
  fireEvent.click(barButton("Save Schedule"));

  const alert = await screen.findByTestId("schedule-conflict");
  expect(alert.textContent).toMatch(/newer schedule was saved/);
  expect(screen.getByRole("button", { name: "Recovery" }).getAttribute("aria-pressed")).toBe("true");

  fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Heavy" }).getAttribute("aria-pressed")).toBe("true"));
  expect(screen.queryByTestId("schedule-conflict")).toBeNull();
});

it("offers its Actions only while the schedule screen is open, not on the other Training screens", async () => {
  act(() => setScopeState({ ready: true }));
  const offered = () => activeSet(ALL_ACTIONS, "training", getScopeState()).map((a) => a.id);

  expect(offered()).not.toContain("save-training-schedule");
  const { unmount } = mount();
  await screen.findByText(/Planning for Eastfield/);
  expect(offered()).toEqual(expect.arrayContaining(["save-training-schedule", "reset-training-schedule"]));

  unmount();
  expect(offered()).not.toContain("save-training-schedule");
});

it("delegates from the bottom bar: the assistant plans, the controls lock, and the bar says why", async () => {
  mount();
  await screen.findByText(/Planning for Eastfield/);
  expect(screen.getByTestId("schedule-planner").textContent).toBe("Planned by you.");

  const delegate = barButton("Delegate to Assistant");
  expect(delegate.dataset.actionId).toBe("delegate-training-schedule");
  fireEvent.click(delegate);

  await screen.findByRole("button", { name: "Take Over Schedule" });
  expect(delegations).toEqual([{ delegated: true, expectedRevision: 0 }]);
  expect(screen.getByTestId("schedule-planner").textContent).toMatch(
    /Planned by Ana Sousa, your assistant: Recovery, because the squad has not recovered/,
  );
  expect(barButton("Take Over Schedule").dataset.actionId).toBe("take-over-training-schedule");
  expect(screen.queryByRole("button", { name: "Delegate to Assistant" })).toBeNull();
  expect(barButton("Save Schedule").disabled).toBe(true);
  expect((screen.getByRole("button", { name: "Heavy" }) as HTMLButtonElement).disabled).toBe(true);
  expect(within(screen.getByRole("contentinfo")).getByText(/Ana Sousa is planning the schedule/)).toBeTruthy();

  fireEvent.click(barButton("Take Over Schedule"));
  await screen.findByRole("button", { name: "Delegate to Assistant" });
  expect(delegations[1]).toEqual({ delegated: false, expectedRevision: 1 });
  expect((screen.getByRole("button", { name: "Heavy" }) as HTMLButtonElement).disabled).toBe(false);
});

it("offers Delegate or Take Over in the palette by who plans, never both", async () => {
  act(() => setScopeState({ ready: true }));
  const offered = () => activeSet(ALL_ACTIONS, "training", getScopeState()).map((a) => a.id);

  mount();
  await screen.findByText(/Planning for Eastfield/);
  expect(offered()).toContain("delegate-training-schedule");
  expect(offered()).not.toContain("take-over-training-schedule");

  fireEvent.click(barButton("Delegate to Assistant"));
  await screen.findByRole("button", { name: "Take Over Schedule" });
  expect(offered()).toContain("take-over-training-schedule");
  expect(offered()).not.toContain("delegate-training-schedule");
  expect(offered()).not.toContain("save-training-schedule");
});
