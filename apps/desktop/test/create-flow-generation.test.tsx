// @vitest-environment jsdom
import { StrictMode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bindRouter } from "../src/renderer/navigation/adapter.js";
import {
  CreateFlowLayout,
  StepOneRouteContent,
  StepThreeRouteContent,
  StepTwoRouteContent,
} from "../src/renderer/router/createFlow.js";

interface RpcCall {
  readonly method: string;
  readonly payload: unknown;
}

type Responder = (method: string, payload: unknown) => Promise<unknown>;

const calls: Array<RpcCall> = [];

const installPreload = (respond: Responder): void => {
  (window as unknown as { cmClone: { call: Responder } }).cmClone = {
    call: (method, payload) => {
      calls.push({ method, payload });
      return respond(method, payload);
    },
  };
};

const methodsCalled = (method: string): ReadonlyArray<RpcCall> =>
  calls.filter((call) => call.method === method);

/**
 * The real creation branch over a memory history. The flow is mounted through
 * an actual router rather than in isolation so the mount-time generation start,
 * the unmount-time abandonment, and the navigation adapter all run as shipped.
 */
const mountCreateFlow = ({
  strict = false,
  at = "/create/step-1",
}: { strict?: boolean; at?: string } = {}) => {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const saveListRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <p>Save List</p>,
  });
  const createFlowRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "create",
    component: CreateFlowLayout,
  });
  const routeTree = rootRoute.addChildren([
    saveListRoute,
    createFlowRoute.addChildren([
      createRoute({
        getParentRoute: () => createFlowRoute,
        path: "step-1",
        component: StepOneRouteContent,
      }),
      createRoute({
        getParentRoute: () => createFlowRoute,
        path: "step-2",
        component: StepTwoRouteContent,
      }),
      createRoute({
        getParentRoute: () => createFlowRoute,
        path: "step-3",
        component: StepThreeRouteContent,
      }),
    ]),
  ]);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [at] }),
  });
  bindRouter(router);
  const tree = <RouterProvider router={router} />;
  return render(strict ? <StrictMode>{tree}</StrictMode> : tree);
};

/** A deferred `beginCareer` the test settles by hand, to sit inside the race. */
const deferredBeginCareer = () => {
  let settle: ((value: unknown) => void) | null = null;
  const pending = new Promise<unknown>((resolve) => {
    settle = resolve;
  });
  installPreload((method) => {
    if (method === "beginCareer") return pending;
    return Promise.resolve({ _tag: "Success", value: undefined });
  });
  return {
    succeed: (id: string) => settle?.({ _tag: "Success", value: { id } }),
    fail: () =>
      settle?.({
        _tag: "Failure",
        error: { _tag: "TransportFailure", method: "beginCareer", cause: null },
      }),
  };
};

beforeEach(() => {
  calls.length = 0;
  // The router restores scroll on every navigation; jsdom has no scrollTo.
  window.scrollTo = () => {};
  cleanup();
});
afterEach(cleanup);

