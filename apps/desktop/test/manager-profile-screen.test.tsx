// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SaveId } from "@cm-clone/contracts";
import { ManagerProfileScreen } from "../src/renderer/ManagerProfileScreen.js";
import { clearActiveMatch, setActiveMatch } from "../src/renderer/match/session.js";
import { bindRouter } from "../src/renderer/navigation/adapter.js";
import { RegistryProvider } from "../src/renderer/rpc.js";

const saveId = SaveId.make("s1");

const profileView = (overrides: Record<string, unknown> = {}) => ({
  profile: {
    managerName: "Ada Lovelace",
    archetypeOrigin: "academy_head",
    pillars: { tacticalAcumen: 2, influence: 4, regimen: 1, technicalCoaching: 5 },
  },
  clubName: "Test FC",
  seasonNumber: 3,
  tenureSeasons: 3,
  archived: false,
  ...overrides,
});

const mockPreload = (value: unknown) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string) =>
      method === "getManagerProfileScreen"
        ? { _tag: "Success", value }
        : { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: saveId } },
  };
};

/** Preload double that answers the screen query and records every `retireManager` invocation, so a
 * test can tell "the dialog was dismissed" from "the career was ended". */
const mockPreloadWithRetire = (
  retired: Array<unknown>,
  retireOutcome: unknown = { _tag: "Success", value: undefined },
  view: unknown = profileView(),
) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string, payload: unknown) => {
      if (method === "getManagerProfileScreen") return { _tag: "Success", value: view };
      if (method === "retireManager") {
        retired.push(payload);
        return retireOutcome;
      }
      return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: saveId } };
    },
  };
};

const mount = () =>
  render(
    <RegistryProvider>
      <ManagerProfileScreen saveId={saveId} />
    </RegistryProvider>,
  );

/** Records where the screen sent the player, so "returns to the Save List" is asserted against the
 * router the app actually drives rather than against the component's own state. */
let navigations: Array<unknown>;

beforeEach(() => {
  cleanup();
  navigations = [];
  bindRouter({ navigate: (options: unknown) => navigations.push(options) } as never);
  clearActiveMatch(saveId);
});

afterEach(() => {
  cleanup();
  clearActiveMatch(saveId);
});

describe("Manager Profile (Screen 19)", () => {
  it("renders manager name, archetype, the four Pillars, club, season, and tenure", async () => {
    mockPreload(profileView());
    mount();

    expect(await screen.findByText("Ada Lovelace")).toBeTruthy();
    expect(screen.getByText("Academy Head")).toBeTruthy();
    expect(screen.getByText("Test FC")).toBeTruthy();
    expect(screen.getByText("Season 3")).toBeTruthy();
    expect(screen.getByText("Tenure: 3 seasons")).toBeTruthy();

    for (const pillar of ["Tactical Acumen", "Influence", "Regimen", "Technical Coaching"]) {
      expect(screen.getByText(pillar)).toBeTruthy();
    }
    // The values themselves, in the pillar order the domain fixes.
    const values = screen.getAllByRole("definition").map((node) => node.textContent);
    expect(values).toEqual(["2", "4", "1", "5"]);
  });

  it("names a Custom Manager rather than showing the raw archetype key", async () => {
    mockPreload(profileView({ profile: { ...profileView().profile, archetypeOrigin: "custom" } }));
    mount();
    expect(await screen.findByText("Custom Manager")).toBeTruthy();
  });

  it("singularises a one-season tenure", async () => {
    mockPreload(profileView({ seasonNumber: 1, tenureSeasons: 1 }));
    mount();
    expect(await screen.findByText("Tenure: 1 season")).toBeTruthy();
  });

  it("badges a live save Active with no archived banner", async () => {
    mockPreload(profileView());
    mount();
    expect(await screen.findByText("Active")).toBeTruthy();
    expect(screen.queryByText(/\[Archived\]/)).toBeNull();
  });

  it("badges an archived save Archived and banners it, keeping the same profile layout", async () => {
    mockPreload(profileView({ archived: true }));
    mount();
    expect(await screen.findByText("Archived")).toBeTruthy();
    expect(screen.getByText(/\[Archived\]/)).toBeTruthy();
    expect(screen.queryByText("Active")).toBeNull();
    // Identity is still fully rendered — archived is read-only, not a different screen.
    expect(screen.getByText("Ada Lovelace")).toBeTruthy();
    expect(screen.getByText("Test FC")).toBeTruthy();
    expect(screen.getByText("Tactical Acumen")).toBeTruthy();
  });

  it("never restates Season Summary's judgments", async () => {
    mockPreload(profileView({ archived: true }));
    mount();
    await screen.findByText("Ada Lovelace");
    for (const owned of [/Board Objective/i, /Verdict/i, /Consecutive/i, /warn/i, /sacked/i]) {
      expect(screen.queryByText(owned)).toBeNull();
    }
  });

  it("renders the typed SaveNotFoundError from the seam union", async () => {
    (window as unknown as { cmClone: { call: unknown } }).cmClone = {
      call: async () => ({ _tag: "Failure", error: { _tag: "SaveNotFoundError", id: saveId } }),
    };
    mount();
    expect(await screen.findByText("That save could not be found.")).toBeTruthy();
  });
});

