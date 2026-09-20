import { describe, expect, it, vi } from "vitest";

import {
  ClubId as ClubIdSchema,
  CompetitionId, MatchId,
  PlayerId,
  SaveId as SaveIdSchema,
  type ClubId,
  type SaveId,
} from "@cm-clone/contracts";
import { bindRouter, navigate } from "../../../src/renderer/navigation/adapter.js";
import {
  resolveDestination,
  type CareerDestination,
  type NavigationDestination,
} from "../../../src/renderer/navigation/destinations.js";

const save = (id: string): SaveId => SaveIdSchema.make(id);
const club = (id: string): ClubId => ClubIdSchema.make(id);

/** A router stand-in that records what the adapter asked for. */
const spyRouter = () => {
  const navigateSpy = vi.fn();
  bindRouter({
    navigate: navigateSpy,
    history: { back: () => undefined, forward: () => undefined, canGoBack: () => false },
  } as never);
  return navigateSpy;
};

const saveId = save("save-1");
const clubId = club("club-7");
const competitionId = CompetitionId.make("comp_eng_1");
const playerId = PlayerId.make("player-3");
const matchId = MatchId.make("m1");

/**
 * One sample destination per union member, keyed by its own discriminant. Both a missing key and a
 * sample filed under the wrong key are compile errors, and `apps/desktop`'s tsconfig includes
 * `test/`, so `pnpm -r typecheck` is what enforces it.
 */
type SamplesOf<T extends NavigationDestination> = {
  readonly [K in T["type"]]: Extract<T, { readonly type: K }>;
};

/**
 * Every destination the app can build, exhaustive over `CareerDestination` by construction rather
 * than by diligence.
 *
 * The previous version spread `CAREER_SCREEN_TYPES` and hand-listed the sub-surfaces beside it,
 * which made the sweep only as complete as the last person to remember this file. It was not
 * complete: `contractExpiry`, `budgetReview`, `transferHistory`, `playerDetail` and
 * `trainingCoaching` — five, counted against the union rather than estimated — were all missing,
 * so the adapter fall-through this file exists to prevent was unguarded for every one of them
 * while the doc comment claimed the sweep ran "over the real set". Add a member to
 * `CareerDestination` now and the build stops here with `Property '<name>' is missing`.
 */
const CAREER_DESTINATIONS: SamplesOf<CareerDestination> = {
  squad: { type: "squad", saveId },
  tactics: { type: "tactics", saveId },
  tacticsEditor: { type: "tacticsEditor", saveId },
  transfers: { type: "transfers", saveId },
  contractExpiry: { type: "contractExpiry", saveId },
  budgetReview: { type: "budgetReview", saveId },
  transferHistory: { type: "transferHistory", saveId },
  league: { type: "league", saveId },
  fixtures: { type: "fixtures", saveId },
  match: { type: "match", saveId },
  seasonSummary: { type: "seasonSummary", saveId },
  manager: { type: "manager", saveId },
  news: { type: "news", saveId },
  training: { type: "training", saveId },
  trainingWorkload: { type: "trainingWorkload", saveId },
  trainingCoaching: { type: "trainingCoaching", saveId },
  trainingPlan: { type: "trainingPlan", saveId, playerId },
  trainingDevelopment: { type: "trainingDevelopment", saveId },
  clubInfo: { type: "clubInfo", saveId },
  boardConfidence: { type: "boardConfidence", saveId },
  finances: { type: "finances", saveId },
  staffOverview: { type: "staffOverview", saveId },
  shortlist: { type: "shortlist", saveId },
  scouting: { type: "scouting", saveId },
  scoutingAssignment: { type: "scoutingAssignment", saveId },
  scoutingKnowledge: { type: "scoutingKnowledge", saveId },
  playerSearch: { type: "playerSearch", saveId },
  staffSearch: { type: "staffSearch", saveId },
  competitions: { type: "competitions", saveId },
  nations: { type: "nations", saveId },
  clubs: { type: "clubs", saveId },
  teamScoutReport: { type: "teamScoutReport", saveId, clubId },
  clubStaff: { type: "clubStaff", saveId, clubId },
  clubInformation: { type: "clubInformation", saveId, clubId },
  clubFixturesDetail: { type: "clubFixturesDetail", saveId, clubId },
  clubTransfersDetail: { type: "clubTransfersDetail", saveId, clubId },
  clubFinancesDetail: { type: "clubFinancesDetail", saveId, clubId },
  competitionOverview: { type: "competitionOverview", saveId, competitionId },
  competitionTable: { type: "competitionTable", saveId, competitionId },
  competitionFixturesDetail: { type: "competitionFixturesDetail", saveId, competitionId },
  competitionResults: { type: "competitionResults", saveId, competitionId },
  playerDetail: { type: "playerDetail", saveId, playerId },
  playerDevelopment: { type: "playerDevelopment", saveId, playerId },
  playerContract: { type: "playerContract", saveId, playerId },
  matchMatchTactics: { type: "matchMatchTactics", saveId },
  matchSubstitutions: { type: "matchSubstitutions", saveId },
  matchStats: { type: "matchStats", saveId },
  matchRatings: { type: "matchRatings", saveId },
  matchReport: { type: "matchReport", saveId, matchId },
  matchCommentary: { type: "matchCommentary", saveId },
  matchLatestScores: { type: "matchLatestScores", saveId },
  matchLiveTable: { type: "matchLiveTable", saveId },
};

