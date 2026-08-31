// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SaveId } from "@cm-clone/contracts";
import {
  FAMILIARITY_TIERS,
  FORMATION_SLOTS,
  FORMATIONS,
  GOALKEEPING_ATTRIBUTES,
  HIDDEN_ATTRIBUTES,
  OUTFIELD_ATTRIBUTES,
  POSITION_ROLES,
  POSITIONS,
  STATURE_TIERS,
} from "@cm-clone/shared";
import { SquadScreen } from "../src/renderer/SquadScreen.js";
import { LeagueTableScreen } from "../src/renderer/LeagueTableScreen.js";
import { FixturesScreen } from "../src/renderer/FixturesScreen.js";
import { SeasonSummaryScreen } from "../src/renderer/SeasonSummaryScreen.js";
import { ClubSelectionScreen } from "../src/renderer/ClubSelectionScreen.js";
import { CreationStep1 } from "../src/renderer/CreationStep1.js";
import { TacticsScreen } from "../src/renderer/TacticsScreen.js";
import { TransfersScreen } from "../src/renderer/TransfersScreen.js";
import { MatchDayScreen } from "../src/renderer/MatchDayScreen.js";
import { setActiveMatch, clearActiveMatch } from "../src/renderer/match/session.js";
import { RegistryProvider } from "../src/renderer/rpc.js";

const rid = (s: string) => SaveId.make(s);

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const NOT_FOUND = { _tag: "SaveNotFoundError", id: rid("s1") };

const attributes = (value: number): Record<string, number> => ({
  ...Object.fromEntries(OUTFIELD_ATTRIBUTES.map((a) => [a, value])),
  ...Object.fromEntries(GOALKEEPING_ATTRIBUTES.map((a) => [a, value])),
  ...Object.fromEntries(HIDDEN_ATTRIBUTES.map((a) => [a, value])),
});

const playerRow = (id: string, name: string) => ({
  id: rid(id),
  firstName: name,
  lastName: "Player",
  dateOfBirth: "1990-01-01",
  age: 25,
  attributes: attributes(12),
  positions: [{ position: POSITIONS[2], familiarity: FAMILIARITY_TIERS[0] }],
  overallRating: 80,
  positionRatings: { ST: 12 },
  condition: 100,
  trainingFocus: null,
});

const squadView = (players: ReturnType<typeof playerRow>[]) => ({
  club: { id: rid("me"), name: "Test FC", statureTier: STATURE_TIERS[0] },
  players,
});

const leagueView = () => ({
  season: { seasonNumber: 1, currentMatchday: 1, phase: "in_season" as const },
  standings: [],
});

const fixturesView = () => ({
  season: { seasonNumber: 1, currentMatchday: 1, phase: "in_season" as const },
  fixtures: [
    {
      id: rid("f1"),
      matchday: 1,
      homeClubId: rid("home"),
      homeClubName: "Home FC",
      awayClubId: rid("away"),
      awayClubName: "Away FC",
      homeGoals: null,
      awayGoals: null,
      played: false,
    },
  ],
});

const seasonSummaryView = () => ({
  season: { seasonNumber: 1, currentMatchday: 38, phase: "season_complete" as const },
  standings: [],
  clubId: rid("me"),
  clubName: "My Club",
  finalPosition: 4,
  boardObjective: null,
  managerOutcome: "none" as const,
  consecutiveMisses: 0,
  archivedCause: null,
});

const clubSelectionView = () => ({
  clubs: [
    {
      clubId: rid("c1"),
      clubName: "Select FC",
      statureTier: STATURE_TIERS[0],
      boardObjectiveMin: 6,
      boardObjectiveMax: 10,
      squadQualityBand: "Competitive" as const,
      transferBudget: 1000000,
      wageBudget: 900000,
    },
  ],
});

