import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { bindRouter } from "../navigation/adapter.js";
import { KeyboardSpine } from "../KeyboardSpine.js";
import { FixturesScreen } from "../FixturesScreen.js";
import { LeagueTableScreen } from "../LeagueTableScreen.js";
import { ManagerProfileScreen } from "../ManagerProfileScreen.js";
import { MatchDayScreen } from "../MatchDayScreen.js";
import { SeasonSummaryScreen } from "../SeasonSummaryScreen.js";
import { SquadScreen } from "../SquadScreen.js";
import { TacticsScreen } from "../TacticsScreen.js";
import { TransfersScreen } from "../TransfersScreen.js";
import { SaveListScreen } from "./saveList.js";
import {
  CareerChildView,
  CareerIndexRedirect,
  CareerShell,
} from "./career.js";
import {
  CreateFlowLayout,
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

const saveListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: SaveListScreen,
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
const tacticsRoute = defineCareerChild("tactics", "tactics", TacticsScreen);
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

// ---------------------------------------------------------------------------
// Creation branch
// ---------------------------------------------------------------------------

export const createFlowRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "create",
  component: CreateFlowLayout,
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
  saveListRoute,
  createFlowRoute.addChildren([
    createStep1Route,
    createStep2Route,
    createStep3Route,
  ]),
  careerRoute.addChildren([
    saveRoute.addChildren([
      careerIndexRoute,
      squadRoute,
      tacticsRoute,
      transfersRoute,
      leagueRoute,
      fixturesRoute,
      matchRoute,
      seasonSummaryRoute,
      managerRoute,
    ]),
  ]),
]);

/** Hash routing: the active route survives a renderer reload (AC-10). */
export const router = createRouter({
  routeTree,
  history: createHashHistory(),
});

bindRouter(router);