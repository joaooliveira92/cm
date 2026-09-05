// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Effect } from "effect";
import type { LeagueSelectionSnapshot } from "@cm-clone/contracts";
import { ActiveLeaguesScreen } from "../src/renderer/activeLeagues/ActiveLeaguesScreen.js";
import {
  chooseOption,
  commitPointerClick,
  openSelect,
  selectValueOf,
} from "./setup/baseUiSelect.js";
import {
  buildLeaguePresetIntents,
  getLeagueSetupIndex,
  loadSetupDraft,
  resolveLeagueSelection,
  saveSetupDraft,
  submitLeagueSelection,
} from "../src/main/leagueSelection.js";

/**
 * The shipped Active Leagues screen against the shipped trusted service.
 *
 * The responder below is the *real* main-process handler set, not a stand-in: every call runs the
 * Effect `rpcServer.ts` runs and its result crosses a `JSON` round-trip, so anything that only
 * works because a class instance survived in-process fails here the way it would fail in the app.
 * What is mocked is the IPC transport, and nothing above or below it.
 *
 * Every assertion below is about rendered semantics or an observable effect at the boundary —
 * which leagues render, what a control emits and against which stable id, whether a derived
 * figure moved, whether Continue is allowed, what the failure state presents. Utility classes,
 * atom wiring, and reducer internals are the mechanism, and nothing here asserts them.
 */

const wire = async (value: unknown): Promise<unknown> =>
  JSON.parse(JSON.stringify(value)) as unknown;

let userDataDir = "";
let submitCalls = 0;
/** Set by a test that wants the boundary to refuse the submission. */
let failSubmit = false;
const calls: Array<{ method: string; payload: unknown }> = [];

const lastResolveIntents = (): readonly { readonly nationId?: string; readonly mode?: string }[] => {
  const resolveCalls = calls.filter((call) => call.method === "resolveLeagueSelection");
  const last = resolveCalls.at(-1);
  if (last === undefined) return [];
  return (last.payload as { readonly intents: readonly { readonly nationId?: string; readonly mode?: string }[] })
    .intents;
};

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
      submitCalls += 1;
      if (failSubmit) throw new Error("boundary refused");
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
        return { _tag: "Failure", error: { _tag: "TransportFailure", method, cause } };
      }
    },
  };
};

let continued: LeagueSelectionSnapshot | null = null;
let cancelled = 0;

const mount = () =>
  render(
    <ActiveLeaguesScreen
      onContinue={(snapshot) => {
        continued = snapshot;
      }}
      onCancel={() => {
        cancelled += 1;
      }}
    />,
  );

/** Settled once the boot has landed and the recommended preset's rows are on screen. */
const settled = async (): Promise<void> => {
  await waitFor(
    () => {
      expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
    },
    { timeout: 4000 },
  );
};

const continueButton = (): HTMLButtonElement =>
  screen.getByRole("button", { name: /^Continue/ }) as HTMLButtonElement;

beforeEach(async () => {
  userDataDir = await mkdtemp(path.join(tmpdir(), "cm-active-leagues-"));
  submitCalls = 0;
  failSubmit = false;
  continued = null;
  cancelled = 0;
  calls.length = 0;
  installPreload();
  // jsdom has no `matchMedia`; the screen's placement decision reads it, so give it the wide
  // answer — the narrow reflow is a layout behaviour confirmed by the human breakpoint pass.
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as never;
});

afterEach(() => {
  cleanup();
});

