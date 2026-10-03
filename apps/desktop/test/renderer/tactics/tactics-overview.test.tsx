import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NationId, PlayerId, SaveId } from "@cm-clone/contracts";
import type {
  ManagerProfileScreenView,
  TacticsOverviewView,
} from "@cm-clone/contracts";
import { BUILT_IN_TEMPLATES, type Slot } from "@cm-clone/shared";
import { TacticsOverviewScreen } from "../../../src/renderer/tactics/TacticsOverviewScreen.js";
import { OverviewPitch } from "../../../src/renderer/tactics/OverviewPitch.js";
import {
  RegistryProvider,
  tacticsOverviewAtom,
  useAtomRefresh,
} from "../../../src/renderer/rpc.js";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";

const rid = (id: string) => SaveId.make(id);
const pid = (id: string) => PlayerId.make(id);

const FOUR_FOUR_TWO_CELLS = BUILT_IN_TEMPLATES.find((t) => t.name === "4-4-2")!.slots.map((s) => s.cell);
const FOUR_THREE_THREE_CELLS = BUILT_IN_TEMPLATES.find((t) => t.name === "4-3-3")!.slots.map((s) => s.cell);
const FIVE_THREE_TWO_CELLS = BUILT_IN_TEMPLATES.find((t) => t.name === "5-3-2")!.slots.map((s) => s.cell);
const SLOT_WITH_DEFAULT_SUB = (cell: Slot) => ({ cell, run: null, subRow: 0.5, subCol: 0.5 });

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const NOT_FOUND = { _tag: "SaveNotFoundError", id: rid("s1") };

const clubView = { id: rid("me"), name: "My Club", statureTier: "big" };

const profileView = (archived = false): ManagerProfileScreenView => ({
  profile: {
    firstName: "Test",
    lastName: "Manager",
    nationalityId: NationId.make("ENG"),
    nationalityName: "England",
    dateOfBirth: "1980-01-01",
    favoriteClubId: rid("me") as never,
    favoriteClubName: "My Club",
    preferredFormation: "4-4-2",
    avatarPortraitKey: null,
    avatarPrimaryColor: "#000000",
    avatarSecondaryColor: "#f8fafc",
    archetypeOrigin: "custom",
    pillars: { tacticalAcumen: 3, influence: 3, regimen: 3, technicalCoaching: 3 },
  },
  clubName: "My Club",
  badgeKey: null,
  clubColours: {
    primary: { foreground: "#ffffff", background: "#123456" },
    secondary: { foreground: "#ffffff", background: "#654321" },
    tertiary: null,
    quaternary: null,
  },
  seasonNumber: 1,
  tenureSeasons: 1,
  archived,
});

const seasonView = (awaitingFixture = false) => ({
  seasonNumber: 1,
  currentDate: "2024-08-01",
  phase: "pre_season",
  awaitingFixture: awaitingFixture
    ? {
      fixtureId: 1,
      date: "2024-08-10",
      competitionId: "league_e1",
      opponentClubId: rid("other"),
      opponentClubName: "Other FC",
      isHome: true,
      matchId: null,
      blockers: [],
      advisories: [],
    }
    : null,
});

const leagueView = (awaitingFixture = false) => ({
  season: seasonView(awaitingFixture),
  standings: [],
});

const starterNames = [
  ["Ada", "One"],
  ["Bea", "Two"],
  ["Cal", "Three"],
  ["Dee", "Four"],
  ["Eli", "Five"],
  ["Fay", "Six"],
  ["Gil", "Seven"],
  ["Hue", "Eight"],
  ["Ivy", "Nine"],
  ["Jed", "Ten"],
  ["Kit", "Eleven"],
] as const;

const assignments = FOUR_FOUR_TWO_CELLS.map((cell, index) => ({
  playerId: pid(`p-${index}`),
  firstName: starterNames[index]![0],
  lastName: starterNames[index]![1],
  cell,
  positionRating: 60 + index,
  familiarity: "natural",
}));