/** The main menu, the load screen, and the four creation steps — everything outside a save. */
const PRE_CAREER_DESTINATIONS: SamplesOf<Exclude<NavigationDestination, CareerDestination>> = {
  mainMenu: { type: "mainMenu" },
  loadCareer: { type: "loadCareer" },
  createLeagues: { type: "createLeagues" },
  createStep1: { type: "createStep1" },
  createStep2: { type: "createStep2" },
  createStep3: { type: "createStep3" },
};

const ALL_DESTINATIONS: ReadonlyArray<NavigationDestination> = [
  ...Object.values(PRE_CAREER_DESTINATIONS),
  ...Object.values(CAREER_DESTINATIONS),
];

describe("the navigation adapter reaches the router for every destination", () => {
  /**
   * The News Inbox regression. `resolveDestination` mapped news to its route all along; the
   * adapter's switch had no arm for that route and no `default`, so the call fell through and
   * returned silently. Clicking Inbox left the previous screen on screen with no error anywhere.
   */
  it("navigates to the News Inbox", () => {
    const navigateSpy = spyRouter();
    navigate({ type: "news", saveId: save("save-1") });
    expect(navigateSpy).toHaveBeenCalledWith({
      to: "/career/$saveId/news",
      params: { saveId: save("save-1") },
    });
  });

  it("navigates to Workload and Recovery beneath the Training area (Screen 112)", () => {
    const navigateSpy = spyRouter();
    navigate({ type: "trainingWorkload", saveId: save("save-1") });
    expect(navigateSpy).toHaveBeenCalledWith({
      to: "/career/$saveId/training/workload",
      params: { saveId: save("save-1") },
    });
  });

  it("navigates to a player's Individual Training Plan beneath the Training area (Screen 108)", () => {
    const navigateSpy = spyRouter();
    navigate({ type: "trainingPlan", saveId: save("save-1"), playerId: PlayerId.make("player-3") });
    expect(navigateSpy).toHaveBeenCalledWith({
      to: "/career/$saveId/training/plan/$playerId",
      params: { saveId: save("save-1"), playerId: PlayerId.make("player-3") },
    });
  });

  it("navigates to Scouting Assignment beside the Scouting Centre (Screen 121)", () => {
    const navigateSpy = spyRouter();
    navigate({ type: "scoutingAssignment", saveId: save("save-1") });
    expect(navigateSpy).toHaveBeenCalledWith({
      to: "/career/$saveId/scouting-assignment",
      params: { saveId: save("save-1") },
    });
  });

  it("navigates to Scouting Knowledge beside the Scouting Centre (Screen 126)", () => {
    const navigateSpy = spyRouter();
    navigate({ type: "scoutingKnowledge", saveId: save("save-1") });
    expect(navigateSpy).toHaveBeenCalledWith({
      to: "/career/$saveId/scouting-knowledge",
      params: { saveId: save("save-1") },
    });
  });

  it("navigates to the Player Development Centre beneath the Training area (Screen 114)", () => {
    const navigateSpy = spyRouter();
    navigate({ type: "trainingDevelopment", saveId: save("save-1") });
    expect(navigateSpy).toHaveBeenCalledWith({
      to: "/career/$saveId/training/development-centre",
      params: { saveId: save("save-1") },
    });
  });

  it("navigates to a player's Player Development screen (Screen 114's per-player link)", () => {
    const navigateSpy = spyRouter();
    navigate({ type: "playerDevelopment", saveId: save("save-1"), playerId: PlayerId.make("player-3") });
    expect(navigateSpy).toHaveBeenCalledWith({
      to: "/career/$saveId/player/$playerId/development",
      params: { saveId: save("save-1"), playerId: PlayerId.make("player-3") },
    });
  });

  /**
   * The bug's class, not just its instance. A silent fall-through is invisible per-route: the arm
   * for news went missing exactly the way the next one will, and only a sweep over the whole
   * destination set catches that. Asserting against `resolveDestination` keeps the two switches
   * honest to each other rather than to a third list that can drift from both.
   */
  it.each(ALL_DESTINATIONS.map((d) => [d.type, d] as const))(
    "reaches the router for %s",
    (_type, destination) => {
      const navigateSpy = spyRouter();
      navigate(destination);
      const resolved = resolveDestination(destination);
      expect(navigateSpy).toHaveBeenCalledTimes(1);
      expect(navigateSpy.mock.calls[0]?.[0]).toMatchObject({ to: resolved.to });
    },
  );
});
