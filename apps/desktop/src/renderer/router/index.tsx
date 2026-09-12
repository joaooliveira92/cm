import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { bindRouter } from "../navigation/adapter.js";
import { KeyboardSpine } from "../keyboard/KeyboardSpine.js";
import { FixturesScreen } from "../fixtures/FixturesScreen.js";
import { LeagueTableScreen } from "../leagueTable/LeagueTableScreen.js";
import { ManagerProfileScreen } from "../managerProfile/ManagerProfileScreen.js";
import { MatchDayScreen } from "../match/MatchDayScreen.js";
import { NewsInboxScreen } from "../news/NewsInboxScreen.js";
import { SeasonSummaryScreen } from "../seasonSummary/SeasonSummaryScreen.js";
import { SquadScreen } from "../squad/SquadScreen.js";
import { TacticsOverviewScreen } from "../tactics/TacticsOverviewScreen.js";
import { TacticsScreen } from "../tactics/TacticsScreen.js";
import { TransfersScreen } from "../transfers/TransfersScreen.js";
import { MainMenuScreen } from "./mainMenu.js";
import { LoadCareerScreen } from "./loadCareer.js";
import { TeamScoutReportScreen } from "../scouting/TeamScoutReportScreen.js";
import { ClubStaffScreen } from "../clubStaff/ClubStaffScreen.js";
import { PlayerProfileScreen } from "../playerProfile/PlayerProfileScreen.js";
import { PlayerAttributesScreen } from "../playerAttributes/PlayerAttributesScreen.js";
import { PlayerContractScreen } from "../playerContract/PlayerContractScreen.js";
import { PlayerHistoryScreen } from "../playerHistory/PlayerHistoryScreen.js";
import { PlayerFormScreen } from "../playerForm/PlayerFormScreen.js";
import { PlayerInjuriesScreen } from "../playerInjuries/PlayerInjuriesScreen.js";
import { PlayerScoutReportScreen } from "../playerScoutReport/PlayerScoutReportScreen.js";
import { PlayerCoachReportScreen } from "../playerCoachReport/PlayerCoachReportScreen.js";
import { TrainingScreen } from "../training/TrainingScreen.js";
import { ClubInfoScreen } from "../clubInfo/ClubInfoScreen.js";
import { BoardConfidenceScreen } from "../boardConfidence/BoardConfidenceScreen.js";
import { ClubHistoryScreen } from "../clubHistory/ClubHistoryScreen.js";
import { FinancesScreen } from "../finances/FinancesScreen.js";
import { StaffOverviewScreen } from "../staffOverview/StaffOverviewScreen.js";
import { ShortlistScreen } from "../shortlist/ShortlistScreen.js";
import { ScoutingScreen } from "../scouting/ScoutingScreen.js";
import { PlayerSearchScreen } from "../playerSearch/PlayerSearchScreen.js";
import { StaffSearchScreen } from "../staffSearch/StaffSearchScreen.js";
import { CompetitionsScreen } from "../competitions/CompetitionsScreen.js";
import { NationsScreen } from "../nations/NationsScreen.js";
import { ClubsScreen } from "../clubs/ClubsScreen.js";
import { GameStatusScreen } from "../gameStatus/GameStatusScreen.js";
import { ManagerChatScreen } from "../managerChat/ManagerChatScreen.js";
// Ticket 03 — Staff drill-downs
import { StaffProfileScreen } from "../staffProfile/StaffProfileScreen.js";
import { StaffAttributesScreen } from "../staffAttributes/StaffAttributesScreen.js";
import { StaffContractScreen } from "../staffContract/StaffContractScreen.js";
import { StaffHistoryScreen } from "../staffHistory/StaffHistoryScreen.js";
import { StaffJobInfoScreen } from "../staffJobInfo/StaffJobInfoScreen.js";
// Ticket 04 — Club drill-downs (other club views)
import { ClubSquadDetailScreen } from "../clubSquadDetail/ClubSquadDetailScreen.js";
import { ClubReservesDetailScreen } from "../clubReservesDetail/ClubReservesDetailScreen.js";
import { ClubYouthDetailScreen } from "../clubYouthDetail/ClubYouthDetailScreen.js";
import { ClubFixturesDetailScreen } from "../clubFixturesDetail/ClubFixturesDetailScreen.js";
import { ClubTransfersDetailScreen } from "../clubTransfersDetail/ClubTransfersDetailScreen.js";
import { ClubFinancesDetailScreen } from "../clubFinancesDetail/ClubFinancesDetailScreen.js";
import { ClubHistoryDetailScreen } from "../clubHistoryDetail/ClubHistoryDetailScreen.js";
import { ClubCompetitionsDetailScreen } from "../clubCompetitionsDetail/ClubCompetitionsDetailScreen.js";
import { ClubInformationScreen } from "../clubInformation/ClubInformationScreen.js";
// Ticket 05 — Nation drill-downs
import { NationOverviewScreen } from "../nationOverview/NationOverviewScreen.js";
import { NationSeniorSquadScreen } from "../nationSeniorSquad/NationSeniorSquadScreen.js";
import { NationYouthSquadsScreen } from "../nationYouthSquads/NationYouthSquadsScreen.js";
import { NationFixturesScreen } from "../nationFixtures/NationFixturesScreen.js";
import { NationCompetitionsScreen as NationCompetitionsDetailScreen } from "../nationCompetitions/NationCompetitionsScreen.js";
import { NationClubsScreen } from "../nationClubs/NationClubsScreen.js";
import { NationPlayersScreen } from "../nationPlayers/NationPlayersScreen.js";
import { NationStaffScreen } from "../nationStaff/NationStaffScreen.js";
import { NationHistoryScreen } from "../nationHistory/NationHistoryScreen.js";
import { NationInformationScreen } from "../nationInformation/NationInformationScreen.js";
// Ticket 06 — Competition drill-downs
import { CompetitionOverviewScreen } from "../competitionOverview/CompetitionOverviewScreen.js";
import { CompetitionTableScreen } from "../competitionTable/CompetitionTableScreen.js";
import { CompetitionFixturesDetailScreen } from "../competitionFixturesDetail/CompetitionFixturesDetailScreen.js";
import { CompetitionResultsScreen } from "../competitionResults/CompetitionResultsScreen.js";
import { CompetitionStagesScreen } from "../competitionStages/CompetitionStagesScreen.js";
import { CompetitionRulesScreen } from "../competitionRules/CompetitionRulesScreen.js";
import { CompetitionStatisticsScreen } from "../competitionStatistics/CompetitionStatisticsScreen.js";
import { CompetitionPastWinnersScreen } from "../competitionPastWinners/CompetitionPastWinnersScreen.js";
import { CompetitionRecordsScreen } from "../competitionRecords/CompetitionRecordsScreen.js";
import { CompetitionNewsScreen } from "../competitionNews/CompetitionNewsScreen.js";
import { CompetitionTeamsScreen } from "../competitionTeams/CompetitionTeamsScreen.js";
import { CompetitionPlayerStatsScreen } from "../competitionPlayerStats/CompetitionPlayerStatsScreen.js";
// Ticket 07 — Match sub-screen placeholders
import { MatchStatsScreen } from "../matchStats/MatchStatsScreen.js";
import { MatchPlayerStatsScreen } from "../matchPlayerStats/MatchPlayerStatsScreen.js";
import { MatchHomeTeamScreen } from "../matchHomeTeam/MatchHomeTeamScreen.js";
import { MatchAwayTeamScreen } from "../matchAwayTeam/MatchAwayTeamScreen.js";
import { MatchRatingsScreen } from "../matchRatings/MatchRatingsScreen.js";
import { MatchLatestScoresScreen } from "../matchLatestScores/MatchLatestScoresScreen.js";
import { MatchLiveTableScreen } from "../matchLiveTable/MatchLiveTableScreen.js";
import { MatchMatchTacticsScreen } from "../matchMatchTactics/MatchMatchTacticsScreen.js";
import { MatchSubstitutionsScreen } from "../matchSubstitutions/MatchSubstitutionsScreen.js";
import { MatchOppositionInstructionsScreen } from "../matchOppositionInstructions/MatchOppositionInstructionsScreen.js";
import { MatchCommentaryScreen } from "../matchCommentary/MatchCommentaryScreen.js";
import { MatchReplaysScreen } from "../matchReplays/MatchReplaysScreen.js";
import { MatchReportScreen } from "../matchReport/MatchReportScreen.js";
import {
  CareerChildView,
  CareerClubChildView,
  CareerIndexRedirect,
  CareerPlayerChildView,
  CareerStaffChildView,
  CareerNationChildView,
  CareerCompetitionChildView,
  CareerShell,
} from "./career.js";
import { CreateFlowLayout } from "../create/CreateFlowLayout.js";
import {
  LeagueSelectionRouteContent,
  StepOneRouteContent,
  StepThreeRouteContent,
  StepTwoRouteContent,
} from "./createFlow.js";