const defaultInstructions = {
  passing: "mixed",
  focusPassing: "mixed",
  tackling: "normal",
  closingDown: "default",
  mentality: "normal",
  offsideTrap: false,
  zonalMarking: true,
  counterAttack: false,
  menBehindTheBall: false,
};

const overviewView = (
  revision: number,
  overrides: Partial<TacticsOverviewView> = {},
): TacticsOverviewView =>
  ({
    club: clubView,
    revision,
    formation: {
      template: "4-4-2",
      modified: false,
      shape: "4-4-2",
      slots: FOUR_FOUR_TWO_CELLS.map((cell) => SLOT_WITH_DEFAULT_SUB(cell)),
    },
    instructions: defaultInstructions,
    assignments,
    familiarity: { natural: 8, competent: 2, unfamiliar: 1 },
    selection: {
      starters: starterNames.map(([firstName, lastName], index) => ({
        id: pid(`p-${index}`),
        firstName,
        lastName,
      })),
      substitutes: [
        { id: pid("sub-1"), firstName: "Lee", lastName: "Dozen" },
        { id: pid("sub-2"), firstName: "Moe", lastName: "Thirteen" },
      ],
    },
    setPieces: { status: "none" },
    issues: [
      {
        id: "no-tactic",
        severity: "blocking",
        title: "No Tactic set",
        detail: "Set one before this Fixture can be played.",
        destination: "tactics",
      },
    ],
    ...overrides,
  }) as TacticsOverviewView;

/** A sibling harness that can drive revalidation of the overview atom from a test — the same
 *  `useAtomRefresh` path the editor's Refresh uses. */
const RevalidationHarness = ({ label }: { readonly label: string }) => {
  const refresh = useAtomRefresh(tacticsOverviewAtom(rid("s1")));
  return (
    <button type="button" onClick={() => refresh()}>
      {label}
    </button>
  );
};

const mount = (methods: (method: string, payload: unknown) => Promise<unknown>) => {
  mockPreload(methods);
  return render(
    <RegistryProvider>
      <TacticsOverviewScreen saveId={rid("s1")} />
      <RevalidationHarness label="Trigger revalidation" />
    </RegistryProvider>,
  );
};

beforeEach(() => {
  bindRouter({
    navigate: vi.fn(),
    history: { back: vi.fn(), forward: vi.fn(), canGoBack: () => false },
  } as never);
});

afterEach(() => cleanup());

