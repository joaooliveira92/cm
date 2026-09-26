import { PlayerId } from "@cm-clone/contracts";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PlayerDevelopmentScreen } from "../../../src/renderer/playerDevelopment/PlayerDevelopmentScreen.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { mockPreload, profileFigures, rid, squadPlayer, trainingPlanSquad } from "../training/fixtures.js";

afterEach(() => cleanup());

const profile = (id: string, firstName: string, lastName: string) => {
  const player = squadPlayer(id, firstName, lastName, null);
  return {
    id,
    firstName,
    lastName,
    age: player.age,
    nationality: player.nationality,
    birthplace: null,
    positions: player.positions,
    attributes: profileFigures(player.attributes),
    overallRating: { _tag: "exact", value: player.overallRating },
    transferValue: { _tag: "exact", value: 1_000_000 },
    club: trainingPlanSquad().club,
    contractExpiry: "2030-06-30",
    injuryStatus: "fit",
  };
};

const renderScreen = (playerId: string) =>
  render(
    <RegistryProvider>
      <PlayerDevelopmentScreen saveId={rid("s1")} playerId={PlayerId.make(playerId)} />
    </RegistryProvider>,
  );

/** `getPlayerProfile` answers for any id; `getSquad` carries only p1 (Technical), and a set is persisted. */
const fakeMain = () => {
  let focus: string | null = "technical";
  const sets: unknown[] = [];
  mockPreload(async (method, payload) => {
    const input = payload as { playerId?: string; focus?: string | null };
    if (method === "getPlayerProfile") {
      return { _tag: "Success", value: profile(input.playerId ?? "", "Rui", "Costa") };
    }
    if (method === "getSquad") {
      return {
        _tag: "Success",
        value: trainingPlanSquad([{ ...squadPlayer("p1", "Rui", "Costa", null), trainingFocus: focus as never }]),
      };
    }
    if (method === "setTrainingFocus") {
      sets.push(payload);
      focus = input.focus ?? null;
      return { _tag: "Success", value: { playerId: input.playerId, focus } };
    }
    return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: rid("s1") } };
  });
  return sets;
};

describe("ticket 06 — Player Development keeps its Training Focus picker, now the shared one", () => {
  it("shows the player's current focus and sets a new one through setTrainingFocus", async () => {
    const sets = fakeMain();
    renderScreen("p1");

    const group = await screen.findByRole("group", { name: "Rui Costa Training Focus" });
    const pressed = () =>
      within(group)
        .getAllByRole("button")
        .filter((button) => button.getAttribute("aria-pressed") === "true")
        .map((button) => button.textContent);
    expect(pressed()).toEqual(["Technical"]);

    fireEvent.click(within(group).getByRole("button", { name: "None" }));

    await waitFor(() => expect(pressed()).toEqual(["None"]));
    expect(sets).toEqual([{ saveId: "s1", playerId: "p1", focus: null }]);
  });

  it("offers no picker for a player outside the own squad", async () => {
    fakeMain();
    renderScreen("elsewhere");

    expect(await screen.findByText("Training Focus can only be set for players on your club.")).toBeTruthy();
    expect(screen.queryByRole("group")).toBeNull();
  });
});