/**
 * The renderer's route tree (Stage 2 — keyboard-first renderer). Three
 * top-level branches: the save list (`/`), the creation flow (`/create/step-*`),
 * and the active career (`/career/$saveId/*`) whose `$saveId` parent owns the
 * persistent shell and the save-scoped Atom registry.
 *
 * Routes validate structure and parameter shape only — no route loader fetches
 * domain data through a second path to the Atom seam, and a well-formed-but-
 * missing save stays a typed RPC failure rendered by the screen, never a
 * redirect (AC-12).
 */
const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <KeyboardSpine />
    </>
  ),
});

const mainMenuRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: MainMenuScreen,
});

const loadCareerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "load",
  component: LoadCareerScreen,
});

// ---------------------------------------------------------------------------
// Career branch
// ---------------------------------------------------------------------------

const careerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "career",
  component: () => <Outlet />,
});

const saveRoute = createRoute({
  getParentRoute: () => careerRoute,
  path: "$saveId",
  component: CareerShell,
});

const careerIndexRoute = createRoute({
  getParentRoute: () => saveRoute,
  path: "/",
  component: CareerIndexRedirect,
});

const defineCareerChild = <const P extends string>(
  path: P,
  screenId: string,
  Screen: typeof SquadScreen,
) =>
  createRoute({
    getParentRoute: () => saveRoute,
    path,
    component: () => <CareerChildView screenId={screenId} Screen={Screen} />,
  });

