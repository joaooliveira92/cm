import type { LinkOptions } from "@tanstack/react-router";
import type { ClubId, CompetitionId, MatchId, PlayerId, SaveId } from "@cm-clone/contracts";
import { playerComparisonKey } from "./params.js";

/**
 * Typed navigation destinations. The keyboard spine (ticket 17), the command
 * palette (ticket 07), and the career shell all express navigation as one of
 * these closed values with typed parameters — never a raw path template — and
 * resolve it through `resolveDestination`/the navigation adapter.
 *
 * The set is deliberately closed: `mainMenu`, the four creation steps
 * (league selection, then manager, club, and review), and the nine
 * persistent career screens. Career `g <key>` bindings draw from
 * `SaveScopedCareerDestinationType` only (each section's `defaultDestination`
 * in `NAV_SECTIONS`, bound in `ALL_ACTIONS`), which excludes the creation steps,
 * the main menu, and the load screen by construction.
 */
export type CareerDestination =
  | { readonly type: "squad"; readonly saveId: SaveId }
  | { readonly type: "squadStaff"; readonly saveId: SaveId }
  /** Squad History — work in progress placeholder, save-scoped like squad itself. */
  | { readonly type: "squadHistory"; readonly saveId: SaveId }
  /** Squad Information — work in progress placeholder, save-scoped like squad itself. */
  | { readonly type: "squadInformation"; readonly saveId: SaveId }
  /** Squad Finances — work in progress placeholder, save-scoped like squad itself. */
  | { readonly type: "squadFinances"; readonly saveId: SaveId }
  | { readonly type: "tactics"; readonly saveId: SaveId }
  /** The tactics editor — a sub-surface of the Tactics area reached from the read-only overview,
   *  not a top-level career screen (no `g` binding, not in `CAREER_SCREEN_TYPES`). */
  | { readonly type: "tacticsEditor"; readonly saveId: SaveId }
  | { readonly type: "transfers"; readonly saveId: SaveId }
  | { readonly type: "contractExpiry"; readonly saveId: SaveId }
  | { readonly type: "budgetReview"; readonly saveId: SaveId }
  | { readonly type: "transferHistory"; readonly saveId: SaveId }
  | { readonly type: "league"; readonly saveId: SaveId }
  | { readonly type: "fixtures"; readonly saveId: SaveId }
  | { readonly type: "match"; readonly saveId: SaveId }
  | { readonly type: "seasonSummary"; readonly saveId: SaveId }
  | { readonly type: "manager"; readonly saveId: SaveId }
  /** Manager Inbox (tab under Manager section) */
  | { readonly type: "managerInbox"; readonly saveId: SaveId }
  /** Manager Board Confidence (tab under Manager section) */
  | { readonly type: "managerConfidence"; readonly saveId: SaveId }
  /** Manager Notes (tab under Manager section) */
  | { readonly type: "managerNotes"; readonly saveId: SaveId }
  /** Manager Jobs (tab under Manager section) */
  | { readonly type: "managerJobs"; readonly saveId: SaveId }
  /** Manager Responsibilities (tab under Manager section) */
  | { readonly type: "managerResponsibilities"; readonly saveId: SaveId }
  /** Manager Career History (tab under Manager section) */
  | { readonly type: "managerCareer"; readonly saveId: SaveId }
  | { readonly type: "news"; readonly saveId: SaveId }
  | { readonly type: "training"; readonly saveId: SaveId }
  /** Workload and Recovery (Screen 112) — a sub-surface of the Training area reached from Coaching
   *  Assignments, shaped like `tacticsEditor`: no `g` binding, not in `CAREER_SCREEN_TYPES`. */
  | { readonly type: "trainingWorkload"; readonly saveId: SaveId }
  /** Training Schedule (training-schedule-and-delegation 03): the microcycle's sessions, beneath the
   *  Training area and in its `training` screen scope. */
  | { readonly type: "trainingSchedule"; readonly saveId: SaveId }
  /** Coaching Assignments (Screen 111) — the full coaching staff list, reached from the Training
   *  Overview. A sub-surface of the Training area like Workload and Recovery. */
  | { readonly type: "trainingCoaching"; readonly saveId: SaveId }
  /** Individual Training Plan (Screen 108) — one own-club player's Training Focus, a sub-surface of
   *  the Training area reached from a Workload and Recovery row. It names its player, so it is
   *  excluded from save-scoped nav like `playerDetail`. */
  | { readonly type: "trainingPlan"; readonly saveId: SaveId; readonly playerId: PlayerId }
  /** Player Development Centre (Screen 114) — the squad-wide development view, a sub-surface of the
   *  Training area reached from Coaching Assignments, shaped like `trainingWorkload`. */
  | { readonly type: "trainingDevelopment"; readonly saveId: SaveId }
  | { readonly type: "clubInfo"; readonly saveId: SaveId }
  | { readonly type: "boardConfidence"; readonly saveId: SaveId }
  | { readonly type: "finances"; readonly saveId: SaveId }
  | { readonly type: "staffOverview"; readonly saveId: SaveId }
  | { readonly type: "shortlist"; readonly saveId: SaveId }
  | { readonly type: "scouting"; readonly saveId: SaveId }
  /** Scouting Assignment (Screen 121) — every Scout and what each observes, where assignments are
   *  started and ended. A sub-surface of Scouting: no `g` binding, not in `CAREER_SCREEN_TYPES`. */
  | { readonly type: "scoutingAssignment"; readonly saveId: SaveId }
  /** Scouting Knowledge (Screen 126) — which Clubs and Players the club has scouted and how far.
   *  A sub-surface of Scouting: no `g` binding, not in `CAREER_SCREEN_TYPES`. */
  | { readonly type: "scoutingKnowledge"; readonly saveId: SaveId }
  | { readonly type: "playerSearch"; readonly saveId: SaveId }
  | { readonly type: "staffSearch"; readonly saveId: SaveId }
  | { readonly type: "competitions"; readonly saveId: SaveId }
  /**
   * The Team Scout Report on another club — a drill-down reached from a surface that already
   * names a club (a league-table row), not a top-level screen. It is the first destination to
   * carry a second parameter, and the reason the club segment is `club/$clubId/...` rather than
   * a report-specific path: every club surface that follows hangs off the same segment.
   *
   * Like `tacticsEditor` it has no `g` binding and is absent from `CAREER_SCREEN_TYPES`, so the
   * navbar, the palette, and the keyboard spine never offer it without a club in hand.
   */
  | { readonly type: "teamScoutReport"; readonly saveId: SaveId; readonly clubId: ClubId }
  /**
   * Club Staff (Screen 38) — who works at any club in the save, grouped by department. A
   * drill-down reached the same way and subject to the same rule as `teamScoutReport`: it needs a
   * target club, so it carries both the save and the club id and no `g` binding.
   */
  | { readonly type: "clubStaff"; readonly saveId: SaveId; readonly clubId: ClubId }
  /**
   * Staff Profile — one person in a club's backroom. Staff have no stored identity outside the
   * human club, so a person is addressed by their club and their `StaffKey` (`coach-0`,
   * `scout-2`), which the derivation reproduces for any club.
   */
  | {
      readonly type: "staffProfile";
      readonly saveId: SaveId;
      readonly clubId: ClubId;
      readonly staffKey: string;
    }
  /**
   * Club Squad (Screen 35) — any club's squad, read-only. Club-scoped for the same reason as the
   * surfaces above: it lists a club's Players, so it needs one named, and it is a read — which is
   * what generalises, per the club-scoped rule's act-versus-read discriminator.
   */
  | { readonly type: "clubSquad"; readonly saveId: SaveId; readonly clubId: ClubId }
  /** Club General Information (Screen 34) — a club's identity, town, nation and ground. Club-scoped
   *  for the same reason as the two above: it describes a club, so it needs one named. */
  | { readonly type: "clubInformation"; readonly saveId: SaveId; readonly clubId: ClubId }
  /** Club Fixtures (Screen 40) and Club Transfers (Screen 42) — any club's, club-scoped for the
   *  same reason as the three above. Their own-club siblings (`fixtures`, `transferHistory`) stay
   *  save-scoped nav destinations and render the same lists. */
  | { readonly type: "clubFixturesDetail"; readonly saveId: SaveId; readonly clubId: ClubId }
  | { readonly type: "clubTransfersDetail"; readonly saveId: SaveId; readonly clubId: ClubId }
  /** Club Finances (Screen 39) — any club's budgets, club-scoped because `club_budgets` is keyed
   *  on `club_id`. Its own-club sibling is the `finances` nav destination, a resolver over this. */
  | { readonly type: "clubFinancesDetail"; readonly saveId: SaveId; readonly clubId: ClubId }
  /**
   * The competition-scoped surfaces — Overview (161), Table (162), Fixtures (163) and Results
   * (164). Club-scoped in the same sense the club drill-downs are: each needs a target competition,
   * so none can be built from a save alone and none is a navbar destination.
   *
   * Screens 162, 163 and 164 shipped before these existed and were reachable only by typing a URL.
   * The Overview is the page that links them together; what links to *it* is the World section's
   * Competitions entry, which is still a placeholder.
   */
  | { readonly type: "competitionOverview"; readonly saveId: SaveId; readonly competitionId: CompetitionId }
  | { readonly type: "competitionTable"; readonly saveId: SaveId; readonly competitionId: CompetitionId }
  | { readonly type: "competitionFixturesDetail"; readonly saveId: SaveId; readonly competitionId: CompetitionId }
  | { readonly type: "competitionResults"; readonly saveId: SaveId; readonly competitionId: CompetitionId }
  /**
   * Player detail — a drill-down to a specific player's profile. Needs both save and player
   * identity, so excluded from save-scoped nav like the club drill-downs.
   */
  | { readonly type: "playerDetail"; readonly saveId: SaveId; readonly playerId: PlayerId }
  /** A player's Player Development screen, reached from a Player Development Centre row. Needs the
   *  player too, so it is excluded from save-scoped nav like `playerDetail`. */
  | { readonly type: "playerDevelopment"; readonly saveId: SaveId; readonly playerId: PlayerId }
  /** A player's Contract screen (Screen 56) — reached from the Contract Expiry screen. Needs the
   *  player too, so it is excluded from save-scoped nav like `playerDetail`. */
  | { readonly type: "playerContract"; readonly saveId: SaveId; readonly playerId: PlayerId }
  /** A player's Form tab (map ticket 19) — recent games, the form strip and the season block. Needs
   *  the player, so excluded from save-scoped nav like the other player tabs. */
  | { readonly type: "playerForm"; readonly saveId: SaveId; readonly playerId: PlayerId }
  /**
   * Transfer Target Comparison (Screen 129, ticket 12) — the Players the manager selected in
   * Player Search, side by side, the figures read by the human club's Scouting Progress. It names
   * every compared Player, so like `playerDetail` it is excluded from save-scoped nav: a bare save
   * cannot say which Players are being compared. Comes from the search's Compare action, never from
   * a `g <key>` binding.
   */
  | {
      readonly type: "playerComparison";
      readonly saveId: SaveId;
      readonly playerIds: ReadonlyArray<PlayerId>;
    }
  /**
   * The live-match command screens (Screen 97) — reached from the live Match day section, never
   * from the navbar: a save alone is not enough, they need a match in play, so they are excluded
   * from save-scoped nav like the drill-downs above.
   */
  | { readonly type: "matchMatchTactics"; readonly saveId: SaveId }
  | { readonly type: "matchSubstitutions"; readonly saveId: SaveId }
  /** The post-match review screens (Screens 100, 101, 103), reached from the Post-Match Summary. */
  | { readonly type: "matchStats"; readonly saveId: SaveId }
  | { readonly type: "matchRatings"; readonly saveId: SaveId }
  /** The per-player Home Stats / Away Stats tabs (map ticket 12): two routes over one screen. */
  | { readonly type: "matchHomeStats"; readonly saveId: SaveId }
  | { readonly type: "matchAwayStats"; readonly saveId: SaveId }
  /** The Match Report names its match: the match session is cleared once the result is committed,
   *  so the screen cannot learn which match to report from anywhere else. */
  | { readonly type: "matchReport"; readonly saveId: SaveId; readonly matchId: MatchId }
  /** The post-match Report tab opens the report for the match just played, which the save-scoped
   *  read resolves itself because the tab bar names no match. */
  | { readonly type: "matchLatestReport"; readonly saveId: SaveId }
  /**
   * The match commentary sub-screen — a dedicated full-screen view of the
   * match commentary stream, separate from the main match day view.
   */
  | { readonly type: "matchCommentary"; readonly saveId: SaveId }
  /**
   * The latest scores / other results sub-screen — shows live scores from
   * other matches in the same competition on match day.
   */
  | { readonly type: "matchLatestScores"; readonly saveId: SaveId }
  /**
   * The live league table sub-screen — shows the competition table
   * during match day or after the match.
   */
  | { readonly type: "matchLiveTable"; readonly saveId: SaveId };

