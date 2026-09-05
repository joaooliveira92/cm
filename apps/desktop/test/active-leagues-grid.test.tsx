// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Effect } from "effect";
import type { LeagueSetupIndexView } from "@cm-clone/contracts";
import { resolveLeagueSelection, getLeagueSetupIndex } from "../src/main/leagueSelection.js";
import { ActiveLeaguesProvider, useActiveLeagues } from "../src/renderer/activeLeagues/ActiveLeaguesProvider.js";
import { LeagueGrid } from "../src/renderer/activeLeagues/LeagueGrid.js";
import {
  chooseOptionByLabel,
  selectValueOf,
} from "./setup/baseUiSelect.js";

/**
 * The shipped grid on the shipped state owner against the shipped service.
 *
 * Same seam as the league-selection-screen test: each RPC call runs the real main-process
 * handler and its result crosses a JSON round-trip, so anything that only works because a class
 * instance survived in-process fails here the way it would fail in the app. What is mocked is
 * the IPC transport, and nothing above or below it.
 *
 * Two catalogues' Leagues sit in the initial intents so the *targeting* assertions have a
 * control: changing English First Division's depth or removing English Second Division must
 * touch England only and leave Spain's rows alone. Row identity is asserted through rendered
 * semantics (which leagues render, whose depth selector moved, whose rows disappeared), never
 * through the implementation.
 */

interface RpcCall {
  readonly method: string;
  readonly payload: unknown;
}

const calls: Array<RpcCall> = [];
/** Flips the resolver to fail once set — exercising the failure slot as a checked value. */
let failResolve = false;

const wire = async (value: unknown): Promise<unknown> => JSON.parse(JSON.stringify(value)) as unknown;

const respond = async (method: string, payload: unknown): Promise<unknown> => {
  const p = payload as Record<string, never>;
  switch (method) {
    case "getLeagueSetupIndex":
      return wire(await Effect.runPromise(getLeagueSetupIndex));
    case "resolveLeagueSelection":
      if (failResolve) throw new Error("resolver exploded");
      return wire(
        await Effect.runPromise(
          resolveLeagueSelection(
            (p as unknown as { selectionRevision: number }).selectionRevision,
            (p as unknown as { intents: never[] }).intents,
          ),
        ),
      );
    default:
      throw new Error(`unexpected rpc method: ${method}`);
  }
};

const installPreload = (): void => {
  (
    window as unknown as {
      cmClone: { call: (method: string, payload: unknown) => Promise<unknown> };
    }
  ).cmClone = {
    call: async (method, payload) => {
      calls.push({ method, payload });
      try {
        return { _tag: "Success", value: await respond(method, payload) };
      } catch (cause) {
        const error = cause as { _tag?: string };
        return error._tag === undefined
          ? { _tag: "Failure", error: { _tag: "TransportFailure", method, cause } }
          : { _tag: "Failure", error };
      }
    },
  };
};

const lastResolveIntents = (): readonly { readonly nationId: string; readonly mode: string }[] => {
  const resolveCalls = calls.filter((call) => call.method === "resolveLeagueSelection");
  const last = resolveCalls.at(-1);
  if (last === undefined) return [];
  return (last.payload as { readonly intents: readonly { readonly nationId: string; readonly mode: string }[] })
    .intents;
};

/** England playable at the top-two scope, Spain playable at the top division. */
const BASE_INTENTS = [
  { nationId: "nation_eng", mode: "playable", scopeOptionId: "scope_eng_two", source: "user" },
  { nationId: "nation_esp", mode: "playable", scopeOptionId: "scope_esp_top", source: "user" },
] as const;

/** The workspace host ticket 04 tests against: the grid plus the derived reads the sidebar will
 *  consume (entity count, cost meter) and the Continue gating the footer will bind to. */
