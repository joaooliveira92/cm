// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ClubId, MatchId, SaveId } from "@cm-clone/contracts";
import {
  FORMATION_SLOTS,
  FORMATIONS,
  POSITION_ROLES,
  STATURE_TIERS,
} from "@cm-clone/shared";
import { LeagueTableScreen } from "../src/renderer/leagueTable/LeagueTableScreen.js";
import { TransfersScreen } from "../src/renderer/transfers/TransfersScreen.js";
import { TacticsScreen } from "../src/renderer/tactics/TacticsScreen.js";
import { MatchDayScreen } from "../src/renderer/match/MatchDayScreen.js";
import { setActiveMatch, clearActiveMatch } from "../src/renderer/match/session.js";
import { RegistryProvider } from "../src/renderer/rpc.js";
import {
  ACTION_REGISTRY,
  ALL_ACTIONS,
} from "../src/renderer/actions/allActions.js";
import { hasActionHandler, resetActionHandlers } from "../src/renderer/actions/dispatch.js";

const rid = (id: string) => SaveId.make(id);

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const NOT_FOUND = { _tag: "SaveNotFoundError", id: rid("s1") };

const leagueView = () => ({
  season: { seasonNumber: 1, currentDate: "2026-08-01", phase: "in_season" as const },
  standings: [],
});

const marketPlayer = (id: string, club: boolean) => ({
  id: rid(id),
  firstName: "Test",
  lastName: id.toUpperCase(),
  age: 24,
  clubId: club ? rid(`club-${id}`) : null,
  clubName: club ? `Club ${id}` : null,
  overallRating: 78,
  transferValue: 1200000,
  positions: [],
});

const transfersView = () => ({
  club: { id: rid("me"), name: "My Club", statureTier: STATURE_TIERS[0] },
  season: { seasonNumber: 1, currentDate: "2026-08-01", phase: "in_season" as const },
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
  outgoingBids: [
    {
      id: rid("out-1"),
      playerId: rid("p-out"),
      playerName: "Outgoing",
      sellingClubId: rid("sel"),
      sellingClubName: "Seller FC",
      biddingClubId: rid("me"),
      biddingClubName: "My Club",
      amount: 200,
      counterAmount: 250,
      status: "countered" as const,
    },
  ],
  freeAgents: [marketPlayer("fa", false)],
  marketPlayers: [marketPlayer("mp", true)],
});

const tacticsView = (tactic?: unknown) => ({
  club: { id: rid("me"), name: "My Club", statureTier: STATURE_TIERS[0] },
  squad: [],
  tactic: tactic ?? null,
});

/** A minimal valid tactic so the live Match Day control panel has something to edit. */
const fullTactic = () => {
  const formation = FORMATIONS[0];
  return {
    formation,
    slots: (FORMATION_SLOTS[formation] ?? []).map((position, index) => ({
      position,
      role: POSITION_ROLES[position],
      playerId: rid(`slot-${index}`),
    })),
    mentality: "balanced",
    tempo: "normal",
    pressing: "medium",
  };
};

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
    matchId: MatchId.make("m1"),
    homeClubId: ClubId.make("home"),
    homeClubName: "Home FC",
    awayClubId: ClubId.make("away"),
    awayClubName: "Away FC",
  },
  cursor: 0,
  revealed: [],
  homeScore: 0,
  awayScore: 0,
  isComplete: false,
  // The session is mid-stream: `resumedMatch` stands in for a live resume, which is the
  // phase the control panel stays mounted in.
  phase: "live" as const,
  homeSubs: noSubs(),
  awaySubs: noSubs(),
  homeOnPitchCount: 11,
  awayOnPitchCount: 11,
  chunkInjuries: [],
  currentMinute: 1,
  streamComplete: false,
});

beforeEach(() => {
  cleanup();
  resetActionHandlers();
});
afterEach(() => {
  cleanup();
  resetActionHandlers();
  clearActiveMatch(rid("s1"));
});

const renderedActionIds = (): string[] =>
  [...document.querySelectorAll("[data-action-id]")].map(
    (el) => el.getAttribute("data-action-id")!,
  );