describe("the consequence sidebar", () => {
  it("reports the derived entity count and a processing-cost meter with a readable label", async () => {
    mount();
    await settled();

    const sidebar = screen.getByRole("complementary", { name: "Setup consequences" });
    const count = Number(within(sidebar).getByTestId("entity-count").textContent?.replace(/\D/g, ""));
    expect(count).toBeGreaterThan(0);

    const meter = within(sidebar).getByRole("meter", { name: "Processing cost" });
    expect(Number(meter.getAttribute("aria-valuenow"))).toBeGreaterThanOrEqual(1);
    expect(meter.getAttribute("aria-valuetext")).toBeTruthy();
  });

  it("moves the entity count when the configuration changes", async () => {
    mount();
    await settled();

    const readCount = (): number =>
      Number(screen.getByTestId("entity-count").textContent?.replace(/\D/g, ""));
    const before = readCount();

    // Remove a league: fewer active competitions must mean fewer loaded entities.
    const row = screen.getAllByRole("row")[1]!;
    const remove = within(row).getByRole("button", { name: /^Remove / });
    fireEvent.click(remove);

    await waitFor(() => {
      expect(readCount()).toBeLessThan(before);
    }, { timeout: 4000 });
  });

  it("carries no start-date and no database-preset control, and says what happens next", async () => {
    mount();
    await settled();

    const sidebar = screen.getByRole("complementary", { name: "Setup consequences" });
    expect(within(sidebar).queryByLabelText(/start date/i)).toBeNull();
    expect(within(sidebar).queryByLabelText(/database (size|preset)/i)).toBeNull();
    expect(
      within(sidebar).getByText(/Continue records this selection/),
    ).toBeTruthy();
  });

  it("announces the processing cost through a polite live region", async () => {
    mount();
    await settled();

    const live = screen
      .getAllByRole("status")
      .find((node) => node.getAttribute("aria-live") === "polite" && /Processing cost/.test(node.textContent ?? ""));
    expect(live).toBeTruthy();
  });
});

describe("the league list", () => {
  it("names every icon-only remove action with the league it removes", async () => {
    mount();
    await settled();

    const removes = screen.getAllByRole("button", { name: /^Remove / });
    expect(removes.length).toBeGreaterThan(0);
    for (const button of removes) {
      expect(button.getAttribute("aria-label")).toMatch(/^Remove .+/);
    }
  });

  it("adds a league from the catalogue and stops offering it once it is active", async () => {
    mount();
    await settled();

    // The catalogue is a Base UI select: open it, take a concrete candidate by its visible
    // "Nation — League" label, and commit the pick with a pointer sequence.
    await openSelect(screen.getByLabelText("League to add"));
    const candidate = (await screen.findAllByRole("option")).find(
      (option) => (option.textContent ?? "").includes(" — "),
    );
    expect(candidate).toBeTruthy();
    const label = candidate!.textContent ?? "";
    commitPointerClick(candidate!);
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());

    fireEvent.click(screen.getByRole("button", { name: "Add league" }));

    // The catalogue minus the newly active league no longer offers the candidate. The option
    // set only refreshes on a reopen, so each retry closes and reopens the popup.
    await waitFor(
      async () => {
        const trigger = screen.getByLabelText("League to add");
        if (screen.queryByRole("listbox") === null) {
          fireEvent.click(trigger);
          await screen.findByRole("listbox");
        }
        const now = await screen.findAllByRole("option");
        const stillOffered = now.some((option) => option.textContent === label);
        if (stillOffered) {
          fireEvent.click(trigger);
          await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
        }
        expect(stillOffered).toBe(false);
      },
      { timeout: 4000 },
    );
    expect(label).toBeTruthy();
  });

  it("targets the depth change at the row's stable league id, not its position", async () => {
    mount();
    await settled();

    const row = screen
      .getAllByRole("row")
      .find((candidate) => within(candidate).queryByRole("combobox") !== null)!;
    const leagueId = row.getAttribute("data-league-row");
    expect(leagueId).toBeTruthy();

    const select = within(row).getByRole("combobox");
    const name = select.getAttribute("aria-label") ?? "";
    await chooseOption(select, /Results only/);

    // The league — re-found by its name, which is what the id keys — still carries the change.
    await waitFor(
      () => {
        expect(selectValueOf(screen.getByLabelText(name))).toBe("results-only");
      },
      { timeout: 4000 },
    );
    // And the trusted layer actually received the new depth for the owning Nation — the change
    // drove the resolve, rather than showing a value only a test had written.
    expect(lastResolveIntents().some((intent) => intent.mode === "view_only")).toBe(true);
  });

  it("moves focus to a neighbouring control after a removal, never to nowhere", async () => {
    mount();
    await settled();

    const removes = screen.getAllByRole("button", { name: /^Remove / });
    removes[0]!.focus();
    fireEvent.click(removes[0]!);

    await waitFor(
      () => {
        expect(document.activeElement).not.toBe(document.body);
        expect(document.activeElement?.tagName).toBe("BUTTON");
      },
      { timeout: 4000 },
    );
  });
});