const squadRoute = defineCareerChild("squad", "squad", SquadScreen);
const transfersRoute = defineCareerChild("transfers", "transfers", TransfersScreen);
const leagueRoute = defineCareerChild("league", "league", LeagueTableScreen);
const fixturesRoute = defineCareerChild("fixtures", "fixtures", FixturesScreen);
const matchRoute = defineCareerChild("match", "match", MatchDayScreen);
const seasonSummaryRoute = defineCareerChild(
  "season-summary",
  "seasonSummary",
  SeasonSummaryScreen,
);
const managerRoute = defineCareerChild("manager", "manager", ManagerProfileScreen);
const newsRoute = defineCareerChild("news", "news", NewsInboxScreen);

const trainingRoute = defineCareerChild("training", "training", TrainingScreen);
const clubInfoRoute = defineCareerChild("club-info", "clubInfo", ClubInfoScreen);
const boardConfidenceRoute = defineCareerChild("board-confidence", "boardConfidence", BoardConfidenceScreen);
const clubHistoryRoute = defineCareerChild("club-history", "clubHistory", ClubHistoryScreen);
const financesRoute = defineCareerChild("finances", "finances", FinancesScreen);
const staffOverviewRoute = defineCareerChild("staff-overview", "staffOverview", StaffOverviewScreen);
const shortlistRoute = defineCareerChild("shortlist", "shortlist", ShortlistScreen);
const scoutingRoute = defineCareerChild("scouting", "scouting", ScoutingScreen);
const playerSearchRoute = defineCareerChild("player-search", "playerSearch", PlayerSearchScreen);
const staffSearchRoute = defineCareerChild("staff-search", "staffSearch", StaffSearchScreen);
const competitionsRoute = defineCareerChild("competitions", "competitions", CompetitionsScreen);
const nationsRoute = defineCareerChild("nations", "nations", NationsScreen);
const clubsRoute = defineCareerChild("clubs", "clubs", ClubsScreen);
const gameStatusRoute = defineCareerChild("game-status", "gameStatus", GameStatusScreen);
const managerChatRoute = defineCareerChild("manager-chat", "managerChat", ManagerChatScreen);

