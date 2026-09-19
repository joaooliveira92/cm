import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ClubId } from "@cm-clone/contracts";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { TeamScoutReportScreen } from "../../../src/renderer/scouting/TeamScoutReportScreen.js";
import {
  NOT_FOUND,
  fixturesView,
  profileView,
  reportFor,
  saveId,
  squadView,
  target,
} from "./reportFixtures.js";

/**
 * Team Scout Report ticket 07: the Assign Scout tab, from a delivered report and from the
 * not-scouted answer, with the post-assignment report arriving without a reload.
 */

interface ScoutRow {
  readonly scoutId: string;
  readonly scoutName: string;
  readonly targetClubId: string | null;
  readonly targetClubName: string | null;
}

const boardOf = (scouts: ReadonlyArray<ScoutRow>) => ({
  scouts: scouts.map((scout) => ({
    ...scout,
    targetClubId: scout.targetClubId === null ? null : ClubId.make(scout.targetClubId),
    quality: 10,
    playerId: null,
    playerName: null,
    progress: null,
  })),
});

interface World {
  scouts: Array<ScoutRow>;
  freshness: string;
  scouted: boolean;
  archived: boolean;
  assignAnswer: ((payload: Record<string, unknown>) => unknown) | null;
  readonly assignments: Array<Record<string, unknown>>;
}

let world: World;

const install = () => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string, payload: Record<string, unknown>) => {
      switch (method) {
        case "getTeamScoutReport": {
          if (!world.scouted) {
            return {
              _tag: "Failure",
              error: { _tag: "ClubNotScoutedError", clubId: target, currentReportId: "club-7:2024-08-01" },
            };
          }
          const watcher = world.scouts.find((scout) => scout.targetClubId === target);
          return {
            _tag: "Success",
            value: reportFor(target, "Northport Rovers", {
              freshness: world.freshness,
              scout: watcher === undefined ? null : { scoutId: watcher.scoutId, scoutName: watcher.scoutName },
            }),
          };
        }
        case "getScouting":
          return { _tag: "Success", value: boardOf(world.scouts) };
        case "assignScoutToClub": {
          world.assignments.push(payload);
          if (world.assignAnswer !== null) return world.assignAnswer(payload);
          world.scouts = world.scouts.map((scout) =>
            scout.scoutId === payload["scoutId"]
              ? { ...scout, targetClubId: target, targetClubName: "Northport Rovers" }
              : scout,
          );
          world.scouted = true;
          world.freshness = "current";
          return { _tag: "Success", value: boardOf(world.scouts) };
        }
        case "getManagerProfileScreen":
          return { _tag: "Success", value: profileView(world.archived) };
        case "getFixtures":
          return { _tag: "Success", value: fixturesView(false) };
        case "getSquad":
          return { _tag: "Success", value: squadView };
        default:
          return NOT_FOUND;
      }
    },
  };
};

const mount = () =>
  render(
    <RegistryProvider>
      <TeamScoutReportScreen saveId={saveId} clubId={target} />
    </RegistryProvider>,
  );

const openAssignTab = async () => {
  const tabs = within(await screen.findByRole("tablist", { name: "Report sections" }));
  fireEvent.click(tabs.getByRole("tab", { name: "Assign Scout" }));
};

beforeEach(() => {
  world = {
    scouts: [
      { scoutId: "scout-1", scoutName: "Sam Seeker", targetClubId: null, targetClubName: null },
      { scoutId: "scout-2", scoutName: "Pat Finder", targetClubId: "club-9", targetClubName: "Eastvale United" },
    ],
    freshness: "recent",
    scouted: true,
    archived: false,
    assignAnswer: null,
    assignments: [],
  };
  install();
  bindRouter({
    navigate: () => {},
    history: { back: () => {}, forward: () => {}, canGoBack: () => false },
  } as never);
});

afterEach(() => cleanup());

describe("ticket 07 — assigning a scout from the report", () => {
  it("lists every scout with what they are doing, and assigns one to the club", async () => {
    mount();
    await openAssignTab();

    await screen.findByText("Free");
    expect(screen.getByText("Watching Eastvale United")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Assign Sam Seeker" }));

    await waitFor(() => expect(world.assignments).toHaveLength(1));
    expect(world.assignments[0]).toEqual({
      saveId,
      scoutId: "scout-1",
      clubId: target,
      expectedReportId: "club-7:2024-08-01",
    });

    // No reload: the report's header picks up the new watcher through invalidation alone.
    await screen.findByText("Watching this club");
    await waitFor(() => {
      expect(screen.getAllByText("Sam Seeker").length).toBeGreaterThan(1);
    });
  });

  it("offers to renew a report that has fallen behind", async () => {
    world.freshness = "stale";
    mount();
    await openAssignTab();

    await screen.findByRole("heading", { name: "Renew this report" });
    fireEvent.click(screen.getByRole("button", { name: "Renew with Sam Seeker" }));

    await waitFor(() => expect(world.assignments).toHaveLength(1));
  });

  it("shows a refused stale reading as the command's own sentence", async () => {
    world.assignAnswer = () => ({
      _tag: "Failure",
      error: {
        _tag: "StaleReportError",
        expectedReportId: "club-7:2024-08-01",
        currentReportId: "club-7:2024-08-08",
      },
    });
    mount();
    await openAssignTab();

    fireEvent.click(await screen.findByRole("button", { name: "Assign Sam Seeker" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/updated since you opened it/);
  });

  it("sends a scout from the not-scouted answer, where the manager learns nobody has looked", async () => {
    world.scouted = false;
    mount();

    await screen.findByText(/have not watched this club yet/);
    await screen.findByRole("heading", { name: "Send a scout" });
    fireEvent.click(screen.getByRole("button", { name: "Assign Sam Seeker" }));

    await waitFor(() => expect(world.assignments).toHaveLength(1));
    await screen.findByRole("heading", { name: "Northport Rovers" });
  });

  it("offers nothing to assign on an Archived Save", async () => {
    world.archived = true;
    mount();
    await openAssignTab();

    await screen.findByText(/no scout can be assigned/);
    expect(screen.queryByRole("button", { name: /Assign / })).toBeNull();
  });
});