describe("Tactics Overview view states", () => {
  it("loading is observable while the snapshot read is in flight", () => {
    mount(() =>
      new Promise<never>(() => {
        /* never resolves — the atom stays Initial */
      }),
    );
    expect(document.querySelector('[data-overview-state="loading"]')).not.toBeNull();
    expect(screen.getByText(/loading your tactical preparation/i)).toBeDefined();
  });

  it("ready renders formation, instructions, familiarity, selection, set pieces, and issues", async () => {
    mount(async (method) => {
      if (method === "getTacticsOverview")
        return { _tag: "Success", value: overviewView(1) } as never;
      if (method === "getManagerProfileScreen")
        return { _tag: "Success", value: profileView() } as never;
      if (method === "getLeagueTable") return { _tag: "Success", value: leagueView(true) } as never;
      return { _tag: "Failure", error: NOT_FOUND } as never;
    });

    const main = await screen.findByRole("main");
    await waitFor(() =>
      expect(main.getAttribute("data-overview-state")).toBe("ready"),
    );

    expect(screen.getByRole("heading", { name: "Tactics Overview" })).toBeDefined();
    expect(screen.getByText("4-4-2")).toBeDefined();
    expect(screen.getAllByRole("listitem")).toHaveLength(
      11 + 2 + 1, // pitch slots + substitutes + issues
    );
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(1 + 11);
    expect(rows[1]!.textContent).toContain("Ada One");
    expect(rows[1]!.textContent).toContain("60");
    const familiarityHeading = screen.getByText("Familiarity");
    const familiarityCard = familiarityHeading.closest("section, div")!;
    expect(familiarityCard.textContent).toMatch(/Natural.*8/);
    expect(familiarityCard.textContent).toMatch(/Competent.*2/);
    expect(familiarityCard.textContent).toMatch(/Unfamiliar.*1/);
    expect(screen.getByText("No set pieces configured.")).toBeDefined();
    expect(screen.getByText("No Tactic set.")).toBeDefined();
    const fix = screen.getByRole("button", { name: "Open the editor" });
    expect(fix.getAttribute("aria-describedby")).toBe("overview-issue-no-tactic");

    const status = await screen.findByRole("status");
    expect(status.textContent).toContain("11 starters, 2 substitutes");
  });

  it("failed shows the typed error when the snapshot cannot be read at all", async () => {
    mount(async (method) => {
      if (method === "getTacticsOverview")
        return { _tag: "Failure", error: NOT_FOUND } as never;
      if (method === "getManagerProfileScreen")
        return { _tag: "Success", value: profileView() } as never;
      if (method === "getLeagueTable") return { _tag: "Success", value: leagueView(false) } as never;
      return { _tag: "Failure", error: NOT_FOUND } as never;
    });

    const main = await screen.findByRole("main");
    await waitFor(() =>
      expect(main.getAttribute("data-overview-state")).toBe("failed"),
    );
    expect(screen.getByText(/could not be found/i)).toBeDefined();
    expect(screen.getByRole("button", { name: "Retry" })).toBeDefined();
  });

  it("permission-limited maps the archived save's guard onto the overview", async () => {
    mount(async (method) => {
      if (method === "getTacticsOverview")
        return { _tag: "Success", value: overviewView(1) } as never;
      if (method === "getManagerProfileScreen")
        return { _tag: "Success", value: profileView(true) } as never;
      if (method === "getLeagueTable") return { _tag: "Success", value: leagueView(false) } as never;
      return { _tag: "Failure", error: NOT_FOUND } as never;
    });

    const main = await screen.findByRole("main");
    await waitFor(() =>
      expect(main.getAttribute("data-overview-state")).toBe("permission-limited"),
    );
    expect(screen.getByTestId("tactics-overview-readonly")).toBeDefined();
    expect(screen.getByText("4-4-2")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Open the tactics editor" })).toBeNull();
    expect(screen.getByText(/read-only, so the editor and match preparation/i)).toBeDefined();
  });
});

describe("Tactics Overview conflicted and stale-discard rules", () => {
  it("a newer-revision response is a distinct conflicted state that clears on adopting it", async () => {
    const loads = { count: 0 };
    mount(async (method) => {
      if (method === "getTacticsOverview") {
        loads.count += 1;
        const revision = loads.count === 1 ? 1 : 3;
        return {
          _tag: "Success",
          value: overviewView(revision, {
            formation: {
              template: revision === 3 ? "4-3-3" : "4-4-2",
              modified: revision === 3,
              shape: revision === 3 ? "4-3-3" : "4-4-2",
              slots: (revision === 3 ? FOUR_THREE_THREE_CELLS : FOUR_FOUR_TWO_CELLS).map((cell) => SLOT_WITH_DEFAULT_SUB(cell)),
            },
          }),
        } as never;
      }
      if (method === "getManagerProfileScreen")
        return { _tag: "Success", value: profileView() } as never;
      if (method === "getLeagueTable") return { _tag: "Success", value: leagueView(false) } as never;
      return { _tag: "Failure", error: NOT_FOUND } as never;
    });

    const main = await screen.findByRole("main");
    await waitFor(() => expect(main.getAttribute("data-overview-state")).toBe("ready"));
    expect(screen.getByText("4-4-2")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Trigger revalidation" }));

    const alert = await screen.findByTestId("tactics-overview-conflicted");
    expect(alert).toBeDefined();
    expect(main.getAttribute("data-overview-state")).toBe("conflicted");
    expect(screen.getByText("4-4-2")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Show the current tactic" }));
    await waitFor(() =>
      expect(main.getAttribute("data-overview-state")).toBe("ready"),
    );
    expect(screen.queryByTestId("tactics-overview-conflicted")).toBeNull();
    await waitFor(() => expect(screen.queryAllByText(/4-3-3/).length).toBeGreaterThan(0));
  });

  it("a response from an older revision is discarded whole, never rendered over the newer one", async () => {
    const loads = { count: 0 };
    mount(async (method) => {
      if (method === "getTacticsOverview") {
        loads.count += 1;
        const revision = loads.count === 1 ? 1 : loads.count === 2 ? 2 : 1;
        return {
          _tag: "Success",
          value: overviewView(revision, {
            formation: {
              template: revision === 2 ? "5-3-2" : "4-4-2",
              modified: revision === 2,
              shape: revision === 2 ? "5-3-2" : "4-4-2",
              slots: (revision === 2 ? FIVE_THREE_TWO_CELLS : FOUR_FOUR_TWO_CELLS).map((cell) => SLOT_WITH_DEFAULT_SUB(cell)),
            },
          }),
        } as never;
      }
      if (method === "getManagerProfileScreen")
        return { _tag: "Success", value: profileView() } as never;
      if (method === "getLeagueTable") return { _tag: "Success", value: leagueView(false) } as never;
      return { _tag: "Failure", error: NOT_FOUND } as never;
    });

    const main = await screen.findByRole("main");
    await waitFor(() => expect(main.getAttribute("data-overview-state")).toBe("ready"));
    expect(screen.getByText("4-4-2")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Trigger revalidation" }));
    await screen.findByTestId("tactics-overview-conflicted");
    fireEvent.click(screen.getByRole("button", { name: "Show the current tactic" }));
    await waitFor(() => expect(screen.queryAllByText(/5-3-2/).length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole("button", { name: "Trigger revalidation" }));
    await waitFor(() => expect(loads.count).toBe(3));
    expect(screen.queryByTestId("tactics-overview-conflicted")).toBeNull();
    await waitFor(() =>
      expect(main.getAttribute("data-overview-state")).toBe("ready"),
    );
    expect(screen.queryAllByText(/5-3-2/).length).toBeGreaterThan(0);
  });
});

describe("Tactics Overview workflows and navigation", () => {
  it("opens the tactics editor in one step and returns to the overview by destination", async () => {
    const nav = vi.fn();
    bindRouter({
      navigate: nav,
      history: { back: vi.fn(), forward: vi.fn(), canGoBack: () => false },
    } as never);
    mount(async (method) => {
      if (method === "getTacticsOverview")
        return { _tag: "Success", value: overviewView(1) } as never;
      if (method === "getManagerProfileScreen")
        return { _tag: "Success", value: profileView() } as never;
      if (method === "getLeagueTable") return { _tag: "Success", value: leagueView(false) } as never;
      return { _tag: "Failure", error: NOT_FOUND } as never;
    });

    await screen.findByRole("button", { name: "Open the tactics editor" });
    fireEvent.click(screen.getByRole("button", { name: "Open the tactics editor" }));
    await waitFor(() =>
      expect(nav).toHaveBeenCalledWith({
        to: "/career/$saveId/tactics/editor",
        params: { saveId: rid("s1") },
      }),
    );
  });

  it("offers match preparation only while a fixture is pending", async () => {
    mount(async (method) => {
      if (method === "getTacticsOverview")
        return { _tag: "Success", value: overviewView(1) } as never;
      if (method === "getManagerProfileScreen")
        return { _tag: "Success", value: profileView() } as never;
      if (method === "getLeagueTable") return { _tag: "Success", value: leagueView(true) } as never;
      return { _tag: "Failure", error: NOT_FOUND } as never;
    });

    const prep = await screen.findByRole("button", { name: "Match preparation" });
    expect(prep).toBeDefined();
  });

  it("hides match preparation when no fixture is pending", async () => {
    mount(async (method) => {
      if (method === "getTacticsOverview")
        return { _tag: "Success", value: overviewView(1) } as never;
      if (method === "getManagerProfileScreen")
        return { _tag: "Success", value: profileView() } as never;
      if (method === "getLeagueTable") return { _tag: "Success", value: leagueView(false) } as never;
      return { _tag: "Failure", error: NOT_FOUND } as never;
    });

    await screen.findByRole("heading", { name: "Tactics Overview" });
    expect(screen.queryByRole("button", { name: "Match preparation" })).toBeNull();
  });

  it("an issue carries its owning screen as the fix destination", async () => {
    const nav = vi.fn();
    bindRouter({
      navigate: nav,
      history: { back: vi.fn(), forward: vi.fn(), canGoBack: () => false },
    } as never);
    mount(async (method) => {
      if (method === "getTacticsOverview")
        return {
          _tag: "Success",
          value: overviewView(1, {
            issues: [
              {
                id: "bids-awaiting-response",
                severity: "advisory",
                title: "Bids awaiting your response",
                detail: "Advancing lets them lapse.",
                destination: "transfers",
              },
            ],
          }),
        } as never;
      if (method === "getManagerProfileScreen")
        return { _tag: "Success", value: profileView() } as never;
      if (method === "getLeagueTable") return { _tag: "Success", value: leagueView(false) } as never;
      return { _tag: "Failure", error: NOT_FOUND } as never;
    });

    await screen.findByRole("button", { name: "Transfers" });
    fireEvent.click(screen.getByRole("button", { name: "Transfers" }));
    await waitFor(() =>
      expect(nav).toHaveBeenCalledWith({
        to: "/career/$saveId/transfers",
        params: { saveId: rid("s1") },
      }),
    );
  });
});

describe("Tactics Overview accessibility", () => {
  it("renders every interaction as a native keyboard-reachable control with the focus ring", async () => {
    mount(async (method) => {
      if (method === "getTacticsOverview")
        return { _tag: "Success", value: overviewView(1) } as never;
      if (method === "getManagerProfileScreen")
        return { _tag: "Success", value: profileView() } as never;
      if (method === "getLeagueTable") return { _tag: "Success", value: leagueView(true) } as never;
      return { _tag: "Failure", error: NOT_FOUND } as never;
    });

    await screen.findByRole("button", { name: "Open the tactics editor" });
    const controls = [
      ...document.querySelectorAll<HTMLElement>("main button"),
    ].map((control) => ({ tag: control.tagName, cls: control.className }));

    expect(controls.length).toBeGreaterThan(0);
    for (const { tag, cls } of controls) {
      expect(tag).toBe("BUTTON");
      expect(cls).toContain("focus-visible:ring-2");
    }

    expect(document.querySelector('ul[aria-label="Formation slots"]')).not.toBeNull();
    expect(screen.getByText("Requires action")).toBeDefined();
  });
});
describe("the overview pitch draws each marker where the editor placed it", () => {
  const markerLeft = (index: number): number =>
    Number.parseFloat(
      screen.getByRole("list", { name: "Formation slots" }).querySelectorAll("li")[index]!.style.left,
    );

  it("offsets a slot within its cell by its sub-position, and centres the rest", () => {
    const slots = FOUR_FOUR_TWO_CELLS.map((cell, index) =>
      index === 2 ? { ...SLOT_WITH_DEFAULT_SUB(cell), subCol: 0 } : SLOT_WITH_DEFAULT_SUB(cell),
    );
    render(<OverviewPitch assignments={assignments as never} slots={slots as never} />);
    // Slot 2 is D L, centred at 11%; its cell's left edge is the touchline at 3%.
    expect(markerLeft(2)).toBe(3);
    expect(markerLeft(1)).toBe(89);
  });

  it("draws every marker at its cell's centre when no slots are given", () => {
    render(<OverviewPitch assignments={assignments as never} />);
    expect(markerLeft(2)).toBe(11);
  });
});