/**
 * The Tactics area is the one career surface with its own read-only home: `/tactics` lands on the
 * overview, and the editor sits one step beneath it at `/tactics/editor` (ticket 03). Both share
 * the `tactics` screen scope, so focus restoration, action availability, and the navbar's
 * "Formation" highlight treat the editor as a sub-surface rather than a tenth career screen.
 */
const tacticsRoute = createRoute({
  getParentRoute: () => saveRoute,
  path: "tactics",
  component: () => <Outlet />,
});

const tacticsIndexRoute = createRoute({
  getParentRoute: () => tacticsRoute,
  path: "/",
  component: () => <CareerChildView screenId="tactics" Screen={TacticsOverviewScreen} />,
});

const tacticsEditorRoute = createRoute({
  getParentRoute: () => tacticsRoute,
  path: "editor",
  component: () => <CareerChildView screenId="tactics" Screen={TacticsScreen} />,
});

/**
 * The club segment: `/career/$saveId/club/$clubId/...`, a surface scoped to some *other* club.
 *
 * Deliberately a reusable segment rather than a report-specific path. Every club-scoped screen
 * that follows (squad, tactical view, previous reports) hangs off the same `$clubId`, so the club
 * is decoded once at a shared boundary instead of each screen inventing its own parameter.
 *
 * It has no index route: `club/$clubId` alone names a club without saying what about it, so there
 * is nothing honest to land on. Each club surface is reached at its own child path.
 */
const clubRoute = createRoute({
  getParentRoute: () => saveRoute,
  path: "club/$clubId",
  component: () => <Outlet />,
});

const clubScoutReportRoute = createRoute({
  getParentRoute: () => clubRoute,
  path: "scout-report",
  component: () => (
    <CareerClubChildView screenId="teamScoutReport" Screen={TeamScoutReportScreen} />
  ),
});

const clubStaffRoute = createRoute({
  getParentRoute: () => clubRoute,
  path: "staff",
  component: () => <CareerClubChildView screenId="clubStaff" Screen={ClubStaffScreen} />,
});

// ---------------------------------------------------------------------------
// Player branch
// ---------------------------------------------------------------------------

/**
 * The player segment: `/career/$saveId/player/$playerId/...`, a surface scoped to a
 * specific player in the save. Mirrors the club segment structure.
 */
const playerRoute = createRoute({
  getParentRoute: () => saveRoute,
  path: "player/$playerId",
  component: () => <Outlet />,
});

const playerProfileRoute = createRoute({
  getParentRoute: () => playerRoute,
  path: "profile",
  component: () => (
    <CareerPlayerChildView screenId="playerProfile" Screen={PlayerProfileScreen} />
  ),
});

const playerAttributesRoute = createRoute({
  getParentRoute: () => playerRoute,
  path: "attributes",
  component: () => (
    <CareerPlayerChildView screenId="playerAttributes" Screen={PlayerAttributesScreen} />
  ),
});

const playerContractRoute = createRoute({
  getParentRoute: () => playerRoute,
  path: "contract",
  component: () => (
    <CareerPlayerChildView screenId="playerContract" Screen={PlayerContractScreen} />
  ),
});

const playerHistoryRoute = createRoute({
  getParentRoute: () => playerRoute,
  path: "history",
  component: () => (
    <CareerPlayerChildView screenId="playerHistory" Screen={PlayerHistoryScreen} />
  ),
});

const playerFormRoute = createRoute({
  getParentRoute: () => playerRoute,
  path: "form",
  component: () => (
    <CareerPlayerChildView screenId="playerForm" Screen={PlayerFormScreen} />
  ),
});

