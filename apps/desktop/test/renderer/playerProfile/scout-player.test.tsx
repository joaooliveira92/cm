/**
 * Scout Player on the Player Profile (group-i 13): the Profile's bar points one of the club's Scouts
 * at the Player on screen through `assignScout`, and the scouting read follows by invalidation.
 */
import { PlayerId } from "@cm-clone/contracts";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearScreenBottomBarActions } from "../../../src/renderer/chrome/bottom-bar/index.js";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { PlayerProfileScreen } from "../../../src/renderer/playerProfile/PlayerProfileScreen.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { RegisteredScreenBar } from "../registered-screen-bar.js";
import { mockPreload, profileFigures, rid, squadPlayer, trainingPlanSquad } from "../training/fixtures.js";

interface Scout {
  readonly scoutId: string;
  readonly scoutName: string;
  readonly quality: number;
  readonly playerId: string | null;
  readonly playerName: string | null;
  readonly targetClubId: string | null;
  readonly targetClubName: string | null;
  readonly progress: number | null;
}

const scout = (scoutId: string, scoutName: string, over: Partial<Scout> = {}): Scout => ({
  scoutId,
  scoutName,
  quality: 12,
  playerId: null,
  playerName: null,
  targetClubId: null,
  targetClubName: null,
  progress: null,
  ...over,
});

const RIVAL = { id: "rival", name: "Rival FC", statureTier: trainingPlanSquad().club.statureTier };

interface World {
  clubOfPlayer: typeof RIVAL;
  scouts: Scout[];
  assignFailure: unknown;
  scoutingReads: number;
  readonly assigned: Array<Record<string, unknown>>;
}

let world: World;

const profile = () => {
  const player = squadPlayer("p1", "Rui", "Costa", null);
  return {
    id: "p1",
    firstName: "Rui",
    lastName: "Costa",
    age: player.age,
    nationality: player.nationality,
    birthplace: "Porto",
    positions: player.positions,
    positionLabel: player.positionLabel,
    canPlay: player.canPlay,
    positionOrder: player.positionOrder,
    attributes: profileFigures(player.attributes),
    overallRating: { _tag: "range", low: 60, high: 70 },
    transferValue: { _tag: "range", low: 1_000_000, high: 2_000_000 },
    club: world.clubOfPlayer,
    contractExpiry: "2030-06-30",
    injuryStatus: "fit",
  };
};

const install = () => {
  mockPreload(async (method, payload) => {
    switch (method) {
      case "getPlayerProfile":
        return { _tag: "Success", value: profile() };
      case "getSquad":
        return { _tag: "Success", value: trainingPlanSquad() };
      case "getScouting":
        world.scoutingReads += 1;
        return { _tag: "Success", value: { scouts: world.scouts } };
      case "assignScout": {
        const input = payload as Record<string, unknown>;
        world.assigned.push(input);
        if (world.assignFailure !== null) return { _tag: "Failure", error: world.assignFailure };
        world.scouts = world.scouts.map((entry) =>
          entry.scoutId === input["scoutId"]
            ? { ...entry, playerId: "p1", playerName: "Rui Costa", targetClubId: null, targetClubName: null, progress: 0 }
            : entry,
        );
        return { _tag: "Success", value: { scouts: world.scouts } };
      }
      default:
        return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: rid("s1") } };
    }
  });
};

const mount = () =>
  render(
    <RegistryProvider>
      <PlayerProfileScreen saveId={rid("s1")} playerId={PlayerId.make("p1")} />
      <RegisteredScreenBar />
    </RegistryProvider>,
  );

const footer = (): HTMLElement => {
  const element = document.querySelector("footer");
  if (element === null) throw new Error("no bottom bar rendered");
  return element;
};

const scoutPlayerButton = async (): Promise<HTMLButtonElement> =>
  (await within(footer()).findByRole("button", { name: "Scout Player" })) as HTMLButtonElement;

beforeEach(() => {
  world = {
    clubOfPlayer: RIVAL,
    scouts: [
      scout("scout-1", "Sam Seeker"),
      scout("scout-2", "Pat Finder", { targetClubId: "other", targetClubName: "Eastvale United" }),
    ],
    assignFailure: null,
    scoutingReads: 0,
    assigned: [],
  };
  install();
  bindRouter({
    navigate: vi.fn(),
    history: { back: vi.fn(), forward: vi.fn(), canGoBack: () => false },
  } as never);
});

afterEach(() => {
  cleanup();
  clearScreenBottomBarActions();
});

describe("Scout Player on the Player Profile", () => {
  it("points the chosen Scout at the Player on screen, and the board follows by invalidation", async () => {
    mount();
    await waitFor(async () => expect((await scoutPlayerButton()).disabled).toBe(false));

    fireEvent.click(await scoutPlayerButton());
    const dialog = await screen.findByRole("dialog", { name: "Scout Rui Costa" });
    // Every Scout is listed with what they are doing now, busy ones included.
    expect(within(dialog).getByText("Watching Eastvale United")).toBeTruthy();

    const readsBefore = world.scoutingReads;
    fireEvent.click(within(dialog).getByRole("button", { name: "Assign Pat Finder" }));

    await waitFor(() => expect(world.assigned).toEqual([{ saveId: "s1", scoutId: "scout-2", playerId: "p1" }]));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(world.scoutingReads).toBeGreaterThan(readsBefore));
  });

  it("shows a Scout already on this Player as watching, with nothing to press", async () => {
    world.scouts = [scout("scout-1", "Sam Seeker", { playerId: "p1", playerName: "Rui Costa", progress: 40 })];
    mount();
    await waitFor(async () => expect((await scoutPlayerButton()).disabled).toBe(false));

    fireEvent.click(await scoutPlayerButton());
    const dialog = await screen.findByRole("dialog", { name: "Scout Rui Costa" });
    expect(within(dialog).getByText("Watching this player")).toBeTruthy();
    expect(within(dialog).queryByRole("button", { name: "Assign Sam Seeker" })).toBeNull();
  });

  it("shows the command's refusal inline and keeps the picker open", async () => {
    world.assignFailure = { _tag: "SaveArchivedError", saveId: "s1", cause: "retired" };
    mount();
    await waitFor(async () => expect((await scoutPlayerButton()).disabled).toBe(false));

    fireEvent.click(await scoutPlayerButton());
    const dialog = await screen.findByRole("dialog", { name: "Scout Rui Costa" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Assign Sam Seeker" }));

    expect((await within(dialog).findByRole("alert")).textContent).toBe(
      "You have retired — this save is archived.",
    );
    expect(screen.getByRole("dialog", { name: "Scout Rui Costa" })).toBeTruthy();
  });

  it("holds the verb for the manager's own Player, and says why", async () => {
    world.clubOfPlayer = { ...trainingPlanSquad().club };
    mount();

    await within(footer()).findByText("Rui Costa is your own player, so there is nothing to scout.");
    expect((await scoutPlayerButton()).disabled).toBe(true);
  });

  it("holds the verb when the club has no Scouts, and says why", async () => {
    world.scouts = [];
    mount();

    await within(footer()).findByText("Your club has no Scouts to send.");
    expect((await scoutPlayerButton()).disabled).toBe(true);
  });
});
