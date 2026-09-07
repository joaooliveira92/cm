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
import {
  CareerChildView,
  CareerClubChildView,
  CareerIndexRedirect,
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
 * is nothing honest to land on. The report is reached at its own child path.
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
      clubRoute.addChildren([clubScoutReportRoute]),
    ]),
  ]),
]);

/** Hash routing: the active route survives a renderer reload (AC-10). */
export const router = createRouter({
  routeTree,
  history: createHashHistory(),
});

bindRouter(router);