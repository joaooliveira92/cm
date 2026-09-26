/**
 * Competitions, the World section's browse list (group-l ticket 10).
 *
 * It is the way into the competition branch, so the assertion that matters most is that a row
 * reaches an Overview. The rest is about what a browse list must *not* grow.
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CompetitionId, SaveId } from "@cm-clone/contracts";
import { CompetitionsScreen } from "../../../src/renderer/competitions/CompetitionsScreen.js";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";

const saveId = SaveId.make("s1");

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const league = {
  competitionId: CompetitionId.make("comp_eng_1"),
  competitionName: "English First Division",
  kind: "league",
  nationName: "England",
  tier: 1,
  clubCount: 20,
};

/** A cup drawn from other competitions: no tier, no fixed field. */
const cup = {
  competitionId: CompetitionId.make("comp_eng_cup"),
  competitionName: "English Cup",
  kind: "cup",
  nationName: "England",
  tier: null,
  clubCount: null,
};

const respondWith = (competitions: ReadonlyArray<unknown>) => {
  mockPreload(async (method) => {
    if (method !== "getCompetitions") {
      return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: "s1" } } as never;
    }
    return { _tag: "Success", value: { competitions } } as never;
  });
};

let navigateSpy: ReturnType<typeof vi.fn>;

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
      <CompetitionsScreen saveId={saveId} />
    </RegistryProvider>,
  );

describe("CompetitionsScreen", () => {
  it("lists every competition with its nation, kind, tier and club count", async () => {
    respondWith([league, cup]);
    renderScreen();

    await waitFor(() => expect(screen.getByText("English First Division")).toBeTruthy());
    expect(screen.getByText("English Cup")).toBeTruthy();
    expect(screen.getByText("League")).toBeTruthy();
    expect(screen.getByText("Cup")).toBeTruthy();
    expect(screen.getByText("20")).toBeTruthy();
  });

  /** This is the whole reason the screen exists: Screens 161–164 had no entry point. */
  it("opens a competition's Overview, which nothing reached before", async () => {
    respondWith([league]);
    renderScreen();

    fireEvent.click(
      await screen.findByRole("button", { name: "English First Division — overview" }),
    );
    expect(navigateSpy).toHaveBeenLastCalledWith({
      to: "/career/$saveId/competition/$competitionId/overview",
      params: { saveId, competitionId: league.competitionId },
    });
  });

  /** Each control names its competition: "Open" down twenty rows says nothing about which. */
  it("names each row's control for its own competition", async () => {
    respondWith([league, cup]);
    renderScreen();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "English Cup — overview" })).toBeTruthy(),
    );
    expect(screen.getByRole("button", { name: "English First Division — overview" })).toBeTruthy();
  });

  /** An empty cell reads as missing data; an em dash reads as an answer. */
  it("shows an em dash for a competition with no tier and no fixed field", async () => {
    respondWith([cup]);
    renderScreen();

    await waitFor(() => expect(screen.getAllByText("—")).toHaveLength(2));
  });

  /**
   * Statistics, records, history and awards are all `deferred`. A browse list is exactly where one
   * of those columns would look harmless.
   */
  it("grows no column the ledger says has no model", async () => {
    respondWith([league, cup]);
    renderScreen();

    await waitFor(() => expect(screen.getByText("English Cup")).toBeTruthy());
    for (const absent of ["Titles", "Champion", "Winner", "Record", "Average"]) {
      expect(screen.queryByText(new RegExp(absent, "i"))).toBeNull();
    }
  });

  it("reports a failed read instead of an empty list", async () => {
    mockPreload(
      async () => ({ _tag: "Failure", error: { _tag: "SaveNotFoundError", id: "s1" } }) as never,
    );
    renderScreen();

    await waitFor(() => expect(screen.getByRole("main", { name: "Competitions" })).toBeTruthy());
    expect(screen.queryByRole("table")).toBeNull();
  });
});