const Host = () => {
  const {
    rows,
    entityEstimate,
    processingCost,
    canContinue,
    stale,
    validation,
    dispatch,
  } = useActiveLeagues();
  return (
    <div>
      <LeagueGrid
        rows={rows}
        onChangeDepth={(leagueId, simulationDepth) =>
          dispatch({ type: "changeSimulationDepth", leagueId, simulationDepth })
        }
        onRemove={(leagueId) => dispatch({ type: "removeActiveLeague", leagueId })}
      />
      <output data-testid="entity-count">{entityEstimate.entityCount}</output>
      <output data-testid="cost-meter">{processingCost.meterValue}</output>
      <output data-testid="stale">{stale ? "stale" : "fresh"}</output>
      <output data-testid="blocked">{validation.blockingMessages.join(" | ")}</output>
      <button type="button" disabled={!canContinue}>
        Continue
      </button>
      <button
        type="button"
        onClick={() =>
          dispatch({
            type: "applySetupPreset",
            intents: BASE_INTENTS as never,
            notice: null,
          })
        }
      >
        Apply preset
      </button>
    </div>
  );
};

let index: LeagueSetupIndexView;

/** The screen has settled when the England rows have appeared (the first resolve answered). */
const settled = async () =>
  waitFor(
    () => {
      expect(screen.getByText("English First Division")).toBeTruthy();
    },
    { timeout: 3000 },
  );

const depthSelect = (league: string): HTMLElement =>
  screen.getByLabelText(`Simulation depth for ${league}`);

beforeEach(async () => {
  calls.length = 0;
  failResolve = false;
  installPreload();
  cleanup();
  index = (await Effect.runPromise(getLeagueSetupIndex)) as LeagueSetupIndexView;
});
afterEach(cleanup);

describe("the league grid renders the active leagues (§density, identity by league id)", () => {
  it("renders one stable row per active league with identifier, depth, recommendation, and remove", async () => {
    render(
      <ActiveLeaguesProvider index={index} initialIntents={BASE_INTENTS as never}>
        <Host />
      </ActiveLeaguesProvider>,
    );
    await settled();

    // Identifier: the league name and the scope description that names the Nation's scope. The
    // description is per Nation, so both England rows share it — asserted as a set, not a single.
    expect(screen.getByText("English First Division")).toBeTruthy();
    expect(screen.getAllByText("Top two divisions").length).toBe(3);
    expect(screen.getByText("English Second Division")).toBeTruthy();
    // A dependency row (the cup its top division requires) renders at its effective depth and
    // offers no depth selector — the grid never fabricates an override.
    expect(screen.getByText("English National Cup")).toBeTruthy();
    expect(screen.queryByLabelText("Simulation depth for English National Cup")).toBeNull();

    // Every directly-chosen row carries a recommendation with visible text — icon alone is banned.
    // England's rows read the recruitment link to the active Spain (authoritative data, never a
    // club-grounded reason).
    const firstDivisionRow = screen.getByText("English First Division").closest('[role="row"]');
    expect(firstDivisionRow).not.toBeNull();
    expect(
      within(firstDivisionRow as HTMLElement).getByText(/England clubs recruit players from Spain/),
    ).toBeTruthy();

    // Remove action present and accessibly named with the league identity.
    const remove = screen.getByRole("button", { name: "Remove English Second Division" });
    expect(remove).toBeTruthy();
  });

  it("keeps Spanish rows untouched when English rows change — identity is the league id, not the index", async () => {
    render(
      <ActiveLeaguesProvider index={index} initialIntents={BASE_INTENTS as never}>
        <Host />
      </ActiveLeaguesProvider>,
    );
    await settled();

    await chooseOptionByLabel(/Simulation depth for English First Division/, "Standard");

    // Depth change is per row identity: England's row moved, Spain's did not.
    await waitFor(
      () => expect(selectValueOf(depthSelect("English First Division"))).toBe("standard"),
      { timeout: 3000 },
    );
    expect(selectValueOf(depthSelect("Spanish First Division"))).toBe("full");
    // The trusted layer received the intent for England's Nation at background.
    expect(lastResolveIntents().find((intent) => intent.nationId === "nation_eng")?.mode).toBe(
      "background",
    );
    expect(lastResolveIntents().find((intent) => intent.nationId === "nation_esp")?.mode).toBe(
      "playable",
    );
  });
});

