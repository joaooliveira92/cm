import type { ClubId, CompetitionId, MatchId, PlayerId, SaveId } from "@cm-clone/contracts";

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
  /** The Match Report names its match: the match session is cleared once the result is committed,
   *  so the screen cannot learn which match to report from anywhere else. */
  | { readonly type: "matchReport"; readonly saveId: SaveId; readonly matchId: MatchId }
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
 * The career destinations a save alone is enough to reach. Everything except the two
 * club-scoped drill-downs (`teamScoutReport`, `clubStaff`, `clubInformation`), which need a target
 * club and so can
 * only be built where one is in hand.
 *
 * The navbar, the keyboard spine, and the Tactics overview's issue links all build a
 * destination from a bare type plus the current save, and this is the type that keeps them
 * honest: without it each would happily construct a club destination with no club and fail at
 * the router instead.
 */
export type SaveScopedCareerDestinationType = Exclude<
  CareerDestination["type"],
  "teamScoutReport" | "clubStaff" | "clubSquad" | "clubInformation" | "clubFixturesDetail" | "clubTransfersDetail" | "clubFinancesDetail" | "competitionOverview" | "competitionTable" | "competitionFixturesDetail" | "competitionResults" | "playerDetail" | "playerDevelopment" | "playerContract" | "playerComparison" | "trainingPlan" | "matchMatchTactics" | "matchSubstitutions" | "matchStats" | "matchRatings" | "matchReport" | "matchCommentary" | "matchLatestScores" | "matchLiveTable"
>;

/**
 * Build a save-scoped career destination. `teamScoutReport` is excluded by type: it needs a
 * `clubId`, and the cast below would otherwise happily mint one without it.
 */
export const careerDestination = (
  type: SaveScopedCareerDestinationType,
  saveId: SaveId,
): CareerDestination => ({ type, saveId }) as CareerDestination;

/**
 * The canonical `:playerIds` route slug, and the comparison atom's key. Both the address and the
 * atom must name the same comparison set the same way, no matter the order the manager selected
 * the Players in, so one definition serves both: every id, de-duplicated and code-unit sorted,
 * joined by commas. `careerRoute` builds the slug from it and
 * `rpc/playerComparisonQueries.ts` keys its named-set atom on it, so a comparison set always
 * resolves to one route and one atom — and re-selecting the same Players from a search cannot mint
 * a second atom. `decodePlayerIds` in `params.ts` decodes it back.
 */
export const playerComparisonKey = (playerIds: ReadonlyArray<PlayerId>): string =>
  [...new Set(playerIds.map(String))].sort().join(",");

/**
 * A resolved destination: the router `to`/`params` the adapter passes to
 * `router.navigate`. Discriminated on the literal `to` so the adapter switch
 * keeps full parameter typing per route.
 */