const playerInjuriesRoute = createRoute({
  getParentRoute: () => playerRoute,
  path: "injuries",
  component: () => (
    <CareerPlayerChildView screenId="playerInjuries" Screen={PlayerInjuriesScreen} />
  ),
});

const playerScoutReportRoute = createRoute({
  getParentRoute: () => playerRoute,
  path: "scout-report",
  component: () => (
    <CareerPlayerChildView screenId="playerScoutReport" Screen={PlayerScoutReportScreen} />
  ),
});

const playerCoachReportRoute = createRoute({
  getParentRoute: () => playerRoute,
  path: "coach-report",
  component: () => (
    <CareerPlayerChildView screenId="playerCoachReport" Screen={PlayerCoachReportScreen} />
  ),
});

// ---------------------------------------------------------------------------
// Staff branch — `/career/$saveId/staff/$staffId/...`
// ---------------------------------------------------------------------------

const staffRoute = createRoute({
  getParentRoute: () => saveRoute,
  path: "staff/$staffId",
  component: () => <Outlet />,
});

const staffProfileRoute = createRoute({
  getParentRoute: () => staffRoute,
  path: "profile",
  component: () => <CareerStaffChildView screenId="staffProfile" Screen={StaffProfileScreen} />,
});

const staffAttributesRoute = createRoute({
  getParentRoute: () => staffRoute,
  path: "attributes",
  component: () => <CareerStaffChildView screenId="staffAttributes" Screen={StaffAttributesScreen} />,
});

const staffContractRoute = createRoute({
  getParentRoute: () => staffRoute,
  path: "contract",
  component: () => <CareerStaffChildView screenId="staffContract" Screen={StaffContractScreen} />,
});

const staffHistoryRoute = createRoute({
  getParentRoute: () => staffRoute,
  path: "history",
  component: () => <CareerStaffChildView screenId="staffHistory" Screen={StaffHistoryScreen} />,
});

const staffJobInfoRoute = createRoute({
  getParentRoute: () => staffRoute,
  path: "job-info",
  component: () => <CareerStaffChildView screenId="staffJobInfo" Screen={StaffJobInfoScreen} />,
});

// ---------------------------------------------------------------------------
// Club sub-surface routes — additional views at `/career/$saveId/club/$clubId/...`
// ---------------------------------------------------------------------------

const clubSquadDetailRoute = createRoute({
  getParentRoute: () => clubRoute,
  path: "squad",
  component: () => <CareerClubChildView screenId="clubSquadDetail" Screen={ClubSquadDetailScreen} />,
});

const clubReservesDetailRoute = createRoute({
  getParentRoute: () => clubRoute,
  path: "reserves",
  component: () => <CareerClubChildView screenId="clubReservesDetail" Screen={ClubReservesDetailScreen} />,
});

const clubYouthDetailRoute = createRoute({
  getParentRoute: () => clubRoute,
  path: "youth",
  component: () => <CareerClubChildView screenId="clubYouthDetail" Screen={ClubYouthDetailScreen} />,
});

const clubFixturesDetailRoute = createRoute({
  getParentRoute: () => clubRoute,
  path: "fixtures",
  component: () => <CareerClubChildView screenId="clubFixturesDetail" Screen={ClubFixturesDetailScreen} />,
});

const clubTransfersDetailRoute = createRoute({
  getParentRoute: () => clubRoute,
  path: "transfers",
  component: () => <CareerClubChildView screenId="clubTransfersDetail" Screen={ClubTransfersDetailScreen} />,
});

const clubFinancesDetailRoute = createRoute({
  getParentRoute: () => clubRoute,
  path: "finances",
  component: () => <CareerClubChildView screenId="clubFinancesDetail" Screen={ClubFinancesDetailScreen} />,
});

const clubHistoryDetailRoute = createRoute({
  getParentRoute: () => clubRoute,
  path: "history",
  component: () => <CareerClubChildView screenId="clubHistoryDetail" Screen={ClubHistoryDetailScreen} />,
});

