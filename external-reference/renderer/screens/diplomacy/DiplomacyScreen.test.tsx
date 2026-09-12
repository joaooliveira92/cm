/* @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { DiplomacyScreenState } from "./diplomacy-screen-state.js";
import {
  diplomacyBeginAction,
  diplomacyBeginSubmit,
  diplomacyLoadSuccess,
  initialDiplomacyScreenState,
  diplomacySubmitRejected,
} from "./diplomacy-screen-state.js";
import { DiplomacyScreen } from "./DiplomacyScreen.js";

/**
 * Render test for the Diplomacy & War screen (desktop-diplomacy-war INC-3,
 * spec Testing → renderer screen test). The hook is mocked so the test
 * asserts PURE rendering: the real projection data is shown (relations rows,
 * war list with scores, blockades), honest empty states, and engine-code
 * rejection notices — never fabricated success copy.
 */

const fixtureProjection = {
  playerNationId: "uk",
  knownNations: [
    { nationId: "france", name: "France" },
    { nationId: "germany", name: "Germany" },
  ],
  relations: [
    {
      nationAId: "uk",
      nationBId: "france",
      relation: "at_war",
      tension: 9,
      nap: false,
      since: "1880-01",
      partnerNationId: "france",
      partnerName: "France",
    },
    {
      nationAId: "uk",
      nationBId: "germany",
      relation: "neutral",
      tension: 5,
      nap: true,
      since: "1880-01",
      partnerNationId: "germany",
      partnerName: "Germany",
    },
  ],
  wars: [
    {
      warId: "war_uk_france_1880-01",
      attackerSideId: "side_uk",
      defenderSideId: "side_france",
      attackerSideMembers: ["uk"],
      defenderSideMembers: ["france"],
      attackerWarScore: 3,
      defenderWarScore: 1,
      attackerId: "uk",
      defenderId: "france",
      startDate: "1880-01",
      status: "ACTIVE",
      playerSide: "attacker",
    },
  ],
  blockades: [
    {
      blockaderId: "uk",
      blockadedNationId: "france",
      areaId: "med_gibraltar",
      establishedMonth: "1880-02",
    },
  ],
  areas: [{ areaId: "med_gibraltar", name: "Gibraltar" }],
  revision: 1,
  month: { month: 2, year: 1880 },
};

function makeLoaded(overrides = {}): DiplomacyScreenState {
  const projection = { ...fixtureProjection, ...overrides };
  return diplomacyLoadSuccess(initialDiplomacyScreenState(), projection as never);
}

const hookMocks = vi.hoisted(() => {
  const stateFn = vi.fn(() => makeLoaded());
  const setRowAction = vi.fn();
  const setPeaceAction = vi.fn();
  const setBlockadeArea = vi.fn();
  const clearDraft = vi.fn();
  const submit = vi.fn();
  const reload = vi.fn().mockResolvedValue(undefined);
  const canSubmit = false;
  return {
    stateFn,
    setRowAction,
    setPeaceAction,
    setBlockadeArea,
    clearDraft,
    submit,
    reload,
    canSubmit,
  };
});

// `GlassCard`/`Select` measure their elements with ResizeObserver — jsdom
// doesn't ship it; a no-op shim is enough for a pure render test (mirrors the
// research screen test).
const ResizeObserverMock = vi.hoisted(
  () =>
    class implements ResizeObserver {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
);
vi.stubGlobal("ResizeObserver", ResizeObserverMock);

vi.mock("./hooks/useDiplomacyScreen.js", () => ({
  useDiplomacyScreen: (_sessionId: string) => ({
    state: hookMocks.stateFn(),
    setRowAction: hookMocks.setRowAction,
    setPeaceAction: hookMocks.setPeaceAction,
    setBlockadeArea: hookMocks.setBlockadeArea,
    clearDraft: hookMocks.clearDraft,
    submit: hookMocks.submit,
    reload: hookMocks.reload,
    canSubmit: hookMocks.canSubmit,
  }),
}));

afterEach(() => {
  cleanup();
  hookMocks.stateFn.mockClear();
  hookMocks.submit.mockClear();
});

describe("DiplomacyScreen", () => {
  it("renders the real projection: relations rows, war list with scores, blockades", () => {
    render(<DiplomacyScreen sessionId="ses-1" />);

    // Relations rows with honest labels + tension + NAP badge.
    expect(screen.getByText("At war")).not.toBeNull();
    expect(screen.getByText("tension 9/10")).not.toBeNull();
    expect(screen.getByText("NAP")).not.toBeNull();
    expect(screen.getByText("France")).not.toBeNull();
    expect(screen.getByText("Germany")).not.toBeNull();

    // War list with sides, scores, status + the ACTIVE Accept-peace control.
    expect(screen.getByText("war_uk_france_1880-01")).not.toBeNull();
    expect(screen.getByText("score 3:1")).not.toBeNull();
    expect(screen.getByText("you: attacker")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Accept peace" })).toBeTruthy();

    // Blockade row with blockader → blockaded in an area (player = "your nation").
    expect(screen.getByText("your nation → France")).not.toBeNull();
  });

  it("renders honest empty states (no wars / no blockades) without fabrication", () => {
    const empty = makeLoaded({
      wars: [],
      blockades: [],
      relations: [
        {
          nationAId: "uk",
          nationBId: "germany",
          relation: "neutral",
          tension: 5,
          nap: false,
          since: "1880-01",
          partnerNationId: "germany",
          partnerName: "Germany",
        },
      ],
    });
    hookMocks.stateFn.mockReturnValue(empty);

    render(<DiplomacyScreen sessionId="ses-1" />);
    expect(screen.getByText("No wars yet")).not.toBeNull();
    expect(screen.getByText("No blockades yet")).not.toBeNull();
  });

  it("shows an engine-code rejection notice verbatim when the submit was rejected", () => {
    const loaded = makeLoaded();
    let submitting = diplomacyBeginSubmit(
      diplomacyBeginAction(loaded, "france", "DeclareWar"),
      "req-1",
    );
    submitting = diplomacySubmitRejected(submitting, {
      reason: "BLOCKADE_NOT_AT_WAR",
      diagnostics: ["uk is not at war with france"],
    });
    hookMocks.stateFn.mockReturnValue(submitting);

    render(<DiplomacyScreen sessionId="ses-1" />);
    expect(screen.getByText("Not applied")).not.toBeNull();
    expect(screen.getByText(/BLOCKADE_NOT_AT_WAR/)).not.toBeNull();
    expect(screen.getByText(/not at war/)).not.toBeNull();
  });

  it("displays the honest queued notice copy on the loaded screen", () => {
    render(<DiplomacyScreen sessionId="ses-1" />);
    expect(screen.getAllByText(/next turn advance/).length).toBeGreaterThanOrEqual(1);
  });
});
