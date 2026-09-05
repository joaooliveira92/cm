// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SaveId } from "@cm-clone/contracts";
import {
  FAMILIARITY_TIERS,
  GOALKEEPING_ATTRIBUTES,
  HIDDEN_ATTRIBUTES,
  OUTFIELD_ATTRIBUTES,
  POSITIONS,
  STATURE_TIERS,
} from "@cm-clone/shared";
import { LeagueTableScreen } from "../src/renderer/LeagueTableScreen.js";
import { SquadScreen } from "../src/renderer/squad/SquadScreen.js";
import { RegistryProvider } from "../src/renderer/rpc.js";

const relaxedSaveId = (id: string) => SaveId.make(id);

const attributes = (value: number): Record<string, number> => ({
  ...Object.fromEntries(OUTFIELD_ATTRIBUTES.map((a) => [a, value])),
  ...Object.fromEntries(GOALKEEPING_ATTRIBUTES.map((a) => [a, value])),
  ...Object.fromEntries(HIDDEN_ATTRIBUTES.map((a) => [a, value])),
});

const squadView = (saveId: string, clubName: string) => ({
  club: { id: relaxedSaveId(saveId), name: clubName, statureTier: STATURE_TIERS[0] },
  players: [
    {
      id: relaxedSaveId(`p-${saveId}`),
      firstName: "Alan",
      lastName: "Shearer",
      dateOfBirth: "1970-08-13",
      age: 30,
      attributes: attributes(12),
      positions: [{ position: POSITIONS[2], familiarity: FAMILIARITY_TIERS[0] }],
      overallRating: 90,
      positionRatings: { WB: 12 },
      condition: 100,
      trainingFocus: null,
      nationality: "England",
      birthplace: "London",
    },
  ],
});

const leagueTable = (saveId: string) => ({
  season: { seasonNumber: 1, currentDate: "2026-08-01", phase: "in_season" as const },
  standings: [
    {
      clubId: relaxedSaveId("club-a"),
      clubName: "Club A",
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    },
    {
      clubId: relaxedSaveId(saveId),
      clubName: "My Club",
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    },
  ],
});

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const saveNotFound = { _tag: "SaveNotFoundError", id: relaxedSaveId("s1") };
const sackedError = { _tag: "SaveArchivedError", saveId: relaxedSaveId("s1"), cause: "sacked" };

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
});

describe("career screens go through the seam and render typed errors (AC-01, AC-03)", () => {
  it("SquadScreen renders the typed SaveNotFoundError from the seam union", async () => {
    mockPreload(async (method) => {
      if (method === "getSquad") return { _tag: "Failure", error: saveNotFound };
      return { _tag: "Failure", error: saveNotFound };
    });
    render(
      <RegistryProvider>
        <SquadScreen saveId={relaxedSaveId("s1")} />
      </RegistryProvider>,
    );
    expect(await screen.findByText("That save could not be found.")).toBeTruthy();
  });

  it("SquadScreen renders the transport failure message when IPC rejects", async () => {
    mockPreload(async () => {
      throw new Error("ipc down");
    });
    render(
      <RegistryProvider>
        <SquadScreen saveId={relaxedSaveId("s1")} />
      </RegistryProvider>,
    );
    expect(await screen.findByText("Unable to reach the game. Please try again.")).toBeTruthy();
  });

  it("SquadScreen renders the loaded squad on success", async () => {
    mockPreload(async (method) => {
      if (method === "getSquad") return { _tag: "Success", value: squadView("s1", "Test FC") };
      return { _tag: "Failure", error: saveNotFound };
    });
    render(
      <RegistryProvider>
        <SquadScreen saveId={relaxedSaveId("s1")} />
      </RegistryProvider>,
    );
    // The heading is the section name; club identity moved to the career
    // chrome's title bar, so the screen no longer repeats it.
    expect(await screen.findByRole("heading", { name: "Squad" })).toBeTruthy();
    expect(screen.queryByText("Test FC")).toBeNull();
    expect(await screen.findByText(/Alan Shearer/)).toBeTruthy();
  });

  it("LeagueTableScreen renders the typed save-archived error from the advance mutation", async () => {
    mockPreload(async (method) => {
      if (method === "getLeagueTable") return { _tag: "Success", value: leagueTable("s1") };
      if (method === "advanceCalendar") return { _tag: "Failure", error: sackedError };
      return { _tag: "Failure", error: saveNotFound };
    });
    render(
      <RegistryProvider>
        <LeagueTableScreen saveId={relaxedSaveId("s1")} />
      </RegistryProvider>,
    );
    await screen.findByRole("button", { name: /Advance Calendar/ });
    fireEvent.click(screen.getByRole("button", { name: /Advance Calendar/ }));
    expect(await screen.findByText("You have been sacked — this save is archived.")).toBeTruthy();
  });

  it("advanceCalendar invalidates the mounted registry: a new wire payload renders with no manual reload", async () => {
    let leagueTableCalls = 0;
    let advanceCalls = 0;
    mockPreload(async (method) => {
      if (method === "getLeagueTable") {
        leagueTableCalls += 1;
        return {
          _tag: "Success",
          value: {
            ...leagueTable("s1"),
            season: {
              seasonNumber: 1,
              // A different date per refetch, which is what the test observes changing.
              currentDate: `2026-08-${String(leagueTableCalls).padStart(2, "0")}`,
              phase: "in_season" as const,
            },
          },
        };
      }
      if (method === "advanceCalendar") {
        advanceCalls += 1;
        return {
          _tag: "Success",
          value: {
            season: { seasonNumber: 1, currentDate: "2026-08-08", phase: "in_season" as const },
            resolvedDate: "2026-08-01",
            transferWindowClosed: null,
            transferWindowOpened: null,
            seasonConcluded: false,
            boardObjectiveVerdict: null,
            managerOutcome: "none" as const,
          },
        };
      }
      return { _tag: "Failure", error: saveNotFound };
    });
    render(
      <RegistryProvider>
        <LeagueTableScreen saveId={relaxedSaveId("s1")} />
      </RegistryProvider>,
    );
    expect(await screen.findByText(/1 Aug 2026/)).toBeTruthy();
    expect(leagueTableCalls).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: /Advance Calendar/ }));
    expect(await screen.findByText(/2 Aug 2026/)).toBeTruthy();

    expect(advanceCalls).toBe(1);
    expect(leagueTableCalls).toBe(2);
    expect(screen.queryByText(/Refreshing…/)).toBeNull();
  });
});