describe("Continue and the handoff", () => {
  it("records the snapshot and hands it to the flow", async () => {
    mount();
    await settled();

    await waitFor(() => {
      expect(continueButton().disabled).toBe(false);
    }, { timeout: 4000 });
    fireEvent.click(continueButton());

    await waitFor(() => {
      expect(continued).not.toBeNull();
    }, { timeout: 4000 });
    expect(continued?.id).toBeTruthy();
  });

  it("refuses a second submission while one is in flight", async () => {
    mount();
    await settled();
    await waitFor(() => {
      expect(continueButton().disabled).toBe(false);
    }, { timeout: 4000 });

    const button = continueButton();
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => {
      expect(continued).not.toBeNull();
    }, { timeout: 4000 });
    expect(submitCalls).toBe(1);
  });

  it("blocks Continue while the setup carries no active league", async () => {
    mount();
    await settled();

    // Empty the setup one row at a time; a scope with nothing active cannot be continued from.
    // Each removal must settle before the next click, so the awaits cannot be parallelised.
    for (let guard = 0; guard < 40; guard += 1) {
      const removes = screen.queryAllByRole("button", { name: /^Remove / });
      if (removes.length === 0) break;
      fireEvent.click(removes[0]!);
      // eslint-disable-next-line no-await-in-loop
      await waitFor(
        () => {
          expect(screen.queryAllByRole("button", { name: /^Remove / }).length).toBeLessThan(
            removes.length,
          );
        },
        { timeout: 4000 },
      );
    }

    await waitFor(() => {
      expect(continueButton().disabled).toBe(true);
    }, { timeout: 4000 });
    expect(continued).toBeNull();
  });

  it("presents a readable failure and leaves the screen actionable when the boundary refuses", async () => {
    failSubmit = true;
    mount();
    await settled();
    await waitFor(() => {
      expect(continueButton().disabled).toBe(false);
    }, { timeout: 4000 });

    fireEvent.click(continueButton());

    const alert = await screen.findByRole("alert", {}, { timeout: 4000 });
    // A sentence the player can act on: no stack trace, no database detail, no error tag.
    expect(alert.textContent).toBe("The game returned an unexpected response. Please try again.");
    expect(alert.textContent).not.toMatch(/at .*\.ts:|Error:|SQLITE/);
    expect(continued).toBeNull();
    // Actionable again: the primary is not left stuck in its pending state.
    await waitFor(() => {
      expect(continueButton().disabled).toBe(false);
    }, { timeout: 4000 });
  });

  it("leaves setup through Cancel", async () => {
    mount();
    await settled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(cancelled).toBe(1);
  });
});

describe("Manage leagues", () => {
  it("opens the retained tree on the setup's own intents and applies the edit back", async () => {
    mount();
    await settled();

    const activeBefore = screen.getAllByRole("button", { name: /^Remove / }).length;
    fireEvent.click(screen.getByRole("button", { name: "Manage leagues" }));

    // The tree, seeded from the setup — not an empty second configuration.
    const tree = await screen.findByRole("tree", { name: "Nations and leagues" }, { timeout: 4000 });
    expect(tree).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Manage leagues" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Apply changes" }));

    await waitFor(
      () => {
        expect(screen.getAllByRole("button", { name: /^Remove / }).length).toBe(activeBefore);
      },
      { timeout: 4000 },
    );
  });

  it("is reachable from the introduction's change action too", async () => {
    mount();
    await settled();

    fireEvent.click(screen.getByRole("button", { name: "Change scope" }));
    expect(
      await screen.findByRole("tree", { name: "Nations and leagues" }, { timeout: 4000 }),
    ).toBeTruthy();
  });

  it("discards the tree's edit when it is cancelled", async () => {
    mount();
    await settled();
    const activeBefore = screen.getAllByRole("button", { name: /^Remove / }).length;

    fireEvent.click(screen.getByRole("button", { name: "Manage leagues" }));
    await screen.findByRole("tree", { name: "Nations and leagues" }, { timeout: 4000 });
    fireEvent.click(screen.getByRole("button", { name: "Clear Selection" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(
      () => {
        expect(screen.getAllByRole("button", { name: /^Remove / }).length).toBe(activeBefore);
      },
      { timeout: 4000 },
    );
  });
});