export type CreationStepDestination =
  | { readonly type: "createLeagues" }
  | { readonly type: "createStep1" }
  | { readonly type: "createStep2" }
  | { readonly type: "createStep3" };

export type NavigationDestination =
  | { readonly type: "mainMenu" }
  | { readonly type: "loadCareer" }
  | CreationStepDestination
  | CareerDestination;

/** The persistent career screens a `g <key>` binding may target. */
export const CAREER_SCREEN_TYPES = [
  "squad",
  "tactics",
  "training",
  "transfers",
  "league",
  "fixtures",
  "match",
  "seasonSummary",
  "manager",
  "news",
  "clubInfo",
  "boardConfidence",
  "finances",
  "staffOverview",
  "shortlist",
  "scouting",
  "playerSearch",
  "staffSearch",
  "competitions",
] as const;

/**
 * A career destination a save alone is enough to reach: every destination whose payload is just
 * `saveId`, with no club, competition, player, match or staff key beside it.
 *
 * Derived from the union's shape rather than restated as an exclude-list, so a new
 * identifier-carrying destination is left out automatically. The navbar, the keyboard spine and
 * the Tactics issue links all build a destination from a bare type plus the current save, and this
 * is the type that keeps them honest: without it each would happily construct a club destination
 * with no club and fail at the router instead.
 */
