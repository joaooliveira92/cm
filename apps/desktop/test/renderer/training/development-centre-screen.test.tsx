import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DevelopmentCentreScreen } from "../../../src/renderer/training/DevelopmentCentreScreen.js";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { mixedSquadDevelopmentView, mockPreload, respondWithSquadDevelopment, rid } from "./fixtures.js";

let navigateSpy = vi.fn();

beforeEach(() => {
  navigateSpy = vi.fn();
  bindRouter({
    navigate: navigateSpy,
    history: { back: vi.fn(), forward: vi.fn(), canGoBack: () => false },
  } as never);
});

afterEach(() => cleanup());

const renderScreen = () =>
  render(
    <RegistryProvider>
      <DevelopmentCentreScreen saveId={rid("s1")} />
    </RegistryProvider>,
  );

describe("ticket 08 — Player Development Centre renders every player with Training Focus and development", () => {
  it("makes one squad-wide read for the save it is given, not one per player", async () => {
    const calls: Array<{ method: string; payload: unknown }> = [];
    mockPreload(async (method, payload) => {
      calls.push({ method, payload });
      return { _tag: "Success", value: mixedSquadDevelopmentView() } as never;
    });
    renderScreen();

    await waitFor(() => expect(screen.getByRole("list", { name: "Squad development" })).toBeTruthy());
    expect(calls).toEqual([{ method: "getSquadDevelopment", payload: { saveId: "s1" } }]);
  });

  it("renders one row per player, in the read's order, each with its Training Focus and indicator", async () => {
    respondWithSquadDevelopment(mixedSquadDevelopmentView());
    renderScreen();

    const list = await screen.findByRole("list", { name: "Squad development" });
    expect(within(list).getAllByRole("listitem").map((item) => item.getAttribute("aria-label"))).toEqual([
      "Rui Costa",
      "Ana Reis",
      "Vitor Baia",
    ]);

    const compared = within(list).getByRole("listitem", { name: "Rui Costa" });
    expect(within(compared).getByText("Training Focus: Technical")).toBeTruthy();
    expect(within(compared).getByText("Season 3: 2 Attributes rose and 1 fell since Season 2.")).toBeTruthy();

    const first = within(list).getByRole("listitem", { name: "Ana Reis" });
    expect(within(first).getByText("Training Focus: None")).toBeTruthy();
    expect(within(first).getByText("No comparison yet: Season 3 is the first recorded at your club.")).toBeTruthy();

    const unrecorded = within(list).getByRole("listitem", { name: "Vitor Baia" });
    expect(within(unrecorded).getByText("Training Focus: Goalkeeping")).toBeTruthy();
    expect(
      within(unrecorded).getByText("No comparison yet: no Season has concluded with this player at your club."),
    ).toBeTruthy();
  });

  it("shows no rating or hidden value, only the recorded counts", async () => {
    respondWithSquadDevelopment(mixedSquadDevelopmentView());
    renderScreen();

    const main = await screen.findByRole("main", { name: "Player Development Centre" });
    expect(main.getAttribute("data-focus-id")).toBe("training");
    expect(within(main).queryByText(/Potential|Current Ability|Rating|Injury Proneness/i)).toBeNull();
  });

  it("renders a single line for a club with no players", async () => {
    respondWithSquadDevelopment({ players: [] });
    renderScreen();

    expect(await screen.findByText("No players in your squad.")).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("renders the typed error when the save is missing", async () => {
    mockPreload(async () => ({
      _tag: "Failure",
      error: { _tag: "SaveNotFoundError", id: rid("s1") },
    }) as never);
    renderScreen();

    const main = await screen.findByRole("main", { name: "Player development centre" });
    expect(await within(main).findByText("That save could not be found.")).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
  });
});

describe("ticket 08 — each row links to that player's development screen and training plan", () => {
  it("the Development button navigates to the player's Player Development route", async () => {
    respondWithSquadDevelopment(mixedSquadDevelopmentView());
    renderScreen();

    const row = within(await screen.findByRole("list", { name: "Squad development" })).getByRole("listitem", {
      name: "Ana Reis",
    });
    fireEvent.click(within(row).getByRole("button", { name: "Ana Reis development" }), { detail: 1 });

    expect(navigateSpy).toHaveBeenCalledWith({
      to: "/career/$saveId/player/$playerId/development",
      params: { saveId: rid("s1"), playerId: "p2" },
    });
  });

  it("the Training plan button navigates to the player's Individual Training Plan", async () => {
    respondWithSquadDevelopment(mixedSquadDevelopmentView());
    renderScreen();

    const row = within(await screen.findByRole("list", { name: "Squad development" })).getByRole("listitem", {
      name: "Rui Costa",
    });
    fireEvent.click(within(row).getByRole("button", { name: "Rui Costa training plan" }), { detail: 1 });

    expect(navigateSpy).toHaveBeenCalledWith({
      to: "/career/$saveId/training/plan/$playerId",
      params: { saveId: rid("s1"), playerId: "p1" },
    });
  });
});
