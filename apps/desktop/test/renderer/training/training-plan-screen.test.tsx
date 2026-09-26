import { PlayerId } from "@cm-clone/contracts";
import type { Category } from "@cm-clone/shared";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { TrainingPlanScreen } from "../../../src/renderer/training/TrainingPlanScreen.js";
import { mockPreload, rid, squadPlayer, trainingPlanSquad, type SquadPlayerWire } from "./fixtures.js";

beforeEach(() => {
  bindRouter({
    navigate: vi.fn(),
    history: { back: vi.fn(), forward: vi.fn(), canGoBack: () => false },
  } as never);
});

afterEach(() => cleanup());

const renderScreen = (playerId = "p1") =>
  render(
    <RegistryProvider>
      <TrainingPlanScreen saveId={rid("s1")} playerId={PlayerId.make(playerId)} />
    </RegistryProvider>,
  );

const pressedIn = (name: string) =>
  within(screen.getByRole("group", { name: `${name} Training Focus` }))
    .getAllByRole("button")
    .filter((button) => button.getAttribute("aria-pressed") === "true")
    .map((button) => button.textContent);

/**
 * A main-process stand-in: `getSquad` answers from `players`, and `setTrainingFocus` writes the
 * focus back through `answerSet`, so a refreshed read shows what the command persisted.
 */
const fakeMain = (
  initial: readonly SquadPlayerWire[] = trainingPlanSquad().players,
  answerSet: (payload: { playerId: string; focus: Category | null }) => Promise<unknown> = async (payload) => ({
    _tag: "Success",
    value: payload,
  }),
) => {
  const players = [...initial];
  const calls: Array<{ method: string; payload: unknown }> = [];
  mockPreload(async (method, payload) => {
    calls.push({ method, payload });
    if (method === "getSquad") return { _tag: "Success", value: trainingPlanSquad(players) };
    if (method === "setTrainingFocus") {
      const input = payload as { playerId: string; focus: Category | null };
      const answer = (await answerSet(input)) as { _tag: string };
      if (answer._tag === "Success") {
        const index = players.findIndex((player) => player.id === input.playerId);
        players[index] = squadPlayer(
          input.playerId,
          players[index]!.firstName,
          players[index]!.lastName,
          input.focus,
          players[index]!.attributes.gkHandling !== undefined,
        );
      }
      return answer;
    }
    return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: rid("s1") } };
  });
  return calls;
};