type SaveScopedCareerDestination = {
  readonly [K in CareerDestination["type"]]: Extract<
    CareerDestination,
    { readonly type: K }
  > extends infer D
    ? D extends CareerDestination
      ? Exclude<keyof D, "type" | "saveId"> extends never
        ? D
        : never
      : never
    : never;
}[CareerDestination["type"]];

export type SaveScopedCareerDestinationType = SaveScopedCareerDestination["type"];

/**
 * Build a save-scoped career destination. The type excludes every destination that needs a second
 * identifier, so the cast below can only mint a bare save-scoped one.
 */
export const careerDestination = (
  type: SaveScopedCareerDestinationType,
  saveId: SaveId,
): CareerDestination => ({ type, saveId }) as CareerDestination;

/**
 * One route per destination, and the only place a destination's path is written down.
 *
 * Each entry is a builder from its own destination member to the TanStack link it resolves to.
 * The value is a mapped type over `NavigationDestination["type"]`, so a destination with no entry
 * is a compile error, and the return type is `LinkOptions` checked against the real route tree
 * (registered in `router/index.tsx`), so a wrong path or a missing/mistyped parameter fails to
 * typecheck here rather than silently at the router. This replaces the four declarations that
 * used to restate the same mapping: the `ResolvedDestination` union, the `resolveDestination`
 * switch, the `careerRoute` switch, and the adapter's own navigate switch.
 */
