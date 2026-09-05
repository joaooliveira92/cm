// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Effect } from "effect";
import type { LeagueSelectionSnapshot } from "@cm-clone/contracts";
import { LEAGUE_SETUP_INDEX } from "@cm-clone/shared";
import { LeagueSelectionScreen } from "../../../src/renderer/leagueSelection/LeagueSelectionScreen.js";
import {
  openSelect,
  pickOpenOption,
} from "../../setup/baseUiSelect.js";
import {
  applyLeaguePreset,
  buildLeaguePresetIntents,
  getLeagueSetupIndex,
  listLeaguePresets,
  loadSetupDraft,
  resolveLeagueSelection,
  saveLeaguePreset,
  saveSetupDraft,
  submitLeagueSelection,
} from "../../../src/main/world/index.js";

/**
 * The shipped screen against the shipped service.
 *
 * The responder below is the *real* main-process handler set, not a hand-written stand-in: each
 * call runs the same Effect `rpcServer.ts` runs and its result crosses a `JSON` round-trip, so
 * anything that only works because a class instance survived in-process fails here the way it
 * would fail in the app. What is mocked is the IPC transport, and nothing above or below it.
 */

interface RpcCall {
  readonly method: string;
  readonly payload: unknown;
}

const calls: Array<RpcCall> = [];
let userDataDir = "";

const wire = async (value: unknown): Promise<unknown> =>
  JSON.parse(JSON.stringify(value)) as unknown;

const respond = async (method: string, payload: unknown): Promise<unknown> => {
  const p = payload as Record<string, never>;
  switch (method) {
    case "getLeagueSetupIndex":
      return wire(await Effect.runPromise(getLeagueSetupIndex));
    case "resolveLeagueSelection":
      return wire(
        await Effect.runPromise(
          resolveLeagueSelection(
            (p as unknown as { selectionRevision: number }).selectionRevision,
            (p as unknown as { intents: [] }).intents,
          ),
        ),
      );
    case "submitLeagueSelection":
      return wire(
        await Effect.runPromise(
          submitLeagueSelection(userDataDir, (p as unknown as { intents: [] }).intents),
        ),
      );
    case "saveSetupDraft":
      return wire(
        await Effect.runPromise(
          saveSetupDraft(userDataDir, p as unknown as Parameters<typeof saveSetupDraft>[1]),
        ),
      );
    case "loadSetupDraft":
      return wire(await Effect.runPromise(loadSetupDraft(userDataDir)));
    case "buildLeaguePreset":
      return wire(
        await Effect.runPromise(
          buildLeaguePresetIntents((p as unknown as { preset: "recommended" }).preset),
        ),
      );
    case "listLeaguePresets":
      return wire(await Effect.runPromise(listLeaguePresets(userDataDir)));
    case "saveLeaguePreset":
      return wire(
        await Effect.runPromise(
          saveLeaguePreset(
            userDataDir,
            (p as unknown as { name: string }).name,
            (p as unknown as { intents: [] }).intents,
          ),
        ),
      );
    case "applyLeaguePreset":
      return wire(
        await Effect.runPromise(applyLeaguePreset(userDataDir, (p as unknown as { id: string }).id)),
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
        // The service's typed failures arrive here the way the real bridge delivers them.
        const error = cause as { _tag?: string };
        return error._tag === undefined
          ? { _tag: "Failure", error: { _tag: "TransportFailure", method, cause } }
          : { _tag: "Failure", error };
      }
    },
  };
};

const methodsCalled = (method: string): ReadonlyArray<RpcCall> =>
  calls.filter((call) => call.method === method);

const mountScreen = () => {
  const continued: Array<LeagueSelectionSnapshot> = [];
  let backCount = 0;
  const rendered = render(
    <LeagueSelectionScreen
      onContinue={(snapshot) => continued.push(snapshot)}
      onBack={() => {
        backCount += 1;
      }}
    />,
  );
  return { ...rendered, continued, backs: () => backCount };
};

/** The screen is settled once a resolve has answered and Continue has become live. */
const settled = async () =>
  waitFor(
    () => {
      const button = screen.getByRole("button", { name: /^Continue/ }) as HTMLButtonElement;
      expect(button.disabled).toBe(false);
    },
    { timeout: 3000 },
  );

beforeEach(async () => {
  calls.length = 0;
  userDataDir = await mkdtemp(path.join(tmpdir(), "cm-league-screen-"));
  installPreload();
  cleanup();
});
afterEach(cleanup);

describe("initial state (§6.1)", () => {
  it("applies the recommended configuration and says that it did", async () => {
    mountScreen();
    await screen.findByText(/A recommended league configuration has been selected/);
    expect(methodsCalled("buildLeaguePreset")).toHaveLength(1);
  });

  it("names the database it is selecting against", async () => {
    mountScreen();
    await screen.findByText(/Database: World Football, version 1\.0\.0/);
  });

  it("restores a stored draft instead of recommending, when one applies", async () => {
    await Effect.runPromise(
      saveSetupDraft(userDataDir, {
        intents: [
          {
            nationId: "nation_deu",
            mode: "playable",
            scopeOptionId: "scope_deu_top",
            source: "user",
          },
        ] as never,
        searchQuery: "",
        regionFilterId: null,
        statusFilter: "all",
      }),
    );
    mountScreen();
    await screen.findByText(/Your previous setup for this database was restored/);
    expect(methodsCalled("buildLeaguePreset")).toHaveLength(0);
  });
});