export type ResolvedDestination =
  | { readonly to: "/" }
  | { readonly to: "/load" }
  | { readonly to: "/create/leagues" }
  | { readonly to: "/create/step-1" }
  | { readonly to: "/create/step-2" }
  | { readonly to: "/create/step-3" }
  | { readonly to: "/career/$saveId/squad"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/squad-staff"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/squad-information"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/squad-finances"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/squad-history"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/tactics"; readonly params: { readonly saveId: SaveId } }
  | {
      readonly to: "/career/$saveId/tactics/editor";
      readonly params: { readonly saveId: SaveId };
    }
  | { readonly to: "/career/$saveId/transfers"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/contract-expiry"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/budget-review"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/transfer-history"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/league"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/fixtures"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/match"; readonly params: { readonly saveId: SaveId } }
  | {
      readonly to: "/career/$saveId/season-summary";
      readonly params: { readonly saveId: SaveId };
    }
  | { readonly to: "/career/$saveId/manager"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/manager/inbox"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/manager/confidence"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/manager/notes"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/manager/jobs"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/manager/responsibilities"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/manager/career"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/news"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/training"; readonly params: { readonly saveId: SaveId } }
  | {
      readonly to: "/career/$saveId/training/workload";
      readonly params: { readonly saveId: SaveId };
    }
  | {
      readonly to: "/career/$saveId/training/coaching";
      readonly params: { readonly saveId: SaveId };
    }
  | {
      readonly to: "/career/$saveId/training/plan/$playerId";
      readonly params: { readonly saveId: SaveId; readonly playerId: PlayerId };
    }
  | {
      readonly to: "/career/$saveId/training/development-centre";
      readonly params: { readonly saveId: SaveId };
    }
  | { readonly to: "/career/$saveId/club-info"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/board-confidence"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/finances"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/staff-overview"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/shortlist"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/scouting"; readonly params: { readonly saveId: SaveId } }
  | {
      readonly to: "/career/$saveId/scouting-assignment";
      readonly params: { readonly saveId: SaveId };
    }
  | {
      readonly to: "/career/$saveId/scouting-knowledge";
      readonly params: { readonly saveId: SaveId };
    }
  | { readonly to: "/career/$saveId/player-search"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/staff-search"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/competitions"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/match-match-tactics"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/match-substitutions"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/match-stats"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/match-ratings"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/match-commentary"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/match-latest-scores"; readonly params: { readonly saveId: SaveId } }
  | { readonly to: "/career/$saveId/match-live-table"; readonly params: { readonly saveId: SaveId } }
  | {
      readonly to: "/career/$saveId/match-report/$matchId";
      readonly params: { readonly saveId: SaveId; readonly matchId: MatchId };
    }
  | {
      readonly to: "/career/$saveId/club/$clubId/scout-report";
      readonly params: { readonly saveId: SaveId; readonly clubId: ClubId };
    }
  | {
      readonly to: "/career/$saveId/club/$clubId/staff";
      readonly params: { readonly saveId: SaveId; readonly clubId: ClubId };
    }
  | {
      readonly to: "/career/$saveId/club/$clubId/squad";
      readonly params: { readonly saveId: SaveId; readonly clubId: ClubId };
    }
  | {
      readonly to: "/career/$saveId/player/$playerId/profile";
      readonly params: { readonly saveId: SaveId; readonly playerId: PlayerId };
    }
  | {
      readonly to: "/career/$saveId/player/$playerId/development";
      readonly params: { readonly saveId: SaveId; readonly playerId: PlayerId };
    }
  | {
      readonly to: "/career/$saveId/player/$playerId/contract";
      readonly params: { readonly saveId: SaveId; readonly playerId: PlayerId };
    }
  | {
      readonly to: "/career/$saveId/player-comparison/$playerIds";
      readonly params: { readonly saveId: SaveId; readonly playerIds: string };
    }
  | {
      readonly to: "/career/$saveId/club/$clubId/information";
      readonly params: { readonly saveId: SaveId; readonly clubId: ClubId };
    }
  | {
      readonly to: "/career/$saveId/club/$clubId/fixtures";
      readonly params: { readonly saveId: SaveId; readonly clubId: ClubId };
    }
  | {
      readonly to: "/career/$saveId/club/$clubId/transfers";
      readonly params: { readonly saveId: SaveId; readonly clubId: ClubId };
    }
  | {
      readonly to: "/career/$saveId/club/$clubId/finances";
      readonly params: { readonly saveId: SaveId; readonly clubId: ClubId };
    }
  | {
      readonly to:
        | "/career/$saveId/competition/$competitionId/overview"
        | "/career/$saveId/competition/$competitionId/table"
        | "/career/$saveId/competition/$competitionId/fixtures"
        | "/career/$saveId/competition/$competitionId/results";
      readonly params: { readonly saveId: SaveId; readonly competitionId: CompetitionId };
    };

/** Pure mapping from a typed destination to its route; unit-tested (AC-14). */
export const resolveDestination = (destination: NavigationDestination): ResolvedDestination => {
  switch (destination.type) {
    case "mainMenu":
      return { to: "/" };
    case "loadCareer":
      return { to: "/load" };
    case "createLeagues":
      return { to: "/create/leagues" };
    case "createStep1":
      return { to: "/create/step-1" };
    case "createStep2":
      return { to: "/create/step-2" };
    case "createStep3":
      return { to: "/create/step-3" };
    case "squad":
    case "squadStaff":
    case "squadInformation":
    case "squadFinances":
    case "squadHistory":
    case "tactics":
    case "tacticsEditor":
    case "transfers":
    case "contractExpiry":
    case "budgetReview":
    case "transferHistory":
    case "league":
    case "fixtures":
    case "match":
    case "seasonSummary":
    case "manager":
    case "managerInbox":
    case "managerConfidence":
    case "managerNotes":
    case "managerJobs":
    case "managerResponsibilities":
    case "managerCareer":
    case "news":
    case "training":
    case "trainingWorkload":
    case "trainingCoaching":
    case "trainingPlan":
    case "trainingDevelopment":
    case "clubInfo":
    case "boardConfidence":
    case "finances":
    case "staffOverview":
    case "shortlist":
    case "scouting":
    case "scoutingAssignment":
    case "scoutingKnowledge":
    case "playerSearch":
    case "staffSearch":
    case "competitions":
    case "teamScoutReport":
    case "clubStaff":
    case "clubSquad":
    case "clubInformation":
    case "clubFixturesDetail":
    case "clubTransfersDetail":
    case "clubFinancesDetail":
    case "competitionOverview":
    case "competitionTable":
    case "competitionFixturesDetail":
    case "competitionResults":
    case "playerDetail":
    case "playerDevelopment":
    case "playerContract":
    case "playerComparison":
    case "matchMatchTactics":
    case "matchSubstitutions":
    case "matchStats":
    case "matchRatings":
    case "matchReport":
    case "matchCommentary":
    case "matchLatestScores":
    case "matchLiveTable":
      return careerRoute(destination);
  }
};

const careerRoute = (
  destination: CareerDestination,
): Extract<ResolvedDestination, { readonly params: { readonly saveId: SaveId } }> => {
  switch (destination.type) {
    case "squad":
      return { to: "/career/$saveId/squad", params: { saveId: destination.saveId } };
    case "squadStaff":
      return { to: "/career/$saveId/squad-staff", params: { saveId: destination.saveId } };
    case "squadInformation":
      return { to: "/career/$saveId/squad-information", params: { saveId: destination.saveId } };
    case "squadFinances":
      return { to: "/career/$saveId/squad-finances", params: { saveId: destination.saveId } };
    case "squadHistory":
      return { to: "/career/$saveId/squad-history", params: { saveId: destination.saveId } };
    case "tactics":
      return { to: "/career/$saveId/tactics", params: { saveId: destination.saveId } };
    case "tacticsEditor":
      return {
        to: "/career/$saveId/tactics/editor",
        params: { saveId: destination.saveId },
      };
    case "transfers":
      return { to: "/career/$saveId/transfers", params: { saveId: destination.saveId } };
    case "contractExpiry":
      return { to: "/career/$saveId/contract-expiry", params: { saveId: destination.saveId } };
    case "budgetReview":
      return { to: "/career/$saveId/budget-review", params: { saveId: destination.saveId } };
    case "transferHistory":
      return { to: "/career/$saveId/transfer-history", params: { saveId: destination.saveId } };
    case "league":
      return { to: "/career/$saveId/league", params: { saveId: destination.saveId } };
    case "fixtures":
      return { to: "/career/$saveId/fixtures", params: { saveId: destination.saveId } };
    case "match":
      return { to: "/career/$saveId/match", params: { saveId: destination.saveId } };
    case "seasonSummary":
      return {
        to: "/career/$saveId/season-summary",
        params: { saveId: destination.saveId },
      };
    case "manager":
      return { to: "/career/$saveId/manager", params: { saveId: destination.saveId } };
    case "managerInbox":
      return { to: "/career/$saveId/manager/inbox", params: { saveId: destination.saveId } };
    case "managerConfidence":
      return { to: "/career/$saveId/manager/confidence", params: { saveId: destination.saveId } };
    case "managerNotes":
      return { to: "/career/$saveId/manager/notes", params: { saveId: destination.saveId } };
    case "managerJobs":
      return { to: "/career/$saveId/manager/jobs", params: { saveId: destination.saveId } };
    case "managerResponsibilities":
      return { to: "/career/$saveId/manager/responsibilities", params: { saveId: destination.saveId } };
    case "managerCareer":
      return { to: "/career/$saveId/manager/career", params: { saveId: destination.saveId } };
    case "news":
      return { to: "/career/$saveId/news", params: { saveId: destination.saveId } };
    case "training":
      return { to: "/career/$saveId/training", params: { saveId: destination.saveId } };
    case "trainingWorkload":
      return {
        to: "/career/$saveId/training/workload",
        params: { saveId: destination.saveId },
      };
    case "trainingCoaching":
      return {
        to: "/career/$saveId/training/coaching",
        params: { saveId: destination.saveId },
      };
    case "trainingPlan":
      return {
        to: "/career/$saveId/training/plan/$playerId",
        params: { saveId: destination.saveId, playerId: destination.playerId },
      };
    case "trainingDevelopment":
      return {
        to: "/career/$saveId/training/development-centre",
        params: { saveId: destination.saveId },
      };
    case "clubInfo":
      return { to: "/career/$saveId/club-info", params: { saveId: destination.saveId } };
    case "boardConfidence":
      return { to: "/career/$saveId/board-confidence", params: { saveId: destination.saveId } };
    case "finances":
      return { to: "/career/$saveId/finances", params: { saveId: destination.saveId } };
    case "staffOverview":
      return { to: "/career/$saveId/staff-overview", params: { saveId: destination.saveId } };
    case "shortlist":
      return { to: "/career/$saveId/shortlist", params: { saveId: destination.saveId } };
    case "scouting":
      return { to: "/career/$saveId/scouting", params: { saveId: destination.saveId } };
    case "scoutingAssignment":
      return {
        to: "/career/$saveId/scouting-assignment",
        params: { saveId: destination.saveId },
      };
    case "scoutingKnowledge":
      return {
        to: "/career/$saveId/scouting-knowledge",
        params: { saveId: destination.saveId },
      };
    case "playerSearch":
      return { to: "/career/$saveId/player-search", params: { saveId: destination.saveId } };
    case "staffSearch":
      return { to: "/career/$saveId/staff-search", params: { saveId: destination.saveId } };
    case "competitions":
      return { to: "/career/$saveId/competitions", params: { saveId: destination.saveId } };
    case "teamScoutReport":
      return {
        to: "/career/$saveId/club/$clubId/scout-report",
        params: { saveId: destination.saveId, clubId: destination.clubId },
      };
    case "clubStaff":
      return {
        to: "/career/$saveId/club/$clubId/staff",
        params: { saveId: destination.saveId, clubId: destination.clubId },
      };
    case "clubSquad":
      return {
        to: "/career/$saveId/club/$clubId/squad",
        params: { saveId: destination.saveId, clubId: destination.clubId },
      };
    case "clubInformation":
      return {
        to: "/career/$saveId/club/$clubId/information",
        params: { saveId: destination.saveId, clubId: destination.clubId },
      };
    case "clubFixturesDetail":
      return {
        to: "/career/$saveId/club/$clubId/fixtures",
        params: { saveId: destination.saveId, clubId: destination.clubId },
      };
    case "clubTransfersDetail":
      return {
        to: "/career/$saveId/club/$clubId/transfers",
        params: { saveId: destination.saveId, clubId: destination.clubId },
      };
    case "clubFinancesDetail":
      return {
        to: "/career/$saveId/club/$clubId/finances",
        params: { saveId: destination.saveId, clubId: destination.clubId },
      };
    case "competitionOverview":
      return {
        to: "/career/$saveId/competition/$competitionId/overview",
        params: { saveId: destination.saveId, competitionId: destination.competitionId },
      };
    case "competitionTable":
      return {
        to: "/career/$saveId/competition/$competitionId/table",
        params: { saveId: destination.saveId, competitionId: destination.competitionId },
      };
    case "competitionFixturesDetail":
      return {
        to: "/career/$saveId/competition/$competitionId/fixtures",
        params: { saveId: destination.saveId, competitionId: destination.competitionId },
      };
    case "competitionResults":
      return {
        to: "/career/$saveId/competition/$competitionId/results",
        params: { saveId: destination.saveId, competitionId: destination.competitionId },
      };
    case "playerDetail":
      return {
        to: "/career/$saveId/player/$playerId/profile",
        params: { saveId: destination.saveId, playerId: destination.playerId },
      };
    case "playerDevelopment":
      return {
        to: "/career/$saveId/player/$playerId/development",
        params: { saveId: destination.saveId, playerId: destination.playerId },
      };
    case "playerContract":
      return {
        to: "/career/$saveId/player/$playerId/contract",
        params: { saveId: destination.saveId, playerId: destination.playerId },
      };
    case "playerComparison":
      return {
        to: "/career/$saveId/player-comparison/$playerIds",
        params: {
          saveId: destination.saveId,
          playerIds: playerComparisonKey(destination.playerIds),
        },
      };
    case "matchMatchTactics":
      return { to: "/career/$saveId/match-match-tactics", params: { saveId: destination.saveId } };
    case "matchSubstitutions":
      return { to: "/career/$saveId/match-substitutions", params: { saveId: destination.saveId } };
    case "matchStats":
      return { to: "/career/$saveId/match-stats", params: { saveId: destination.saveId } };
    case "matchRatings":
      return { to: "/career/$saveId/match-ratings", params: { saveId: destination.saveId } };
    case "matchReport":
      return {
        to: "/career/$saveId/match-report/$matchId",
        params: { saveId: destination.saveId, matchId: destination.matchId },
      };
    case "matchCommentary":
      return { to: "/career/$saveId/match-commentary", params: { saveId: destination.saveId } };
    case "matchLatestScores":
      return { to: "/career/$saveId/match-latest-scores", params: { saveId: destination.saveId } };
    case "matchLiveTable":
      return { to: "/career/$saveId/match-live-table", params: { saveId: destination.saveId } };
  }
};