const clubCompetitionsDetailRoute = createRoute({
  getParentRoute: () => clubRoute,
  path: "competitions",
  component: () => <CareerClubChildView screenId="clubCompetitionsDetail" Screen={ClubCompetitionsDetailScreen} />,
});

const clubInformationRoute = createRoute({
  getParentRoute: () => clubRoute,
  path: "information",
  component: () => <CareerClubChildView screenId="clubInformation" Screen={ClubInformationScreen} />,
});

// ---------------------------------------------------------------------------
// Nation branch — `/career/$saveId/nation/$nationId/...`
// ---------------------------------------------------------------------------

const nationRoute = createRoute({
  getParentRoute: () => saveRoute,
  path: "nation/$nationId",
  component: () => <Outlet />,
});

const nationOverviewRoute = createRoute({
  getParentRoute: () => nationRoute,
  path: "overview",
  component: () => <CareerNationChildView screenId="nationOverview" Screen={NationOverviewScreen} />,
});

const nationSeniorSquadRoute = createRoute({
  getParentRoute: () => nationRoute,
  path: "senior-squad",
  component: () => <CareerNationChildView screenId="nationSeniorSquad" Screen={NationSeniorSquadScreen} />,
});

const nationYouthSquadsRoute = createRoute({
  getParentRoute: () => nationRoute,
  path: "youth-squads",
  component: () => <CareerNationChildView screenId="nationYouthSquads" Screen={NationYouthSquadsScreen} />,
});

const nationFixturesRoute = createRoute({
  getParentRoute: () => nationRoute,
  path: "fixtures",
  component: () => <CareerNationChildView screenId="nationFixtures" Screen={NationFixturesScreen} />,
});

const nationCompetitionsDetailRoute = createRoute({
  getParentRoute: () => nationRoute,
  path: "competitions",
  component: () => <CareerNationChildView screenId="nationCompetitions" Screen={NationCompetitionsDetailScreen} />,
});

const nationClubsRoute = createRoute({
  getParentRoute: () => nationRoute,
  path: "clubs",
  component: () => <CareerNationChildView screenId="nationClubs" Screen={NationClubsScreen} />,
});

const nationPlayersRoute = createRoute({
  getParentRoute: () => nationRoute,
  path: "players",
  component: () => <CareerNationChildView screenId="nationPlayers" Screen={NationPlayersScreen} />,
});

const nationStaffRoute = createRoute({
  getParentRoute: () => nationRoute,
  path: "staff",
  component: () => <CareerNationChildView screenId="nationStaff" Screen={NationStaffScreen} />,
});

const nationHistoryRoute = createRoute({
  getParentRoute: () => nationRoute,
  path: "history",
  component: () => <CareerNationChildView screenId="nationHistory" Screen={NationHistoryScreen} />,
});

const nationInformationRoute = createRoute({
  getParentRoute: () => nationRoute,
  path: "information",
  component: () => <CareerNationChildView screenId="nationInformation" Screen={NationInformationScreen} />,
});

// ---------------------------------------------------------------------------
// Competition branch — `/career/$saveId/competition/$competitionId/...`
// ---------------------------------------------------------------------------

const competitionRoute = createRoute({
  getParentRoute: () => saveRoute,
  path: "competition/$competitionId",
  component: () => <Outlet />,
});

const competitionOverviewRoute = createRoute({
  getParentRoute: () => competitionRoute,
  path: "overview",
  component: () => <CareerCompetitionChildView screenId="competitionOverview" Screen={CompetitionOverviewScreen} />,
});

const competitionTableRoute = createRoute({
  getParentRoute: () => competitionRoute,
  path: "table",
  component: () => <CareerCompetitionChildView screenId="competitionTable" Screen={CompetitionTableScreen} />,
});

const competitionFixturesDetailRoute = createRoute({
  getParentRoute: () => competitionRoute,
  path: "fixtures",
  component: () => <CareerCompetitionChildView screenId="competitionFixturesDetail" Screen={CompetitionFixturesDetailScreen} />,
});

