// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClubId, PlayerId } from "@cm-clone/contracts";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { ScoutingAssignmentScreen } from "../../../src/renderer/scouting/ScoutingAssignmentScreen.js";
import { chooseOptionByLabel, comboboxByLabel, openSelect } from "../../setup/baseUiSelect.js";
import { NOT_FOUND, profileView, reportFor, saveId, squadView } from "./reportFixtures.js";

/**
 * Scouting Assignment (Screen 121, ticket 04): the roster from `getScouting`, Clubs from the League
 * Table read, and both commands refreshing the roster through invalidation alone.
 */

interface ScoutRow {
  readonly scoutId: string;
  readonly scoutName: string;
  readonly quality: number;
  readonly playerId: PlayerId | null;
  readonly playerName: string | null;
  readonly targetClubId: ClubId | null;
  readonly targetClubName: string | null;
  readonly progress: number | null;
}

const standing = (clubId: string, clubName: string) => ({
  clubId: ClubId.make(clubId),
  clubName,
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
  points: 0,
});

const CLUB_NAMES: Record<string, string> = { "club-7": "Northport Rovers", "club-9": "Eastvale United" };

interface World {
  scouts: Array<ScoutRow>;
  archived: boolean;
  scoutedClubs: Set<string>;
  answer: ((method: string, payload: Record<string, unknown>) => unknown) | null;
  readonly commands: Array<{ method: string; payload: Record<string, unknown> }>;
}

let world: World;

const install = () => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string, payload: Record<string, unknown>) => {
      switch (method) {
        case "getScouting":
          return { _tag: "Success", value: { scouts: world.scouts } };
        case "getLeagueTable":
          return {
            _tag: "Success",
            value: {
              season: { seasonNumber: 1, currentDate: "2024-08-01", phase: "pre_season", awaitingFixture: null },
              standings: [standing("me", "My Club"), standing("club-7", "Northport Rovers"), standing("club-9", "Eastvale United")],
            },
          };
        case "getManagerProfileScreen":
          return { _tag: "Success", value: profileView(world.archived) };
        case "getSquad":
          return { _tag: "Success", value: squadView };
        case "getTeamScoutReport": {
          const clubId = payload["clubId"] as string;
          if (!world.scoutedClubs.has(clubId)) {
            return {
              _tag: "Failure",
              error: { _tag: "ClubNotScoutedError", clubId, currentReportId: `${clubId}:2024-08-01` },
            };
          }
          return { _tag: "Success", value: reportFor(clubId, CLUB_NAMES[clubId] ?? clubId, { scout: null }) };
        }
        case "assignScoutToClub":
        case "unassignScout": {
          world.commands.push({ method, payload });
          if (world.answer !== null) return world.answer(method, payload);
          const clubId = method === "assignScoutToClub" ? ClubId.make(payload["clubId"] as string) : null;
          world.scouts = world.scouts.map((scout) =>
            scout.scoutId === payload["scoutId"]
              ? {
                  ...scout,
                  playerId: null,
                  playerName: null,
                  progress: null,
                  targetClubId: clubId,
                  targetClubName: clubId === null ? null : (CLUB_NAMES[clubId] ?? null),
                }
              : scout,
          );
          return { _tag: "Success", value: { scouts: world.scouts } };
        }
        default:
          return NOT_FOUND;
      }
    },
  };
};

const mount = () =>
  render(
    <RegistryProvider>
      <ScoutingAssignmentScreen saveId={saveId} />
    </RegistryProvider>,
  );

const rowOf = async (name: string) => {
  const list = await screen.findByRole("list", { name: "Scouts" });
  return within(list).getByRole("listitem", { name });
};

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  world = {
    scouts: [
      {
        scoutId: "scout-1",
        scoutName: "Sam Seeker",
        quality: 12,
        playerId: null,
        playerName: null,
        targetClubId: null,
        targetClubName: null,
        progress: null,
      },
      {
        scoutId: "scout-2",
        scoutName: "Pat Finder",
        quality: 16,
        playerId: PlayerId.make("p-9"),
        playerName: "Nico Striker",
        targetClubId: null,
        targetClubName: null,
        progress: 35,
      },
      {
        scoutId: "scout-3",
        scoutName: "Lee Looker",
        quality: 8,
        playerId: null,
        playerName: null,
        targetClubId: ClubId.make("club-9"),
        targetClubName: "Eastvale United",
        progress: null,
      },
    ],
    archived: false,
    scoutedClubs: new Set(["club-9"]),
    answer: null,
    commands: [],
  };
  install();
  bindRouter({
    navigate: () => {},
    history: { back: () => {}, forward: () => {}, canGoBack: () => false },
  } as never);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ticket 04 — Scouting Assignment screen lists every Scout", () => {
  it("shows each Scout's quality, target (Club, Player or none) and Scouting Progress", async () => {
    mount();
    await screen.findByRole("heading", { name: "Scouting Assignment", level: 1 });
    const list = await screen.findByRole("list", { name: "Scouts" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);

    const free = await rowOf("Sam Seeker");
    expect(within(free).getByText("Quality 12")).toBeTruthy();
    expect(within(free).getByText("No assignment")).toBeTruthy();

    const onPlayer = await rowOf("Pat Finder");
    expect(within(onPlayer).getByText("Player: Nico Striker")).toBeTruthy();
    expect(onPlayer.textContent).toContain("Scouting Progress: 35%");

    const onClub = await rowOf("Lee Looker");
    expect(within(onClub).getByText("Club: Eastvale United")).toBeTruthy();
    expect(onClub.textContent).toContain("Scouting Progress: Tracked per Player");
  });

  it("offers the League Table's Clubs except the manager's own, and no Player target", async () => {
    mount();
    await screen.findByRole("list", { name: "Scouts" });
    await waitFor(() => expect(comboboxByLabel("Club to scout")).toBeTruthy());
    await openSelect(comboboxByLabel("Club to scout"));
    const names = screen.getAllByRole("option").map((option) => option.textContent);
    expect(names).toEqual(["Choose a club", "Northport Rovers", "Eastvale United"]);
    expect(names).not.toContain("My Club");
  });

  it("renders an empty line for a club with no Scouts", async () => {
    world.scouts = [];
    mount();
    expect(await screen.findByText("Your club has no Scouts.")).toBeTruthy();
    expect(screen.queryByRole("list", { name: "Scouts" })).toBeNull();
  });

  it("renders the typed error when the board cannot be read", async () => {
    (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: async () => NOT_FOUND };
    mount();
    const main = await screen.findByRole("main", { name: "Scouting Assignment" });
    expect(await within(main).findByText("That save could not be found.")).toBeTruthy();
  });
});

