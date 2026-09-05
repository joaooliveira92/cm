// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SaveId, ClubId } from "@cm-clone/contracts";
import { SeasonSummaryScreen } from "../src/renderer/seasonSummary/SeasonSummaryScreen.js";
import { RegistryProvider } from "../src/renderer/rpc.js";

const saveId = SaveId.make("s1");

const summaryView = (overrides: Record<string, unknown> = {}) => ({
  season: { seasonNumber: 3, currentDate: "2027-05-26", phase: "season_complete" },
  standings: [],
  clubId: ClubId.make("me"),
  clubName: "My Club",
  finalPosition: 12,
  boardObjective: null,
  managerOutcome: "none",
  consecutiveMisses: 0,
  archivedCause: null,
  ...overrides,
});

const mount = (view: unknown) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string) =>
      method === "getSeasonSummary"
        ? { _tag: "Success", value: view }
        : { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: saveId } },
  };
  render(
    <RegistryProvider>
      <SeasonSummaryScreen saveId={saveId} />
    </RegistryProvider>,
  );
};

const SACKED_BANNER = /You have been sacked/;
const RETIREMENT_LINE = /Career ended — you retired at the end of Season 3\./;

beforeEach(cleanup);
afterEach(cleanup);

describe("Season Summary — how the career ended", () => {
  it("says nothing about an ending while the career is live", async () => {
    mount(summaryView());
    await screen.findByText(/Final League position/);
    expect(screen.queryByText(SACKED_BANNER)).toBeNull();
    expect(screen.queryByText(RETIREMENT_LINE)).toBeNull();
  });

  it("shows the retirement line, and not the sacked banner, for a retired save", async () => {
    mount(summaryView({ archivedCause: "retired" }));
    expect(await screen.findByText(RETIREMENT_LINE)).toBeTruthy();
    expect(screen.queryByText(SACKED_BANNER)).toBeNull();
  });

  it("shows the sacked banner, and not the retirement line, for a sacked save", async () => {
    mount(summaryView({ archivedCause: "sacked", managerOutcome: "sacked", consecutiveMisses: 2 }));
    expect(await screen.findByText(SACKED_BANNER)).toBeTruthy();
    expect(screen.queryByText(RETIREMENT_LINE)).toBeNull();
  });

  it("reads the ending from the cause, never from the board's last judgment", async () => {
    // A manager one miss from the sack who retires instead: the warning is still the last thing the
    // board decided and is still shown, but the career ended by the player's choice.
    mount(summaryView({ archivedCause: "retired", managerOutcome: "warned", consecutiveMisses: 1 }));
    expect(await screen.findByText(RETIREMENT_LINE)).toBeTruthy();
    expect(screen.getByText(/The board has issued a warning/)).toBeTruthy();
    expect(screen.queryByText(SACKED_BANNER)).toBeNull();
  });
});