describe("remove targets the correct stable league id", () => {
  it("takes only the owning Nation's rows out and leaves the other Nation alone", async () => {
    render(
      <ActiveLeaguesProvider index={index} initialIntents={BASE_INTENTS as never}>
        <Host />
      </ActiveLeaguesProvider>,
    );
    await settled();

    fireEvent.click(screen.getByRole("button", { name: "Remove English Second Division" }));

    await waitFor(
      () => {
        // England's rows are gone from the grid (the whole Nation left per the safety rail)…
        expect(screen.queryByText("English First Division")).toBeNull();
        expect(screen.queryByText("English Second Division")).toBeNull();
      },
      { timeout: 3000 },
    );
    // …and the other Nation's rows stayed — the remove was routed through the right league id.
    expect(screen.getByText("Spanish First Division")).toBeTruthy();
    expect(lastResolveIntents()).toHaveLength(1);
    expect(lastResolveIntents()[0]).toMatchObject({ nationId: "nation_esp" });
  });
});

describe("derived summary values (ticket 02) move with the configuration", () => {
  it("entity count and processing cost recompute after a depth change", async () => {
    render(
      <ActiveLeaguesProvider index={index} initialIntents={BASE_INTENTS as never}>
        <Host />
      </ActiveLeaguesProvider>,
    );
    await settled();

    const entitiesBefore = screen.getByTestId("entity-count").textContent;
    const meterBefore = screen.getByTestId("cost-meter").textContent;

    await chooseOptionByLabel(/Simulation depth for English First Division/, "Results only");

    await waitFor(
      () => expect(screen.getByTestId("entity-count").textContent).not.toBe(entitiesBefore),
      { timeout: 3000 },
    );
    expect(screen.getByTestId("cost-meter").textContent).not.toBe(meterBefore);
  });

  it("is marked stale while a newer answer is in flight and fresh once it lands", async () => {
    render(
      <ActiveLeaguesProvider index={index} initialIntents={BASE_INTENTS as never}>
        <Host />
      </ActiveLeaguesProvider>,
    );
    await settled();
    expect(screen.getByTestId("stale").textContent).toBe("fresh");

    await chooseOptionByLabel(/Simulation depth for English First Division/, "Results only");
    // Immediately after the change the previous figures stay up but are marked stale.
    expect(screen.getByTestId("stale").textContent).toBe("stale");

    await waitFor(
      () => expect(screen.getByTestId("stale").textContent).toBe("fresh"),
      { timeout: 3000 },
    );
  });
});

describe("a resolve failure is a checked value, never a throw", () => {
  it("keeps the previous answer on screen, marks it stale, and disables Continue", async () => {
    render(
      <ActiveLeaguesProvider index={index} initialIntents={BASE_INTENTS as never}>
        <Host />
      </ActiveLeaguesProvider>,
    );
    await settled();
    expect(screen.getByTestId("stale").textContent).toBe("fresh");

    failResolve = true;
    await chooseOptionByLabel(/Simulation depth for English First Division/, "Standard");

    // The failure lands in the checked `failed` slot: the previous rows stay visible (no blank),
    // the summary is marked stale, and Continue is dead until a fresh answer arrives — nothing
    // threw.
    await waitFor(
      () => expect(screen.getByTestId("stale").textContent).toBe("stale"),
      { timeout: 3000 },
    );
    expect(screen.getByText("English First Division")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});

describe("Continue gating comes from validation, never thrown", () => {
  it("is disabled when validation fails and re-enabled once a valid setup lands", async () => {
    render(
      <ActiveLeaguesProvider index={index}>
        <Host />
      </ActiveLeaguesProvider>,
    );

    // Empty scope: blocked by the at-least-one-active-league rule.
    await waitFor(
      () => expect(screen.getByTestId("blocked").textContent).toContain("Select at least one active league"),
      { timeout: 3000 },
    );
    expect((screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement).disabled).toBe(true);

    // A valid preset makes it live.
    fireEvent.click(screen.getByRole("button", { name: "Apply preset" }));
    await waitFor(
      () =>
        expect((screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement).disabled).toBe(false),
      { timeout: 3000 },
    );
    expect(screen.getByTestId("blocked").textContent).toBe("");

    // While a resolve is in flight Continue is disabled even with a valid scope — continuing on
    // stale figures is exactly the race §11.5 exists to prevent — so the blocked reason together
    // with the disabled button is the settled empty state.
    fireEvent.click(screen.getByRole("button", { name: "Remove English First Division" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove Spanish First Division" }));
    await waitFor(
      () => {
        expect(
          (screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement).disabled,
        ).toBe(true);
        expect(screen.getByTestId("blocked").textContent).toContain(
          "Select at least one active league",
        );
      },
      { timeout: 3000 },
    );
  });
});