describe("Screen 2 — generation runs underneath the manager step", () => {
  it("starts generation on entering the flow, before the player asks for club selection", async () => {
    deferredBeginCareer();
    mountCreateFlow();

    await waitFor(() => expect(methodsCalled("beginCareer")).toHaveLength(1));
    // The player has not touched the transition; the wait is already underway.
    expect(screen.getByRole("button", { name: "Next: Select Club" })).toBeTruthy();
  });

  it("starts exactly one job under a double-invoked mount effect", async () => {
    // StrictMode runs the mount effect twice, which is the shape a rapid
    // re-entry takes: one world on disk, not two.
    const generation = deferredBeginCareer();
    mountCreateFlow({ strict: true });

    await waitFor(() => expect(methodsCalled("beginCareer")).toHaveLength(1));
    generation.succeed("provisional-1");
    await waitFor(() => expect(screen.queryByRole("progressbar")).toBeNull());

    expect(methodsCalled("beginCareer")).toHaveLength(1);
  });

  it("redirects a reload of a later step back to the manager step", async () => {
    // A reload arrives with an empty session and no world; step 2 has nothing
    // to select from, whether or not generation has started by then.
    deferredBeginCareer();
    mountCreateFlow({ at: "/create/step-2" });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Next: Select Club" })).toBeTruthy(),
    );
  });

  it("says why the transition into club selection is unavailable", async () => {
    const generation = deferredBeginCareer();
    mountCreateFlow();
    await waitFor(() => expect(methodsCalled("beginCareer")).toHaveLength(1));

    const next = screen.getByRole("button", { name: "Next: Select Club" });
    expect((next as HTMLButtonElement).disabled).toBe(true);
    // A greyed control that does not say why is not acceptable.
    expect(screen.getByText("Building the league first…")).toBeTruthy();
    expect(next.getAttribute("aria-describedby")).toBe("generation-blocked-reason");

    generation.succeed("provisional-1");
    await waitFor(() => expect(screen.queryByText("Building the league first…")).toBeNull());
  });

  it("represents the unmeasurable wait as indeterminate progress, not a percentage", async () => {
    deferredBeginCareer();
    mountCreateFlow();

    const bar = await screen.findByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBeNull();
    expect(bar.getAttribute("aria-label")).toBe("Building the league");
    expect(screen.getByRole("status").textContent).toBe("Building the league.");
  });
});

describe("Screen 2 — generation failure is recoverable", () => {
  it("offers Retry instead of a permanently disabled transition, and Retry reissues the job", async () => {
    const first = deferredBeginCareer();
    mountCreateFlow();
    await waitFor(() => expect(methodsCalled("beginCareer")).toHaveLength(1));

    first.fail();
    const retry = await screen.findByRole("button", { name: "Retry" });
    // The failure speaks; the blocked-reason line steps aside for it.
    expect(screen.queryByText("Building the league first…")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("Building the league failed.");

    const second = deferredBeginCareer();
    fireEvent.click(retry);
    await waitFor(() => expect(methodsCalled("beginCareer")).toHaveLength(2));

    second.succeed("provisional-1");
    await waitFor(() => expect(screen.queryByRole("button", { name: "Retry" })).toBeNull());
  });
});

describe("Screen 2 — leaving creation never orphans a provisional world", () => {
  it("discards a world that was ready when the player cancelled", async () => {
    const generation = deferredBeginCareer();
    mountCreateFlow();
    await waitFor(() => expect(methodsCalled("beginCareer")).toHaveLength(1));
    generation.succeed("provisional-1");
    await waitFor(() => expect(screen.queryByRole("progressbar")).toBeNull());

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(methodsCalled("discardCareer")).toHaveLength(1));
    expect(methodsCalled("discardCareer")[0]?.payload).toEqual({ id: "provisional-1" });
  });

  it("discards a world that arrives after the player cancelled", async () => {
    const generation = deferredBeginCareer();
    mountCreateFlow();
    await waitFor(() => expect(methodsCalled("beginCareer")).toHaveLength(1));

    // Cancel lands while `beginCareer` is still in flight: the id being
    // discarded does not exist yet at the moment the player asks.
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await screen.findByText("Save List");
    expect(methodsCalled("discardCareer")).toHaveLength(0);

    generation.succeed("provisional-late");

    await waitFor(() => expect(methodsCalled("discardCareer")).toHaveLength(1));
    expect(methodsCalled("discardCareer")[0]?.payload).toEqual({ id: "provisional-late" });
  });

  it("discards once, not once per teardown", async () => {
    const generation = deferredBeginCareer();
    const { unmount } = mountCreateFlow();
    await waitFor(() => expect(methodsCalled("beginCareer")).toHaveLength(1));
    generation.succeed("provisional-1");
    await waitFor(() => expect(screen.queryByRole("progressbar")).toBeNull());

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(methodsCalled("discardCareer")).toHaveLength(1));
    unmount();

    await waitFor(() => expect(methodsCalled("discardCareer")).toHaveLength(1));
  });
});