type DestinationRouteBuilder = {
  readonly [K in NavigationDestination["type"]]: (
    destination: Extract<NavigationDestination, { readonly type: K }>,
  ) => LinkOptions;
};

const ROUTE_BUILDERS = {
  mainMenu: () => ({ to: "/" }),
  loadCareer: () => ({ to: "/load" }),
  createLeagues: () => ({ to: "/create/leagues" }),
  createStep1: () => ({ to: "/create/step-1" }),
  createStep2: () => ({ to: "/create/step-2" }),
  createStep3: () => ({ to: "/create/step-3" }),
  squad: (d) => ({ to: "/career/$saveId/squad", params: { saveId: d.saveId } }),
  squadStaff: (d) => ({ to: "/career/$saveId/squad-staff", params: { saveId: d.saveId } }),
  squadInformation: (d) => ({
    to: "/career/$saveId/squad-information",
    params: { saveId: d.saveId },
  }),
  squadFinances: (d) => ({
    to: "/career/$saveId/squad-finances",
    params: { saveId: d.saveId },
  }),
  squadHistory: (d) => ({ to: "/career/$saveId/squad-history", params: { saveId: d.saveId } }),
  tactics: (d) => ({ to: "/career/$saveId/tactics", params: { saveId: d.saveId } }),
  tacticsEditor: (d) => ({ to: "/career/$saveId/tactics/editor", params: { saveId: d.saveId } }),
  transfers: (d) => ({ to: "/career/$saveId/transfers", params: { saveId: d.saveId } }),
  contractExpiry: (d) => ({
    to: "/career/$saveId/contract-expiry",
    params: { saveId: d.saveId },
  }),
  budgetReview: (d) => ({ to: "/career/$saveId/budget-review", params: { saveId: d.saveId } }),
  transferHistory: (d) => ({
    to: "/career/$saveId/transfer-history",
    params: { saveId: d.saveId },
  }),
  league: (d) => ({ to: "/career/$saveId/league", params: { saveId: d.saveId } }),
  fixtures: (d) => ({ to: "/career/$saveId/fixtures", params: { saveId: d.saveId } }),
  match: (d) => ({ to: "/career/$saveId/match", params: { saveId: d.saveId } }),
  seasonSummary: (d) => ({
    to: "/career/$saveId/season-summary",
    params: { saveId: d.saveId },
  }),
  manager: (d) => ({ to: "/career/$saveId/manager", params: { saveId: d.saveId } }),
  managerInbox: (d) => ({ to: "/career/$saveId/manager/inbox", params: { saveId: d.saveId } }),
  managerConfidence: (d) => ({
    to: "/career/$saveId/manager/confidence",
    params: { saveId: d.saveId },
  }),
  managerNotes: (d) => ({ to: "/career/$saveId/manager/notes", params: { saveId: d.saveId } }),
  managerJobs: (d) => ({ to: "/career/$saveId/manager/jobs", params: { saveId: d.saveId } }),
  managerResponsibilities: (d) => ({
    to: "/career/$saveId/manager/responsibilities",
    params: { saveId: d.saveId },
  }),
  managerCareer: (d) => ({ to: "/career/$saveId/manager/career", params: { saveId: d.saveId } }),
  news: (d) => ({ to: "/career/$saveId/news", params: { saveId: d.saveId } }),
  training: (d) => ({ to: "/career/$saveId/training", params: { saveId: d.saveId } }),
  trainingWorkload: (d) => ({
    to: "/career/$saveId/training/workload",
    params: { saveId: d.saveId },
  }),
  trainingSchedule: (d) => ({
    to: "/career/$saveId/training/schedule",
    params: { saveId: d.saveId },
  }),
  trainingCoaching: (d) => ({
    to: "/career/$saveId/training/coaching",
    params: { saveId: d.saveId },
  }),
  trainingPlan: (d) => ({
    to: "/career/$saveId/training/plan/$playerId",
    params: { saveId: d.saveId, playerId: d.playerId },
  }),
  trainingDevelopment: (d) => ({
    to: "/career/$saveId/training/development-centre",
    params: { saveId: d.saveId },
  }),
  clubInfo: (d) => ({ to: "/career/$saveId/club-info", params: { saveId: d.saveId } }),
  boardConfidence: (d) => ({
    to: "/career/$saveId/board-confidence",
    params: { saveId: d.saveId },
  }),
  finances: (d) => ({ to: "/career/$saveId/finances", params: { saveId: d.saveId } }),
  staffOverview: (d) => ({ to: "/career/$saveId/staff-overview", params: { saveId: d.saveId } }),
  shortlist: (d) => ({ to: "/career/$saveId/shortlist", params: { saveId: d.saveId } }),
  scouting: (d) => ({ to: "/career/$saveId/scouting", params: { saveId: d.saveId } }),
  scoutingAssignment: (d) => ({
    to: "/career/$saveId/scouting-assignment",
    params: { saveId: d.saveId },
  }),
  scoutingKnowledge: (d) => ({
    to: "/career/$saveId/scouting-knowledge",
    params: { saveId: d.saveId },
  }),
  playerSearch: (d) => ({ to: "/career/$saveId/player-search", params: { saveId: d.saveId } }),
  staffSearch: (d) => ({ to: "/career/$saveId/staff-search", params: { saveId: d.saveId } }),
  competitions: (d) => ({ to: "/career/$saveId/competitions", params: { saveId: d.saveId } }),
  teamScoutReport: (d) => ({
    to: "/career/$saveId/club/$clubId/scout-report",
    params: { saveId: d.saveId, clubId: d.clubId },
  }),
  clubStaff: (d) => ({
    to: "/career/$saveId/club/$clubId/staff",
    params: { saveId: d.saveId, clubId: d.clubId },
  }),
  staffProfile: (d) => ({
    to: "/career/$saveId/club/$clubId/staff/$staffKey",
    params: { saveId: d.saveId, clubId: d.clubId, staffKey: d.staffKey },
  }),
  clubSquad: (d) => ({
    to: "/career/$saveId/club/$clubId/squad",
    params: { saveId: d.saveId, clubId: d.clubId },
  }),
  clubInformation: (d) => ({
    to: "/career/$saveId/club/$clubId/information",
    params: { saveId: d.saveId, clubId: d.clubId },
  }),
  clubFixturesDetail: (d) => ({
    to: "/career/$saveId/club/$clubId/fixtures",
    params: { saveId: d.saveId, clubId: d.clubId },
  }),
  clubTransfersDetail: (d) => ({
    to: "/career/$saveId/club/$clubId/transfers",
    params: { saveId: d.saveId, clubId: d.clubId },
  }),
  clubFinancesDetail: (d) => ({
    to: "/career/$saveId/club/$clubId/finances",
    params: { saveId: d.saveId, clubId: d.clubId },
  }),
  competitionOverview: (d) => ({
    to: "/career/$saveId/competition/$competitionId/overview",
    params: { saveId: d.saveId, competitionId: d.competitionId },
  }),
  competitionTable: (d) => ({
    to: "/career/$saveId/competition/$competitionId/table",
    params: { saveId: d.saveId, competitionId: d.competitionId },
  }),
  competitionFixturesDetail: (d) => ({
    to: "/career/$saveId/competition/$competitionId/fixtures",
    params: { saveId: d.saveId, competitionId: d.competitionId },
  }),
  competitionResults: (d) => ({
    to: "/career/$saveId/competition/$competitionId/results",
    params: { saveId: d.saveId, competitionId: d.competitionId },
  }),
  playerDetail: (d) => ({
    to: "/career/$saveId/player/$playerId/profile",
    params: { saveId: d.saveId, playerId: d.playerId },
  }),
  playerDevelopment: (d) => ({
    to: "/career/$saveId/player/$playerId/development",
    params: { saveId: d.saveId, playerId: d.playerId },
  }),
  playerContract: (d) => ({
    to: "/career/$saveId/player/$playerId/contract",
    params: { saveId: d.saveId, playerId: d.playerId },
  }),
  playerForm: (d) => ({
    to: "/career/$saveId/player/$playerId/form",
    params: { saveId: d.saveId, playerId: d.playerId },
  }),
  playerComparison: (d) => ({
    to: "/career/$saveId/player-comparison/$playerIds",
    params: { saveId: d.saveId, playerIds: playerComparisonKey(d.playerIds) },
  }),
  matchMatchTactics: (d) => ({
    to: "/career/$saveId/match-match-tactics",
    params: { saveId: d.saveId },
  }),
  matchSubstitutions: (d) => ({
    to: "/career/$saveId/match-substitutions",
    params: { saveId: d.saveId },
  }),
  matchStats: (d) => ({ to: "/career/$saveId/match-stats", params: { saveId: d.saveId } }),
  matchRatings: (d) => ({ to: "/career/$saveId/match-ratings", params: { saveId: d.saveId } }),
  matchHomeStats: (d) => ({
    to: "/career/$saveId/match-home-stats",
    params: { saveId: d.saveId },
  }),
  matchAwayStats: (d) => ({
    to: "/career/$saveId/match-away-stats",
    params: { saveId: d.saveId },
  }),
  matchReport: (d) => ({
    to: "/career/$saveId/match-report/$matchId",
    params: { saveId: d.saveId, matchId: d.matchId },
  }),
  matchLatestReport: (d) => ({
    to: "/career/$saveId/match-report-latest",
    params: { saveId: d.saveId },
  }),
  matchCommentary: (d) => ({
    to: "/career/$saveId/match-commentary",
    params: { saveId: d.saveId },
  }),
  matchLatestScores: (d) => ({
    to: "/career/$saveId/match-latest-scores",
    params: { saveId: d.saveId },
  }),
  matchLiveTable: (d) => ({
    to: "/career/$saveId/match-live-table",
    params: { saveId: d.saveId },
  }),
} satisfies DestinationRouteBuilder;

/**
 * The link a destination resolves to. Derived from the registry, so it is exactly the set of
 * route-and-parameter shapes the builders produce — never a second, hand-kept list.
 */
export type ResolvedDestination = ReturnType<
  (typeof ROUTE_BUILDERS)[NavigationDestination["type"]]
>;

/** Resolve a typed destination through the one registry. */
export const resolveDestination = (destination: NavigationDestination): ResolvedDestination => {
  const build = ROUTE_BUILDERS[destination.type] as unknown as (
    destination: NavigationDestination,
  ) => ResolvedDestination;
  return build(destination);
};
