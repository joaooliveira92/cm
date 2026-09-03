// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Effect } from "effect";
import type { LeagueSetupIndexView } from "@cm-clone/contracts";
import { getLeagueSetupIndex, resolveLeagueSelection } from "../src/main/leagueSelection.js";
import { ActiveLeaguesLayout } from "../src/renderer/activeLeagues/ActiveLeaguesLayout.js";
import {
  ActiveLeaguesProvider,
  useActiveLeagues,
} from "../src/renderer/activeLeagues/ActiveLeaguesProvider.js";
import { ActiveLeaguesWorkspace } from "../src/renderer/activeLeagues/ActiveLeaguesWorkspace.js";

/**
 * The workspace, the introduction, and the advanced disclosure on the shipped state owner, over
 * the shipped trusted service with a JSON round-trip at the transport — the same seam the grid
 * test uses, so nothing passes here that would only pass in-process.
 *
 * These assertions are about *rendered semantics*, never mechanism: which controls exist and
 * where, what the disclosure exposes to assistive technology, that a help control is its own tab
 * stop and reading it changes no setting, and that a changed option moves the derived estimate.
 * The dense visual look has no screenshot harness in this repo (the spec says so explicitly) and
 * this file does not invent one — the density numbers live in `density.ts` and are confirmed by a
 * human pass at the breakpoints.
 */

const wire = async (value: unknown): Promise<unknown> =>
  JSON.parse(JSON.stringify(value)) as unknown;

const respond = async (method: string, payload: unknown): Promise<unknown> => {
  switch (method) {
    case "getLeagueSetupIndex":
      return wire(await Effect.runPromise(getLeagueSetupIndex));
    case "resolveLeagueSelection": {
      const p = payload as { selectionRevision: number; intents: never[] };
      return wire(
        await Effect.runPromise(resolveLeagueSelection(p.selectionRevision, p.intents)),
      );
    }
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
      try {
        return { _tag: "Success", value: await respond(method, payload) };
      } catch (cause) {
        return { _tag: "Failure", error: { _tag: "TransportFailure", method, cause } };
      }
    },
  };
};

const BASE_INTENTS = [
  { nationId: "nation-eng", mode: "playable", scopeOptionId: "scope-eng-two", source: "user" },
  { nationId: "nation-esp", mode: "playable", scopeOptionId: "scope-esp-top", source: "user" },
] as const;

let presetCalls = 0;
let manageCalls = 0;

/** The workspace inside the shipped screen frame, wired to the shipped state owner exactly as
 *  the route will wire it. The sidebar and footer slots stay empty here: this slice ships the
 *  frame and the workspace; the next one fills them. */
const Host = () => {
  const {
    rows,
    addableLeagues,
    activeLeagueCount,
    nationCount,
    entityEstimate,
    processingCost,
    validation,
    stale,
    advancedOptions,
    dispatch,
  } = useActiveLeagues();
  return (
    <ActiveLeaguesLayout
      workspace={
        <ActiveLeaguesWorkspace
          rows={rows}
          addableLeagues={addableLeagues}
          activeLeagueCount={activeLeagueCount}
          nationCount={nationCount}
          advancedOptions={advancedOptions}
          blockingMessages={validation.blockingMessages}
          stale={stale}
          onAddLeague={(leagueId) => dispatch({ type: "addActiveLeague", leagueId })}
          onChangeDepth={(leagueId, simulationDepth) =>
            dispatch({ type: "changeSimulationDepth", leagueId, simulationDepth })
          }
          onRemove={(leagueId) => dispatch({ type: "removeActiveLeague", leagueId })}
          onChangeAdvancedOption={(key, value) =>
            dispatch({ type: "changeAdvancedOption", key, value })
          }
          onApplySetupPreset={() => {
            presetCalls += 1;
          }}
          onManageLeagues={() => {
            manageCalls += 1;
          }}
        />
      }
      sidebar={
        <div>
          <output data-testid="entity-count">{entityEstimate.entityCount}</output>
          <output data-testid="cost-meter">{processingCost.meterValue}</output>
        </div>
      }
    />
  );
};

let index: LeagueSetupIndexView;

const mount = () =>
  render(<ActiveLeaguesProvider index={index} initialIntents={BASE_INTENTS as never}>{<Host />}</ActiveLeaguesProvider>);

/** Settled once the first resolve has answered and the English rows exist. */
const settled = async () =>
  waitFor(
    () => {
      expect(screen.getByText("English First Division")).toBeTruthy();
    },
    { timeout: 3000 },
  );

const advancedTrigger = (): HTMLElement =>
  screen.getByRole("button", { name: "Advanced options" });

beforeEach(async () => {
  presetCalls = 0;
  manageCalls = 0;
  installPreload();
  cleanup();
  index = (await Effect.runPromise(getLeagueSetupIndex)) as LeagueSetupIndexView;
});
afterEach(cleanup);