const transfersView = () => ({
  club: { id: rid("me"), name: "My Club", statureTier: STATURE_TIERS[0] },
  season: { seasonNumber: 1, currentMatchday: 1, phase: "in_season" as const },
  windowOpen: true,
  transferBudgetRemaining: 500000,
  wageBudget: 1000000,
  wageBudgetUsed: 300000,
  incomingBids: [
    {
      id: rid("in-1"),
      playerId: rid("p-in"),
      playerName: "Incoming",
      sellingClubId: rid("me"),
      sellingClubName: "My Club",
      biddingClubId: rid("other"),
      biddingClubName: "Other FC",
      amount: 100,
      counterAmount: null,
      status: "pending" as const,
    },
  ],
  outgoingBids: [],
  freeAgents: [
    {
      id: rid("fa"),
      firstName: "Free",
      lastName: "Agent",
      age: 24,
      clubId: null,
      clubName: null,
      overallRating: 78,
      transferValue: 1200000,
      positions: [],
    },
  ],
  marketPlayers: [
    {
      id: rid("mp"),
      firstName: "Market",
      lastName: "Player",
      age: 24,
      clubId: rid("club-mp"),
      clubName: "Club MP",
      overallRating: 78,
      transferValue: 1200000,
      positions: [],
    },
  ],
});

const tacticsView = () => ({
  club: { id: rid("me"), name: "My Club", statureTier: STATURE_TIERS[0] },
  squad: [],
  tactic: null,
});

const noSubs = () => ({
  used: 0,
  remaining: 5,
  windowsUsed: 0,
  windowsRemaining: 3,
  capReached: false,
});

const resumedMatch = () => ({
  saveId: rid("s1"),
  match: {
    matchId: rid("m1"),
    homeClubId: rid("home"),
    homeClubName: "Home FC",
    awayClubId: rid("away"),
    awayClubName: "Away FC",
  },
  cursor: 0,
  revealed: [],
  homeScore: 0,
  awayScore: 0,
  isComplete: false,
  homeSubs: noSubs(),
  awaySubs: noSubs(),
  homeOnPitchCount: 11,
  awayOnPitchCount: 11,
  chunkInjuries: [],
  currentMinute: 1,
  streamComplete: false,
});

afterEach(() => {
  cleanup();
  clearActiveMatch(rid("s1"));
});

