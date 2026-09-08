// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SaveId } from "@cm-clone/contracts";
import {
  FAMILIARITY_TIERS,
  FORMATION_SLOTS,
  GOALKEEPING_ATTRIBUTES,
  HIDDEN_ATTRIBUTES,
  OUTFIELD_ATTRIBUTES,
  POSITION_ROLES,
  POSITIONS,
  STATURE_TIERS,
} from "@cm-clone/shared";
import { SquadScreen } from "../../src/renderer/squad/SquadScreen.js";
import { RegistryProvider } from "../../src/renderer/rpc.js";

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

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const saveNotFound = { _tag: "SaveNotFoundError", id: relaxedSaveId("s1") };

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
      if (method === "getTactics")
        return {
          _tag: "Success",
          value: {
            club: { id: relaxedSaveId("s1"), name: "Test FC", statureTier: STATURE_TIERS[0] },
            squad: squadView("s1", "Test FC").players,
            tactic: {
              formation: "4-4-2",
              slots: FORMATION_SLOTS["4-4-2"].map((position) => ({
                position,
                role: POSITION_ROLES[position],
                playerId: "",
              })),
              bench: [null, null, null, null, null, null, null],
              mentality: "balanced",
              tempo: "normal",
              pressing: "medium",
            },
            revision: 0,
          },
        };
      return { _tag: "Failure", error: saveNotFound };
    });
    render(
      <RegistryProvider>
        <SquadScreen saveId={relaxedSaveId("s1")} />
      </RegistryProvider>,
    );
    // The heading is the section name; club identity moved to the career
    // chrome's title bar, so the screen no longer repeats it.
    expect(screen.queryByText("Test FC")).toBeNull();
    // A fresh install opens on the position list, which names players the way
    // the list does — surname first.
    expect(
      await screen.findByRole("heading", { name: "Players (Position(s))" }),
    ).toBeTruthy();
    expect(await screen.findByText(/Shearer, Alan/)).toBeTruthy();
  });

  // Two tests stood here and drove the Calendar through the League table's own
  // advance button. That control is gone: time advances from the chrome, on
  // every career route. The invalidation half moved to
  // `chrome/career-chrome.test.tsx` — same assertion, dispatched from the
  // control that ships. The typed-error half has no home until the chrome
  // renders a failed advance, which is this effort's next ticket.
});