describe("the introduction anchors on the current scope, not on a club that does not exist yet", () => {
  it("summarizes the active leagues and their nations, and its change action opens Manage leagues", async () => {
    mount();
    await settled();

    const summary = screen.getByTestId("scope-summary");
    expect(summary.textContent).toMatch(/^\d+ active leagues? across \d+ nations?\.$/);
    // The count in the sentence is the same figure the grid renders, never a separate tally.
    const rowCount = screen.getAllByRole("row").length - 1; // minus the header row
    expect(summary.textContent).toContain(`${rowCount} active league`);

    // No "currently selected team" chip: the club is chosen at a later step.
    expect(screen.queryByText(/currently selected team/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Change scope" }));
    expect(manageCalls).toBe(1);
  });
});

describe("the workspace actions are subordinate to the final action and absent from the table header", () => {
  it("offers the setup preset and Manage leagues below the list, outside the table", async () => {
    mount();
    await settled();

    fireEvent.click(screen.getByRole("button", { name: "Use setup preset" }));
    expect(presetCalls).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: "Manage leagues" }));
    expect(manageCalls).toBe(1);

    const table = screen.getByRole("table", { name: "Active leagues" });
    expect(within(table).queryByRole("button", { name: "Manage leagues" })).toBeNull();
    expect(within(table).queryByRole("button", { name: "Use setup preset" })).toBeNull();
  });
});

describe("the advanced disclosure", () => {
  it("is collapsed by default, expands, and collapses again", async () => {
    mount();
    await settled();

    const trigger = advancedTrigger();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("aria-controls")).toBeTruthy();
    expect(screen.queryByRole("combobox", { name: "Match simulation detail" })).toBeNull();

    fireEvent.click(trigger);
    await waitFor(() => {
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
    });
    expect(screen.getByRole("combobox", { name: "Match simulation detail" })).toBeTruthy();

    // The panel the trigger claims to control is the one that holds the options.
    const panel = document.getElementById(trigger.getAttribute("aria-controls") ?? "");
    expect(panel).not.toBeNull();
    expect(within(panel as HTMLElement).getByRole("combobox", { name: "Transfer market activity" })).toBeTruthy();

    fireEvent.click(trigger);
    await waitFor(() => {
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
    });
  });

  it("groups the options under labelled legends rather than one undifferentiated checklist", async () => {
    mount();
    await settled();
    fireEvent.click(advancedTrigger());

    expect(screen.getByRole("group", { name: "Simulation" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "World and information" })).toBeTruthy();

    // Staff generation and the editor are future slots, not dead controls on this screen.
    expect(screen.queryByRole("combobox", { name: /staff generation/i })).toBeNull();
    expect(screen.queryByRole("combobox", { name: /editor/i })).toBeNull();
  });

  it("gives each option a help control that is its own tab stop and changes no setting", async () => {
    mount();
    await settled();
    fireEvent.click(advancedTrigger());

    const control = screen.getByRole("combobox", { name: "Roster generation detail" }) as HTMLSelectElement;
    const before = control.value;

    const help = screen.getByRole("button", { name: "About Roster generation detail" });
    expect(help.getAttribute("aria-expanded")).toBe("false");
    // The help control is reachable on its own: a real tab stop, not a hover-only affordance.
    help.focus();
    expect(document.activeElement).toBe(help);

    fireEvent.click(help);
    expect(help.getAttribute("aria-expanded")).toBe("true");
    const helpText = document.getElementById(help.getAttribute("aria-controls") ?? "");
    expect(helpText?.hasAttribute("hidden")).toBe(false);
    expect(helpText?.textContent).toContain("squad");

    // Reading the help changed nothing about the setting it explains.
    expect(control.value).toBe(before);
  });

  it("moves the derived estimate when a real option changes — no option is a no-op", async () => {
    mount();
    await settled();
    fireEvent.click(advancedTrigger());

    const entityCount = () => Number(screen.getByTestId("entity-count").textContent);
    const before = entityCount();
    expect(before).toBeGreaterThan(0);

    fireEvent.change(screen.getByRole("combobox", { name: "Roster generation detail" }), {
      target: { value: "first_team" },
    });

    await waitFor(() => {
      expect(entityCount()).toBeLessThan(before);
    });
  });
});

describe("keyboard reachability across the workspace", () => {
  it("reaches every workspace control as a native control in visual order", async () => {
    mount();
    await settled();
    fireEvent.click(advancedTrigger());
    await screen.findByRole("combobox", { name: "Match simulation detail" });

    const controls = [...document.querySelectorAll<HTMLElement>("button, select, a[href]")];
    // Nothing is pulled out of, or ahead of, the natural tab order.
    for (const control of controls) {
      const tabIndex = control.getAttribute("tabindex");
      expect(tabIndex === null || tabIndex === "0").toBe(true);
    }

    const names = controls.map(
      (control) => control.getAttribute("aria-label") ?? control.textContent?.trim() ?? "",
    );
    const at = (needle: string): number => names.findIndex((name) => name === needle);

    // Visual order down the column: introduction, list, workspace actions, advanced section.
    expect(at("Change scope")).toBeGreaterThanOrEqual(0);
    expect(at("Change scope")).toBeLessThan(at("Simulation depth for English First Division"));
    expect(at("Simulation depth for English First Division")).toBeLessThan(at("Add league"));
    expect(at("Add league")).toBeLessThan(at("Use setup preset"));
    expect(at("Use setup preset")).toBeLessThan(at("Manage leagues"));
    expect(at("Manage leagues")).toBeLessThan(at("Advanced options"));
    expect(at("Advanced options")).toBeLessThan(at("About Match simulation detail"));

    // Every depth selector and every remove action in the list is keyboard-reachable.
    const rows = screen.getAllByRole("row").slice(1);
    for (const row of rows) {
      const removes = within(row).queryAllByRole("button");
      expect(removes.length).toBeGreaterThan(0);
    }
  });
});