describe("ticket 06 — Individual Training Plan shows a player's current Training Focus with a picker", () => {
  it("reads the current focus from getSquad and shows it on the summary card and the picker", async () => {
    const calls = fakeMain();
    renderScreen();

    expect(await screen.findByRole("heading", { name: "Rui Costa — Training Plan", level: 1 })).toBeTruthy();
    const card = screen.getByRole("region", { name: "Rui Costa training plan" });
    expect(within(card).getByText("Training Focus: Technical")).toBeTruthy();
    expect(pressedIn("Rui Costa")).toEqual(["Technical"]);
    expect(calls).toEqual([{ method: "getSquad", payload: { saveId: "s1" } }]);

    const main = screen.getByRole("main", { name: "Rui Costa — Training Plan" });
    expect(main.getAttribute("data-focus-id")).toBe("training");
  });

  it("offers Goalkeeping only to a player with goalkeeping Attributes", async () => {
    fakeMain();
    renderScreen("p1");
    await screen.findByRole("group", { name: "Rui Costa Training Focus" });
    expect(screen.queryByRole("button", { name: "Goalkeeping" })).toBeNull();
    cleanup();

    renderScreen("p2");
    await screen.findByRole("group", { name: "Vitor Baia Training Focus" });
    expect(screen.getByRole("button", { name: "Goalkeeping" })).toBeTruthy();
    expect(pressedIn("Vitor Baia")).toEqual(["None"]);
  });

  it("shows a loading line while the read is in flight", () => {
    mockPreload(() => new Promise(() => undefined));
    renderScreen();
    expect(screen.getByText("Loading training plan...")).toBeTruthy();
    expect(screen.queryByRole("group")).toBeNull();
  });

  it("renders the typed error when the save is missing", async () => {
    mockPreload(async () => ({ _tag: "Failure", error: { _tag: "SaveNotFoundError", id: rid("s1") } }));
    renderScreen();
    const main = await screen.findByRole("main", { name: "Training plan" });
    expect(await within(main).findByText("That save could not be found.")).toBeTruthy();
    expect(screen.queryByRole("group")).toBeNull();
  });

  it("offers no picker for a player who is not on the own club", async () => {
    fakeMain();
    renderScreen("someone-else");
    expect(
      await screen.findByText(
        "That player does not belong to your club. Training Focus can only be set for your own players.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("group")).toBeNull();
  });
});

describe("ticket 06 — Individual Training Plan sets and clears Training Focus through setTrainingFocus", () => {
  it("sets a Category, and the refreshed read moves the pressed button and the card", async () => {
    const calls = fakeMain([squadPlayer("p1", "Rui", "Costa", null)]);
    renderScreen();
    await screen.findByRole("group", { name: "Rui Costa Training Focus" });

    fireEvent.click(screen.getByRole("button", { name: "Physical" }));

    await waitFor(() => expect(pressedIn("Rui Costa")).toEqual(["Physical"]));
    expect(screen.getByText("Training Focus: Physical")).toBeTruthy();
    expect(calls.filter((call) => call.method === "setTrainingFocus")).toEqual([
      { method: "setTrainingFocus", payload: { saveId: "s1", playerId: "p1", focus: "physical" } },
    ]);
    // The command's invalidation re-ran the squad read; nothing was assumed locally.
    expect(calls.filter((call) => call.method === "getSquad")).toHaveLength(2);
  });

  it("clears the focus to None by sending focus: null", async () => {
    const calls = fakeMain();
    renderScreen();
    await screen.findByRole("group", { name: "Rui Costa Training Focus" });

    fireEvent.click(screen.getByRole("button", { name: "None" }));

    await waitFor(() => expect(pressedIn("Rui Costa")).toEqual(["None"]));
    expect(screen.getByText("Training Focus: None")).toBeTruthy();
    expect(calls.find((call) => call.method === "setTrainingFocus")?.payload).toEqual({
      saveId: "s1",
      playerId: "p1",
      focus: null,
    });
  });

  it("disables the picker and says so while the command is pending, keeping the read's value pressed", async () => {
    let release: (value: unknown) => void = () => undefined;
    fakeMain(undefined, (payload) =>
      new Promise((resolve) => {
        release = () => resolve({ _tag: "Success", value: payload });
      }),
    );
    renderScreen();
    await screen.findByRole("group", { name: "Rui Costa Training Focus" });

    fireEvent.click(screen.getByRole("button", { name: "Mental" }));

    expect(await screen.findByRole("status")).toHaveProperty("textContent", "Saving Training Focus...");
    for (const button of within(screen.getByRole("group")).getAllByRole("button")) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
    expect(pressedIn("Rui Costa")).toEqual(["Technical"]);

    release(undefined);
    await waitFor(() => expect(pressedIn("Rui Costa")).toEqual(["Mental"]));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows the command's typed error and leaves the standing focus pressed", async () => {
    fakeMain(undefined, async (payload) => ({
      _tag: "Failure",
      error: { _tag: "NotYourPlayerError", playerId: payload.playerId },
    }));
    renderScreen();
    await screen.findByRole("group", { name: "Rui Costa Training Focus" });

    fireEvent.click(screen.getByRole("button", { name: "Mental" }));

    expect((await screen.findByRole("alert")).textContent).toBe("That player does not belong to your club.");
    expect(pressedIn("Rui Costa")).toEqual(["Technical"]);
    expect(within(screen.getByRole("group")).getByRole("button", { name: "Mental" })).toHaveProperty(
      "disabled",
      false,
    );
  });

  it("says a refused Category is not one the player can take", async () => {
    fakeMain(undefined, async (payload) => ({
      _tag: "Failure",
      error: { _tag: "TrainingFocusNotOfferedError", playerId: payload.playerId, focus: "mental" },
    }));
    renderScreen();
    await screen.findByRole("group", { name: "Rui Costa Training Focus" });

    fireEvent.click(screen.getByRole("button", { name: "Mental" }));

    expect((await screen.findByRole("alert")).textContent).toBe("That player cannot take this Training Focus.");
    expect(pressedIn("Rui Costa")).toEqual(["Technical"]);
  });

  it("does not carry one player's failed command onto another player's plan", async () => {
    fakeMain(undefined, async (payload) => ({
      _tag: "Failure",
      error: { _tag: "NotYourPlayerError", playerId: payload.playerId },
    }));
    const view = renderScreen("p1");
    await screen.findByRole("group", { name: "Rui Costa Training Focus" });
    fireEvent.click(screen.getByRole("button", { name: "Mental" }));
    await screen.findByRole("alert");

    view.rerender(
      <RegistryProvider>
        <TrainingPlanScreen saveId={rid("s1")} playerId={PlayerId.make("p2")} />
      </RegistryProvider>,
    );

    await screen.findByRole("group", { name: "Vitor Baia Training Focus" });
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