describe("the browser (§5.3, §7)", () => {
  it("renders a tree of regions that expand to their nations", async () => {
    mountScreen();
    await settled();

    const region = screen.getByRole("treeitem", { name: /Western Europe/ });
    expect(region.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(region);

    await waitFor(() => expect(screen.getByText("England")).toBeTruthy());
    expect(screen.getByRole("treeitem", { name: /Western Europe/ }).getAttribute("aria-expanded")).toBe("true");
  });

  it("offers no Playable mode for a nation the database cannot make playable (§7.3)", async () => {
    mountScreen();
    await settled();
    fireEvent.click(screen.getByRole("treeitem", { name: /Southern Europe/ }));

    await screen.findByText("Andorra");
    // Open the (Base UI) mode select for Andorra and confirm no Playable option is offered.
    const mode = screen.getByLabelText("Simulation mode for Andorra");
    await openSelect(mode);
    expect(screen.queryByRole("option", { name: "Playable" })).toBeNull();
    expect(screen.getByRole("option", { name: "Background" })).toBeTruthy();
    await pickOpenOption("Background");
    expect(screen.getByText("Background data only")).toBeTruthy();
  });

  it("keeps an unavailable nation visible and explains why it cannot be chosen (§7.1)", async () => {
    mountScreen();
    await settled();
    fireEvent.click(screen.getByRole("treeitem", { name: /Southern Europe/ }));

    await screen.findByText("Italy");
    expect(screen.getByText("Unavailable — content not installed")).toBeTruthy();
    // No mode control at all: the row explains itself rather than offering a dead choice.
    expect(screen.queryByLabelText("Simulation mode for Italy")).toBeNull();
  });

  it("shows an automatically included competition and says it was required (AC-5, §12.1)", async () => {
    mountScreen();
    await settled();
    fireEvent.click(screen.getByRole("treeitem", { name: /Western Europe/ }));
    await screen.findByText("England");

    // Expand England's pyramid. Its national cup is nobody's explicit choice.
    fireEvent.click(screen.getByRole("treeitem", { name: /England/ }));
    await waitFor(() => expect(screen.getByText(/English National Cup/)).toBeTruthy());
    const cupRow = screen.getByText(/English National Cup/).closest("li");
    expect(within(cupRow as HTMLElement).getByText("required by your selection")).toBeTruthy();
  });
});

describe("search and filters never mutate the selection (AC-8, §10.5)", () => {
  it("announces selected nations the filters are hiding", async () => {
    mountScreen();
    await settled();

    fireEvent.change(screen.getByLabelText("Search nations or competitions"), {
      target: { value: "Portugal" },
    });

    const notice = await screen.findByRole("status");
    expect(notice.textContent).toMatch(/selected nation.*hidden by the current filters/);
  });

  it("issues no resolve request for a search — filtering is display-only", async () => {
    mountScreen();
    await settled();
    const before = methodsCalled("resolveLeagueSelection").length;

    fireEvent.change(screen.getByLabelText("Search nations or competitions"), {
      target: { value: "eng" },
    });
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(methodsCalled("resolveLeagueSelection")).toHaveLength(before);
  });

  it("says so plainly when a search matches nothing (§30.2)", async () => {
    mountScreen();
    await settled();
    fireEvent.change(screen.getByLabelText("Search nations or competitions"), {
      target: { value: "zzzzzz" },
    });
    await screen.findByText(/No nations or competitions match your search/);
  });
});

describe("the summary reflects the effective selection (§11, AC-9)", () => {
  it("reports counts, estimates, a categorical speed, and a confidence", async () => {
    mountScreen();
    await settled();

    const summary = screen.getByLabelText("Selection summary");
    expect(within(summary).getByText("Selected nations")).toBeTruthy();
    expect(within(summary).getByText("Expected processing speed")).toBeTruthy();
    expect(within(summary).getByText("Estimate confidence")).toBeTruthy();
    // §11.4: the hedge travels with the numbers.
    expect(within(summary).getByText(/Estimates are approximate/)).toBeTruthy();
  });

  it("is a polite live region, so it is announced without stealing focus (§25.2)", async () => {
    mountScreen();
    await settled();
    expect(screen.getByLabelText("Selection summary").getAttribute("aria-live")).toBe("polite");
  });
});

describe("debounced, revision-guarded estimation (§11.5, AC-11)", () => {
  it("issues one request for a burst of rapid changes, not one per change", async () => {
    mountScreen();
    await settled();
    const before = methodsCalled("resolveLeagueSelection").length;

    fireEvent.click(screen.getByRole("treeitem", { name: /Western Europe/ }));
    await screen.findByText("England");
    const mode = screen.getByLabelText("Simulation mode for England");

    const burst = ["Background", "View only", "Not loaded", "Background"];
    // Four changes inside one debounce window (the trigger always reopens from the closed
    // state, so each burst step re-opens the popup). The steps are inherently sequential
    // closed→open→pick→reopen cycles, so they cannot be collected into a Promise.all.
    // eslint-disable-next-line no-await-in-loop
    await openSelect(mode);
    for (const label of burst) {
      // eslint-disable-next-line no-await-in-loop
      await pickOpenOption(label);
      // eslint-disable-next-line no-await-in-loop
      await openSelect(mode);
    }

    await settled();
    expect(methodsCalled("resolveLeagueSelection").length - before).toBe(1);
  });

  it("keeps the previous figures on screen while a newer estimate resolves", async () => {
    mountScreen();
    await settled();
    const summary = () => screen.getByLabelText("Selection summary");
    const clubsBefore = within(summary())
      .getByText("Estimated clubs")
      .parentElement?.textContent;
    expect(clubsBefore).toBeTruthy();

    fireEvent.click(screen.getByRole("treeitem", { name: /Western Europe/ }));
    await screen.findByText("England");
    const mode = screen.getByLabelText("Simulation mode for England");
    await openSelect(mode);
    await pickOpenOption("Background");

    // Immediately after the change and before the debounce fires, the previous figures are still
    // rendered — marked stale and dimmed, not blanked.
    expect(within(summary()).getByText("Updating estimate…")).toBeTruthy();
    expect(summary().getAttribute("aria-busy")).toBe("true");
    expect(within(summary()).getByText("Estimated clubs").parentElement?.textContent).toBe(
      clubsBefore,
    );
  });
});

describe("continue (§17)", () => {
  it("is dead until a current answer says the selection is valid", async () => {
    mountScreen();
    const button = await screen.findByRole("button", { name: /^Continue/ });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    await settled();
  });

  it("creates one snapshot and hands it up (AC-12)", async () => {
    const { continued } = mountScreen();
    await settled();

    fireEvent.click(screen.getByRole("button", { name: /^Continue/ }));

    await waitFor(() => expect(continued).toHaveLength(1));
    expect(continued[0]?.databaseFingerprint).toBe(LEAGUE_SETUP_INDEX.fingerprint);
    expect(continued[0]?.selections.length).toBeGreaterThan(0);
  });

  it("saves the setup draft before it continues (§29)", async () => {
    const { continued } = mountScreen();
    await settled();
    fireEvent.click(screen.getByRole("button", { name: /^Continue/ }));
    await waitFor(() => expect(continued).toHaveLength(1));
    expect(methodsCalled("saveSetupDraft").length).toBeGreaterThan(0);
  });

  it("submits once for a double activation (AC-13)", async () => {
    const { continued } = mountScreen();
    await settled();

    const button = screen.getByRole("button", { name: /^Continue/ });
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(continued).toHaveLength(1));
    expect(methodsCalled("submitLeagueSelection")).toHaveLength(1);
  });

  it("blocks and explains when the selection has no playable league (AC-7)", async () => {
    mountScreen();
    await settled();

    fireEvent.click(screen.getByRole("button", { name: "Clear Selection" }));

    await waitFor(
      () => {
        const alert = screen.getByRole("alert");
        expect(alert.textContent).toContain("Select at least one playable league before continuing.");
      },
      { timeout: 3000 },
    );
    expect((screen.getByRole("button", { name: /^Continue/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("back (§18)", () => {
  it("saves the draft before leaving, so returning finds the selection intact", async () => {
    const { backs } = mountScreen();
    await settled();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    await waitFor(() => expect(backs()).toBe(1));
    expect(methodsCalled("saveSetupDraft")).toHaveLength(1);
    // And the draft is genuinely readable afterwards, not merely requested.
    const draft = await Effect.runPromise(loadSetupDraft(userDataDir));
    expect(draft?.intents.length).toBeGreaterThan(0);
  });
});

describe("presets (§13)", () => {
  it("switches the whole selection when a preset is applied", async () => {
    mountScreen();
    await settled();
    const before = screen.getByLabelText("Selection summary").textContent;

    fireEvent.click(screen.getByRole("button", { name: "Broad world" }));

    await waitFor(
      () => expect(screen.getByLabelText("Selection summary").textContent).not.toBe(before),
      { timeout: 3000 },
    );
  });

  it("minimal produces a selection that still continues", async () => {
    const { continued } = mountScreen();
    await settled();

    const summaryText = () => screen.getByLabelText("Selection summary").textContent;
    const before = summaryText();
    fireEvent.click(screen.getByRole("button", { name: "Minimal" }));
    // Wait for the preset to actually land before continuing: clicking Continue against the
    // outgoing selection is the race this test would otherwise hide.
    await waitFor(() => expect(summaryText()).not.toBe(before), { timeout: 3000 });
    await settled();
    fireEvent.click(screen.getByRole("button", { name: /^Continue/ }));

    await waitFor(() => expect(continued).toHaveLength(1));
    expect(continued[0]?.estimate.playableNationCount).toBe(1);
  });
});
