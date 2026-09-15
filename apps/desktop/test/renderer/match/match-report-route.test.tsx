// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it } from "vitest";
import { MatchId, SaveId } from "@cm-clone/contracts";
import { MatchReportScreen } from "../../../src/renderer/matchReport/MatchReportScreen.js";
import { resolveDestination } from "../../../src/renderer/navigation/destinations.js";
import { CareerMatchChildView } from "../../../src/renderer/router/career.js";
import { router as appRouter } from "../../../src/renderer/router/index.js";

const REPORT_PATH = "/career/$saveId/match-report/$matchId";

/** The match segment mounted at its path, so the test exercises the parameter decode rather than a
 *  hand-passed prop. The app router is checked separately for registering the same path. */
const mountAt = (path: string) => {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const careerRoute = createRoute({ getParentRoute: () => rootRoute, path: "career" });
  const saveRoute = createRoute({ getParentRoute: () => careerRoute, path: "$saveId", component: () => <Outlet /> });
  const reportRoute = createRoute({
    getParentRoute: () => saveRoute,
    path: "match-report/$matchId",
    component: () => <CareerMatchChildView screenId="matchReport" Screen={MatchReportScreen} />,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([careerRoute.addChildren([saveRoute.addChildren([reportRoute])])]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  return render(<RouterProvider router={router} />);
};

const mockPreload = (seen: Array<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (_method: string, payload: unknown) => {
      seen.push(payload);
      return { _tag: "Failure", error: { _tag: "MatchNotCompleteError", matchId: "7" } };
    },
  };
};

afterEach(() => cleanup());

describe("the Match Report route carries its match to the screen", () => {
  it("the app router registers the path the destination resolves to", () => {
    const resolved = resolveDestination({ type: "matchReport", saveId: SaveId.make("s1"), matchId: MatchId.make("7") });
    expect(resolved.to).toBe(REPORT_PATH);
    expect(Object.keys(appRouter.routesByPath)).toContain(REPORT_PATH);
  });

  it("reads the match named in the URL", async () => {
    const seen: Array<unknown> = [];
    mockPreload(seen);
    mountAt("/career/s1/match-report/7");
    expect(await screen.findByText("The match report is available once the result has been accepted.")).toBeTruthy();
    expect(seen).toEqual([{ saveId: "s1", matchId: "7" }]);
  });
});