const competitionResultsRoute = createRoute({
  getParentRoute: () => competitionRoute,
  path: "results",
  component: () => <CareerCompetitionChildView screenId="competitionResults" Screen={CompetitionResultsScreen} />,
});

const competitionStagesRoute = createRoute({
  getParentRoute: () => competitionRoute,
  path: "stages",
  component: () => <CareerCompetitionChildView screenId="competitionStages" Screen={CompetitionStagesScreen} />,
});

const competitionRulesRoute = createRoute({
  getParentRoute: () => competitionRoute,
  path: "rules",
  component: () => <CareerCompetitionChildView screenId="competitionRules" Screen={CompetitionRulesScreen} />,
});

const competitionStatisticsRoute = createRoute({
  getParentRoute: () => competitionRoute,
  path: "statistics",
  component: () => <CareerCompetitionChildView screenId="competitionStatistics" Screen={CompetitionStatisticsScreen} />,
});

const competitionPastWinnersRoute = createRoute({
  getParentRoute: () => competitionRoute,
  path: "past-winners",
  component: () => <CareerCompetitionChildView screenId="competitionPastWinners" Screen={CompetitionPastWinnersScreen} />,
});

const competitionRecordsRoute = createRoute({
  getParentRoute: () => competitionRoute,
  path: "records",
  component: () => <CareerCompetitionChildView screenId="competitionRecords" Screen={CompetitionRecordsScreen} />,
});

const competitionNewsRoute = createRoute({
  getParentRoute: () => competitionRoute,
  path: "news",
  component: () => <CareerCompetitionChildView screenId="competitionNews" Screen={CompetitionNewsScreen} />,
});

const competitionTeamsRoute = createRoute({
  getParentRoute: () => competitionRoute,
  path: "teams",
  component: () => <CareerCompetitionChildView screenId="competitionTeams" Screen={CompetitionTeamsScreen} />,
});

const competitionPlayerStatsRoute = createRoute({
  getParentRoute: () => competitionRoute,
  path: "player-stats",
  component: () => <CareerCompetitionChildView screenId="competitionPlayerStats" Screen={CompetitionPlayerStatsScreen} />,
});

// ---------------------------------------------------------------------------
// Match sub-screen placeholders — flat routes at `/career/$saveId/match-*`
// ---------------------------------------------------------------------------

const matchStatsRoute = defineCareerChild("match-stats", "matchStats", MatchStatsScreen);
const matchPlayerStatsRoute = defineCareerChild("match-player-stats", "matchPlayerStats", MatchPlayerStatsScreen);
const matchHomeTeamRoute = defineCareerChild("match-home-team", "matchHomeTeam", MatchHomeTeamScreen);
const matchAwayTeamRoute = defineCareerChild("match-away-team", "matchAwayTeam", MatchAwayTeamScreen);
const matchRatingsRoute = defineCareerChild("match-ratings", "matchRatings", MatchRatingsScreen);
const matchLatestScoresRoute = defineCareerChild("match-latest-scores", "matchLatestScores", MatchLatestScoresScreen);
const matchLiveTableRoute = defineCareerChild("match-live-table", "matchLiveTable", MatchLiveTableScreen);
const matchMatchTacticsRoute = defineCareerChild("match-match-tactics", "matchMatchTactics", MatchMatchTacticsScreen);
const matchSubstitutionsRoute = defineCareerChild("match-substitutions", "matchSubstitutions", MatchSubstitutionsScreen);
const matchOppositionInstructionsRoute = defineCareerChild("match-opposition-instructions", "matchOppositionInstructions", MatchOppositionInstructionsScreen);
const matchCommentaryRoute = defineCareerChild("match-commentary", "matchCommentary", MatchCommentaryScreen);
const matchReplaysRoute = defineCareerChild("match-replays", "matchReplays", MatchReplaysScreen);
const matchReportRoute = defineCareerChild("match-report", "matchReport", MatchReportScreen);

// ---------------------------------------------------------------------------
// Creation branch
// ---------------------------------------------------------------------------

export const createFlowRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "create",
  component: CreateFlowLayout,
});