describe("AC-22 — level 1: correct tab order, visible focus ring, Enter/Space on every control", () => {
  it("Squad roving grid exposes exactly one tab stop into the row sequence", async () => {
    mockPreload(async (method) =>
      method === "getSquad"
        ? ({ _tag: "Success", value: squadView([playerRow("p1", "Alan"), playerRow("p2", "Bob"), playerRow("p3", "Cal")]) } as never)
        : ({ _tag: "Failure", error: NOT_FOUND } as never),
    );
    render(
      <RegistryProvider>
        <SquadScreen saveId={rid("s1")} />
      </RegistryProvider>,
    );
    await screen.findByText(/Alan Player/);
    // Stage 5 (AC-28) moved the roving tab stop from the `<tr>` onto the
    // per-row player-name button — one focusable control per row, never a bare
    // `<tr tabindex=0>`. `data-focus-id` now lives on that button.
    const nameButtons = [...document.querySelectorAll("button[data-focus-id]")];
    expect(nameButtons.length).toBe(3);
    const tabStops = nameButtons.filter((b) => b.getAttribute("tabindex") === "0");
    expect(tabStops.length).toBe(1);
  });

  it("ArrowDown roves focus to the next row and swaps the active tab stop (AC-21 roving)", async () => {
    mockPreload(async (method) =>
      method === "getSquad"
        ? ({ _tag: "Success", value: squadView([playerRow("p1", "Alan"), playerRow("p2", "Bob"), playerRow("p3", "Cal")]) } as never)
        : ({ _tag: "Failure", error: NOT_FOUND } as never),
    );
    render(
      <RegistryProvider>
        <SquadScreen saveId={rid("s1")} />
      </RegistryProvider>,
    );
    await screen.findByText(/Alan Player/);
    const tbody = document.querySelector("tbody")!;
    tbody.focus();

    // Focus the first row's name button, then press ArrowDown.
    const firstRow = document.querySelector('[data-focus-id="squad.squadTable.p1"]') as HTMLElement;
    firstRow.focus();
    fireEvent.keyDown(tbody, { key: "ArrowDown" });
    expect(document.activeElement?.getAttribute("data-focus-id")).toBe("squad.squadTable.p2");
    const tabStops = [...document.querySelectorAll("button[data-focus-id]")].filter(
      (b) => b.getAttribute("tabindex") === "0",
    );
    expect(tabStops.length).toBe(1);
    expect(tabStops[0]!.getAttribute("data-focus-id")).toBe("squad.squadTable.p2");
  });

  it("Squad rows carry the :focus-visible ring treatment", async () => {
    mockPreload(async (method) =>
      method === "getSquad"
        ? ({ _tag: "Success", value: squadView([playerRow("p1", "Alan")]) } as never)
        : ({ _tag: "Failure", error: NOT_FOUND } as never),
    );
    render(
      <RegistryProvider>
        <SquadScreen saveId={rid("s1")} />
      </RegistryProvider>,
    );
    await screen.findByText(/Alan Player/);
    const row = document.querySelector('[data-focus-id="squad.squadTable.p1"]')!;
    expect(row.className).toContain("focus-visible:ring-2");
  });

  it("the League Continue button is a native button (Enter/Space work) with the focus ring", async () => {
    mockPreload(async (method) =>
      method === "getLeagueTable"
        ? ({ _tag: "Success", value: leagueView() } as never)
        : ({ _tag: "Failure", error: NOT_FOUND } as never),
    );
    render(
      <RegistryProvider>
        <LeagueTableScreen saveId={rid("s1")} />
      </RegistryProvider>,
    );
    const button = (await screen.findByRole("button", { name: /Advance Calendar/ })) as HTMLElement;
    expect(button.tagName).toBe("BUTTON");
    expect(button.className).toContain("focus-visible:ring-2");
    button.focus();
    expect(button).toBe(document.activeElement);
  });

  it("the read-only Fixtures screen exposes a focusable main region with the ring", async () => {
    mockPreload(async (method) => {
      if (method === "getFixtures") return { _tag: "Success", value: fixturesView() } as never;
      return { _tag: "Failure", error: NOT_FOUND } as never;
    });
    render(
      <RegistryProvider>
        <FixturesScreen saveId={rid("s1")} />
      </RegistryProvider>,
    );
    await screen.findByText(/Home FC vs Away FC/);
    const main = document.querySelector("main") as HTMLElement;
    expect(main.tabIndex).toBe(-1);
    expect(main.className).toContain("focus-visible:ring-2");
    main.focus();
    expect(main).toBe(document.activeElement);
  });

  it("the read-only Season Summary screen exposes a focusable main region with the ring", async () => {
    mockPreload(async (method) => {
      if (method === "getSeasonSummary") return { _tag: "Success", value: seasonSummaryView() } as never;
      return { _tag: "Failure", error: NOT_FOUND } as never;
    });
    render(
      <RegistryProvider>
        <SeasonSummaryScreen saveId={rid("s1")} />
      </RegistryProvider>,
    );
    await screen.findByText(/Final League position/);
    const main = document.querySelector("main") as HTMLElement;
    expect(main.tabIndex).toBe(-1);
    expect(main.className).toContain("focus-visible:ring-2");
    main.focus();
    expect(main).toBe(document.activeElement);
  });

  it("the read-only Club Selection screen exposes a focusable region with the ring", async () => {
    mockPreload(async (method) => {
      if (method === "getClubSelection") {
        return { _tag: "Success", value: clubSelectionView() } as never;
      }
      return { _tag: "Failure", error: NOT_FOUND } as never;
    });
    render(
      <RegistryProvider>
        <ClubSelectionScreen saveId={rid("s1")} />
      </RegistryProvider>,
    );
    await screen.findByText(/Select FC/);
    const region = document.querySelector("div[tabindex]") as HTMLElement;
    expect(region.tabIndex).toBe(-1);
    expect(region.className).toContain("focus-visible:ring-2");
    region.focus();
    expect(region).toBe(document.activeElement);
  });

  it("CreationStep1: every control is natively focusable with the ring, inputs first in tab order", () => {
    render(
      <CreationStep1
        saveName=""
        managerName=""
        archetype="professor"
        pillars={{ tacticalAcumen: 3, influence: 3, regimen: 3, technicalCoaching: 3 }}
        onSaveNameChange={() => undefined}
        onManagerNameChange={() => undefined}
        onArchetypeChange={() => undefined}
        onPillarsChange={() => undefined}
      />,
    );
    const controls = [...document.querySelectorAll("input, button")];
    expect(controls.length).toBeGreaterThan(0);
    expect(controls[0]!.getAttribute("placeholder")).toBe("My Career");
    for (const control of controls) {
      expect(control.className).toContain("focus-visible:ring-2");
      // Draft, empty props: no native tabindex override — all controls in tab order.
      expect(control.getAttribute("tabindex")).toBeNull();
    }
  });

  it("Transfers buttons and inputs carry the level-1 ring; roving name buttons keep their roving tabindex", async () => {
    mockPreload(async (method) => {
      if (method === "getTransfersScreen") return { _tag: "Success", value: transfersView() } as never;
      return { _tag: "Failure", error: NOT_FOUND } as never;
    });
    render(
      <RegistryProvider>
        <TransfersScreen saveId={rid("s1")} />
      </RegistryProvider>,
    );
    // Stage 5 (AC-29) moved bid entry out of the rows into an Actions region
    // shown when a player is selected — so the Sign/Bid controls only render
    // once the market player is selected.
    const marketName = await screen.findByRole("button", { name: /Market Player/ });
    fireEvent.click(marketName);
    const buttons = [...document.querySelectorAll("button")] as HTMLElement[];
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      expect(button.className).toContain("focus-visible:ring-2");
      if (button.hasAttribute("data-focus-id")) {
        // Row-roving controls (AC-28): the one focusable control per row keeps
        // its roving tabindex — the composite-widget carve-out in the focus model.
        expect(["0", "-1"]).toContain(button.getAttribute("tabindex"));
      } else {
        expect(button.getAttribute("tabindex")).toBeNull();
      }
    }
    const inputs = [...document.querySelectorAll("input")] as HTMLElement[];
    expect(inputs.length).toBeGreaterThan(0);
    for (const input of inputs) {
      expect(input.className).toContain("focus-visible:ring-2");
    }
  });

  it("Tactics controls carry the level-1 ring (formation, sliders, save)", async () => {    mockPreload(async (method) => {
      if (method === "getTactics") return { _tag: "Success", value: tacticsView() } as never;
      return { _tag: "Failure", error: NOT_FOUND } as never;
    });
    render(
      <RegistryProvider>
        <TacticsScreen saveId={rid("s1")} />
      </RegistryProvider>,
    );
    await screen.findByRole("button", { name: /Save Tactic/ });
    const buttony = [...document.querySelectorAll("button")] as HTMLElement[];
    expect(buttony.length).toBeGreaterThan(0);
    for (const button of buttony) {
      expect(button.className).toContain("focus-visible:ring-2");
    }
    const selects = [...document.querySelectorAll("select")] as HTMLElement[];
    for (const select of selects) {
      expect(select.className).toContain("focus-visible:ring-2");
    }
  });

  it("MatchDay live-control buttons carry the level-1 ring", async () => {
    setActiveMatch(resumedMatch());
    const formation = FORMATIONS[0];
    mockPreload(async (method) => {
      if (method === "getTactics") {
        return {
          _tag: "Success",
          value: {
            club: { id: rid("me"), name: "My Club", statureTier: STATURE_TIERS[0] },
            squad: [],
            tactic: {
              formation,
              slots: (FORMATION_SLOTS[formation] ?? []).map((position, index) => ({
                position,
                role: POSITION_ROLES[position],
                playerId: rid(`p-${index}`),
              })),
              mentality: "balanced",
              tempo: "normal",
              pressing: "medium",
            },
          },
        } as never;
      }
      if (method === "resumeSimulation") {
        return {
          _tag: "Success",
          value: {
            matchId: rid("m1"),
            cursor: 0,
            isComplete: false,
            homeScore: 0,
            awayScore: 0,
            lines: [],
            homeSubs: noSubs(),
            awaySubs: noSubs(),
            injuredClubIds: [],
            injuries: [],
            homeOnPitchCount: 11,
            awayOnPitchCount: 11,
            conditions: {},
          },
        } as never;
      }
      return { _tag: "Failure", error: NOT_FOUND } as never;
    });
    render(
      <RegistryProvider>
        <MatchDayScreen saveId={rid("s1")} />
      </RegistryProvider>,
    );
    const toggle = (await screen.findByRole("button", { name: /Tactics & substitutions/ })) as HTMLElement;
    expect(toggle.className).toContain("focus-visible:ring-2");
    toggle.focus();
    expect(toggle).toBe(document.activeElement);
    fireEvent.click(toggle);
    const apply = (await screen.findByRole("button", { name: /Apply tactics change/ })) as HTMLElement;
    expect(apply.className).toContain("focus-visible:ring-2");
  });
});