describe("Retire Manager (Screen 20)", () => {
  const openDialog = async () => {
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Retire Manager" }));
    return screen.getByRole("dialog", { name: "Retire Manager" });
  };

  it("offers the action on a live save and withholds it once the save is archived", async () => {
    mockPreload(profileView());
    mount();
    expect(await screen.findByRole("button", { name: "Retire Manager" })).toBeTruthy();

    cleanup();
    mockPreload(profileView({ archived: true }));
    mount();
    await screen.findByText("Archived");
    expect(screen.queryByRole("button", { name: "Retire Manager" })).toBeNull();
  });

  it("confirms through an Irreversibility Disclosure and a destructive confirm, with Cancel focused", async () => {
    mockPreloadWithRetire([]);
    const dialog = await openDialog();

    // The disclosure states what the action freezes and that navigation cannot reverse it.
    expect(dialog.textContent).toMatch(/read-only/i);
    expect(dialog.textContent).toMatch(/undo/i);

    // Cancel holds default focus: the keyboard's cheapest action must not end a career.
    const cancel = within(dialog).getByRole("button", { name: "Cancel" });
    await waitFor(() => expect(document.activeElement).toBe(cancel));

    // The confirm is labelled with the verb, not a generic OK.
    expect(within(dialog).getByRole("button", { name: "Retire Manager" })).toBeTruthy();
  });

  it("cancelling closes the dialog and never sends the command", async () => {
    const retired: Array<unknown> = [];
    mockPreloadWithRetire(retired);
    const dialog = await openDialog();

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(retired).toEqual([]);
    expect(navigations).toEqual([]);
  });

  it("Escape cancels too, and sends nothing", async () => {
    const retired: Array<unknown> = [];
    mockPreloadWithRetire(retired);
    const dialog = await openDialog();

    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(retired).toEqual([]);
  });

  it("confirming retires this save and returns to the Save List", async () => {
    const retired: Array<unknown> = [];
    mockPreloadWithRetire(retired);
    const dialog = await openDialog();

    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Retire Manager" }));
    });

    expect(retired).toEqual([{ saveId }]);
    // No success screen — the only thing that happens afterwards is the return to the Save List.
    await waitFor(() => expect(navigations).toEqual([{ to: "/" }]));
  });

  it("surfaces a refused retirement in the dialog and stays put", async () => {
    const retired: Array<unknown> = [];
    mockPreloadWithRetire(retired, {
      _tag: "Failure",
      error: { _tag: "SaveArchivedError", saveId, cause: "sacked" },
    });
    const dialog = await openDialog();

    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Retire Manager" }));
    });

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe("You have been sacked — this save is archived.");
    expect(navigations).toEqual([]);
  });

  it("refuses to open mid-match, and says why rather than doing nothing", async () => {
    mockPreloadWithRetire([]);
    setActiveMatch({ saveId, isComplete: false } as never);
    mount();

    const action = await screen.findByRole("button", { name: "Retire Manager" });
    expect(action.hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("Finish the match in progress before retiring.")).toBeTruthy();

    fireEvent.click(action);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