/** League and Nation Selection (Screen 3) — the first creation stage. */
const createLeaguesRoute = createRoute({
  getParentRoute: () => createFlowRoute,
  path: "leagues",
  component: LeagueSelectionRouteContent,
});

const createStep1Route = createRoute({
  getParentRoute: () => createFlowRoute,
  path: "step-1",
  component: StepOneRouteContent,
});

const createStep2Route = createRoute({
  getParentRoute: () => createFlowRoute,
  path: "step-2",
  component: StepTwoRouteContent,
});

const createStep3Route = createRoute({
  getParentRoute: () => createFlowRoute,
  path: "step-3",
  component: StepThreeRouteContent,
});

const routeTree = rootRoute.addChildren([
  mainMenuRoute,
  loadCareerRoute,
  createFlowRoute.addChildren([
    createLeaguesRoute,
    createStep1Route,
    createStep2Route,
    createStep3Route,
  ]),
  careerRoute.addChildren([
    saveRoute.addChildren([
      careerIndexRoute,
      squadRoute,
      tacticsRoute.addChildren([tacticsIndexRoute, tacticsEditorRoute]),
      transfersRoute,
      leagueRoute,
      fixturesRoute,
      matchRoute,
      seasonSummaryRoute,
      managerRoute,
      newsRoute,
      trainingRoute,
      clubInfoRoute,
      boardConfidenceRoute,
      clubHistoryRoute,
      financesRoute,
      staffOverviewRoute,
      shortlistRoute,
      scoutingRoute,
      playerSearchRoute,
      staffSearchRoute,
      competitionsRoute,
      nationsRoute,
      clubsRoute,
      gameStatusRoute,
      managerChatRoute,
      clubRoute.addChildren([
        clubScoutReportRoute,
        clubStaffRoute,
        clubSquadDetailRoute,
        clubReservesDetailRoute,
        clubYouthDetailRoute,
        clubFixturesDetailRoute,
        clubTransfersDetailRoute,
        clubFinancesDetailRoute,
        clubHistoryDetailRoute,
        clubCompetitionsDetailRoute,
        clubInformationRoute,
      ]),
      playerRoute.addChildren([
        playerProfileRoute,
        playerAttributesRoute,
        playerContractRoute,
        playerHistoryRoute,
        playerFormRoute,
        playerInjuriesRoute,
        playerScoutReportRoute,
        playerCoachReportRoute,
      ]),
      staffRoute.addChildren([
        staffProfileRoute,
        staffAttributesRoute,
        staffContractRoute,
        staffHistoryRoute,
        staffJobInfoRoute,
      ]),
      nationRoute.addChildren([
        nationOverviewRoute,
        nationSeniorSquadRoute,
        nationYouthSquadsRoute,
        nationFixturesRoute,
        nationCompetitionsDetailRoute,
        nationClubsRoute,
        nationPlayersRoute,
        nationStaffRoute,
        nationHistoryRoute,
        nationInformationRoute,
      ]),
      competitionRoute.addChildren([
        competitionOverviewRoute,
        competitionTableRoute,
        competitionFixturesDetailRoute,
        competitionResultsRoute,
        competitionStagesRoute,
        competitionRulesRoute,
        competitionStatisticsRoute,
        competitionPastWinnersRoute,
        competitionRecordsRoute,
        competitionNewsRoute,
        competitionTeamsRoute,
        competitionPlayerStatsRoute,
      ]),
      matchStatsRoute,
      matchPlayerStatsRoute,
      matchHomeTeamRoute,
      matchAwayTeamRoute,
      matchRatingsRoute,
      matchLatestScoresRoute,
      matchLiveTableRoute,
      matchMatchTacticsRoute,
      matchSubstitutionsRoute,
      matchOppositionInstructionsRoute,
      matchCommentaryRoute,
      matchReplaysRoute,
      matchReportRoute,
    ]),
  ]),
]);

/** Hash routing: the active route survives a renderer reload (AC-10). */
export const router = createRouter({
  routeTree,
  history: createHashHistory(),
});

bindRouter(router);