describe("AC-16 — every button on a converted screen dispatches a registered Action", () => {
  it("the canonical registry is collision-free (AC-17 collection guard)", () => {
    expect(ACTION_REGISTRY.collisions).toEqual([]);
    expect(ACTION_REGISTRY.all.length).toBe(ALL_ACTIONS.length);
  });

  it("the League button dispatches the registered advance-calendar action for the league scope", async () => {
    mockPreload(async (method) => {
      if (method === "getLeagueTable") return { _tag: "Success", value: leagueView() } as never;
      return { _tag: "Failure", error: NOT_FOUND } as never;
    });
    render(
      <RegistryProvider>
        <LeagueTableScreen saveId={rid("s1")} />
      </RegistryProvider>,
    );
    await screen.findByRole("button", { name: /Advance Calendar/ });
    const ids = renderedActionIds();
    expect(ids).toContain("advance-calendar");
    const registered = ACTION_REGISTRY.get("advance-calendar");
    expect(registered?.scope).toBe("league");
  });

  it("every rendered Transfers button maps to a registered action in the transfers scope", async () => {
    mockPreload(async (method) => {
      if (method === "getTransfersScreen") return { _tag: "Success", value: transfersView() } as never;
      return { _tag: "Failure", error: NOT_FOUND } as never;
    });
    render(
      <RegistryProvider>
        <TransfersScreen saveId={rid("s1")} />
      </RegistryProvider>,
    );
    // Stage 5 (AC-29): bid entry moved out of the rows into a contextual
    // Actions region shown when a player is selected — so place-bid and
    // sign-free-agent only render under a selection.
    await screen.findByRole("button", { name: /Test MP/ });
    const baseIds = renderedActionIds();
    const expectedInitial = [
      "respond-accept",
      "respond-reject",
      "respond-counter",
      "accept-counter",
      "withdraw-bid",
    ];
    expect(new Set(baseIds)).toEqual(new Set(expectedInitial));

    // Select the Market player → the Actions region exposes the bid controls.
    fireEvent.click(screen.getByRole("button", { name: /Test MP/ }));
    const withMarketSelection = renderedActionIds();
    expect(withMarketSelection).toContain("place-bid");
    expect(withMarketSelection).not.toContain("sign-free-agent");

    // Deselect, select the Free Agent → the Sign path replaces the bid input.
    fireEvent.click(screen.getByRole("button", { name: /Test FA/ }));
    const withFreeAgentSelection = renderedActionIds();
    expect(withFreeAgentSelection).toContain("sign-free-agent");
    expect(withFreeAgentSelection).not.toContain("place-bid");

    for (const id of new Set([...withMarketSelection, ...withFreeAgentSelection])) {
      const registered = ACTION_REGISTRY.get(id);
      expect(registered, `registry missing ${id}`).toBeDefined();
      expect(registered!.scope).toBe("transfers");
    }
  });

  it("no button on a converted screen lacks a registry entry (no half-conversion)", async () => {
    const allIds = ALL_ACTIONS.map((a) => a.id);
    // The registry exposes every dispatcher-facing id; a rendered data-action-id
    // must always be present in it.
    mockPreload(async (method) => {
      if (method === "getTransfersScreen") return { _tag: "Success", value: transfersView() } as never;
      if (method === "getLeagueTable") return { _tag: "Success", value: leagueView() } as never;
      return { _tag: "Failure", error: NOT_FOUND } as never;
    });
    render(
      <RegistryProvider>
        <TransfersScreen saveId={rid("s1")} />
      </RegistryProvider>,
    );
    await screen.findByRole("button", { name: /Test MP/ });
    for (const id of renderedActionIds()) {
      expect(allIds).toContain(id);
    }
  });

  it("every rendered Tactics control maps to a registered action in the tactics scope", async () => {
    mockPreload(async (method) => {
      if (method === "getTactics") return { _tag: "Success", value: tacticsView() } as never;
      return { _tag: "Failure", error: NOT_FOUND } as never;
    });
    render(
      <RegistryProvider>
        <TacticsScreen saveId={rid("s1")} />
      </RegistryProvider>,
    );
    await screen.findByRole("button", { name: /Save Tactic/ });
    const ids = renderedActionIds();
    const expected = [
      "assign-slot-player",
      "save-tactic",
      "set-formation",
      "set-mentality",
      "set-pressing",
      "set-tempo",
    ];
    expect(new Set(ids)).toEqual(new Set(expected));
    for (const id of ids) {
      const registered = ACTION_REGISTRY.get(id);
      expect(registered, `registry missing ${id}`).toBeDefined();
      expect(registered!.scope).toBe("tactics");
      // A listable-but-undispatchable Action is the AC-16 palette lie: the live
      // screen must have a handler while it is mounted.
      expect(hasActionHandler(id), `${id} has no live handler`).toBe(true);
    }
  });

  it("every rendered MatchDay control maps to a registered action in the match scope", async () => {
    setActiveMatch(resumedMatch());
    mockPreload(async (method) => {
      if (method === "getTactics") {
        return { _tag: "Success", value: tacticsView(fullTactic()) } as never;
      }
      // A live, not-yet-complete resume keeps the control panel mounted for the
      // whole assertion (a Failure would complete the match within one reveal tick).
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
    fireEvent.click(await screen.findByRole("button", { name: /Tactics & substitutions/ }));
    await screen.findByRole("button", { name: /Apply tactics change/ });
    const ids = renderedActionIds();
    const expected = [
      "apply-live-tactics",
      "make-substitution",
      "set-live-mentality",
      "set-live-pressing",
      "set-live-substitute-in",
      "set-live-substitute-off",
      "set-live-tempo",
      "toggle-control-panel",
    ];
    expect(new Set(ids)).toEqual(new Set(expected));
    for (const id of ids) {
      const registered = ACTION_REGISTRY.get(id);
      expect(registered, `registry missing ${id}`).toBeDefined();
      expect(registered!.scope).toBe("match");
      expect(hasActionHandler(id), `${id} has no live handler`).toBe(true);
    }
    // The match-scope actions that show only in deep injury states are still
    // registered, dispatchable, and listed by the registry for this scope.
    const matchActive = ACTION_REGISTRY.active("match", { ready: true }).map((a) => a.id);
    for (const id of ["play-on", "bring-off", "start-match", "reset-match"]) {
      expect(matchActive).toContain(id);
      expect(hasActionHandler(id), `${id} has no live handler`).toBe(true);
    }
  });
});