describe("ticket 04 — assigning and ending go through the existing commands and refresh the list", () => {
  it("assigns a free Scout to an unscouted Club from its not-scouted reading, and the row updates", async () => {
    mount();
    await screen.findByRole("list", { name: "Scouts" });
    await chooseOptionByLabel("Club to scout", "Northport Rovers");

    const button = await within(await rowOf("Sam Seeker")).findByRole("button", {
      name: "Assign Sam Seeker to Northport Rovers",
    });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(button);

    await waitFor(() => expect(world.commands).toHaveLength(1));
    expect(world.commands[0]).toEqual({
      method: "assignScoutToClub",
      payload: { saveId, scoutId: "scout-1", clubId: "club-7", expectedReportId: "club-7:2024-08-01" },
    });
    await waitFor(async () =>
      expect(within(await rowOf("Sam Seeker")).getByText("Club: Northport Rovers")).toBeTruthy(),
    );
    expect(within(await rowOf("Sam Seeker")).getByText("Watching this club")).toBeTruthy();
  });

  it("redirects a busy Scout to a scouted Club using the delivered report's reading", async () => {
    world.scoutedClubs.add("club-7");
    mount();
    await screen.findByRole("list", { name: "Scouts" });
    await chooseOptionByLabel("Club to scout", "Northport Rovers");

    const button = await within(await rowOf("Pat Finder")).findByRole("button", {
      name: "Assign Pat Finder to Northport Rovers",
    });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(button);

    await waitFor(() => expect(world.commands).toHaveLength(1));
    expect(world.commands[0]?.payload["expectedReportId"]).toBe("club-7:2024-08-01");
    await waitFor(async () =>
      expect(within(await rowOf("Pat Finder")).getByText("Club: Northport Rovers")).toBeTruthy(),
    );
  });

  it("ends a Player assignment, and the row shows the Scout free", async () => {
    mount();
    fireEvent.click(
      within(await rowOf("Pat Finder")).getByRole("button", { name: "End Pat Finder's assignment" }),
    );

    await waitFor(() => expect(world.commands).toHaveLength(1));
    expect(world.commands[0]).toEqual({ method: "unassignScout", payload: { saveId, scoutId: "scout-2" } });
    await waitFor(async () =>
      expect(within(await rowOf("Pat Finder")).getByText("No assignment")).toBeTruthy(),
    );
    expect(within(await rowOf("Pat Finder")).queryByRole("button", { name: /End/ })).toBeNull();
  });

  it("offers no End action for a free Scout", async () => {
    mount();
    expect(within(await rowOf("Sam Seeker")).queryByRole("button", { name: /End/ })).toBeNull();
    expect(within(await rowOf("Lee Looker")).getByRole("button", { name: "End Lee Looker's assignment" })).toBeTruthy();
  });

  it("shows a refused command inline as the RPC's own sentence and leaves the row unchanged", async () => {
    world.answer = () => ({ _tag: "Failure", error: { _tag: "SaveArchivedError", saveId, cause: "retired" } });
    mount();
    fireEvent.click(
      within(await rowOf("Lee Looker")).getByRole("button", { name: "End Lee Looker's assignment" }),
    );

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("You have retired — this save is archived.");
    expect(within(await rowOf("Lee Looker")).getByText("Club: Eastvale United")).toBeTruthy();
  });

  it("offers no action on an Archived Save", async () => {
    world.archived = true;
    mount();
    await screen.findByText("This career has ended, so no assignment can change.");
    expect(within(await screen.findByRole("list", { name: "Scouts" })).queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryByRole("combobox", { name: "Club to scout" })).toBeNull();
  });
});
