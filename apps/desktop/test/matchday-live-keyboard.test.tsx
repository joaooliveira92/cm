// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
} from "@tanstack/react-router";
import { SaveId, type SubstitutionStatusView } from "@cm-clone/contracts";
import {
  FORMATION_SLOTS,
  FORMATIONS,
  GOALKEEPING_ATTRIBUTES,
  HIDDEN_ATTRIBUTES,
  OUTFIELD_ATTRIBUTES,
  POSITION_ROLES,
  STATURE_TIERS,
} from "@cm-clone/shared";
import { MatchDayScreen } from "../src/renderer/MatchDayScreen.js";
import { KeyboardSpine } from "../src/renderer/KeyboardSpine.js";
import { bindRouter } from "../src/renderer/navigation/adapter.js";
import { setActiveMatch, clearActiveMatch } from "../src/renderer/match/session.js";
import { resetActionHandlers, dispatchAction } from "../src/renderer/actions/dispatch.js";
import { resetScopeState } from "../src/renderer/actions/scopeState.js";
import { teachingSplashStorageKey } from "../src/renderer/discoverability/TeachingSplash.js";
import { RegistryProvider } from "../src/renderer/rpc.js";

const rid = (id: string) => SaveId.make(id);

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const NOT_FOUND = { _tag: "SaveNotFoundError", id: rid("s1") };

const noSubs = (overrides: Partial<SubstitutionStatusView> = {}): SubstitutionStatusView => ({
  used: 0,
  remaining: 5,
  windowsUsed: 0,
  windowsRemaining: 3,
  capReached: false,
  ...overrides,
});

/** A full valid tactic so the live panel has on-pitch players to edit. */
const fullTactic = () => {
  const formation = FORMATIONS[0]; // 4-4-2
  return {
    formation,
    slots: (FORMATION_SLOTS[formation] ?? []).map((position, index) => ({
      position,
      role: POSITION_ROLES[position],
      playerId: rid(`on-${index}`),
    })),
    mentality: "balanced" as const,
    tempo: "normal" as const,
    pressing: "medium" as const,
  };
};

const tacticView = (tactic = fullTactic()) => {
  // AttributesSchema requires every outfield Attribute (1-20); goalkeeping and
  // hidden ride along optionally — a 12 is a plain valid value for all.
  const attributes = (): Record<string, number> => ({
    ...Object.fromEntries(OUTFIELD_ATTRIBUTES.map((a) => [a, 12])),
    ...Object.fromEntries(GOALKEEPING_ATTRIBUTES.map((a) => [a, 12])),
    ...Object.fromEntries(HIDDEN_ATTRIBUTES.map((a) => [a, 12])),
  });
  const player = (id: string, firstName: string) => ({
    id,
    firstName,
    lastName: "Player",
    dateOfBirth: "1990-01-01",
    age: 25,
    attributes: attributes(),
    positions: [],
    overallRating: 80,
    positionRatings: {},
    condition: 90,
    trainingFocus: null,
  });
  const onPitch = (tactic.slots ?? []).map((slot: { playerId: string }, index: number) =>
    player(String(slot.playerId), `On${index}`),
  );
  const bench = [
    player(String(rid("bench-1")), "Bench1"),
    player(String(rid("bench-2")), "Bench2"),
  ];
  return {
    club: { id: rid("me"), name: "My Club", statureTier: STATURE_TIERS[0] },
    squad: [...onPitch, ...bench],
    tactic,
  };
};

const orangeInjury = () => ({
  minute: 23,
  teamClubId: rid("home"),
  playerId: rid("on-5"),
  trigger: "contact" as const,
  severity: "medium" as const,
  tier: "orange" as const,
  type: "twistedAnkle" as const,
});

const resumeView = (overrides: Record<string, unknown> = {}) => ({
  matchId: rid("m1"),
  cursor: 0,
  isComplete: false,
  homeScore: 0,
  awayScore: 0,
  lines: [],
  homeSubs: noSubs(),
  awaySubs: noSubs(),
  injuredClubIds: [],
  injuries: [],
  homeOnPitchCount: 11,
  awayOnPitchCount: 11,
  conditions: {},
  ...overrides,
});

interface SessionOverrides {
  readonly homeSubs?: SubstitutionStatusView;
  readonly chunkInjuries?: ReadonlyArray<ReturnType<typeof orangeInjury>>;
}

const session = (overrides: SessionOverrides = {}) => ({
  saveId: rid("s1"),
  match: {
    matchId: rid("m1"),
    homeClubId: rid("home"),
    homeClubName: "Home FC",
    awayClubId: rid("away"),
    awayClubName: "Away FC",
  },
  cursor: 0,
  revealed: [],
  homeScore: 0,
  awayScore: 0,
  isComplete: false,
  homeSubs: overrides.homeSubs ?? noSubs(),
  awaySubs: noSubs(),
  homeOnPitchCount: 11,
  awayOnPitchCount: 11,
  chunkInjuries: overrides.chunkInjuries ?? [],
  currentMinute: 1,
  streamComplete: false,
});

interface Submissions {
  readonly calls: Array<{ method: string; payload: Record<string, unknown> }>;
}

const mountMatchDayWithSpine = async (
  sess: ReturnType<typeof session>,
  onCall?: (method: string, payload: unknown) => Promise<unknown> | undefined,
): Promise<Submissions> => {
  const submissions: Submissions = { calls: [] };
  window.localStorage.clear();
  window.localStorage.setItem(teachingSplashStorageKey, "1");
  setActiveMatch(sess as never);
  mockPreload(async (method, payload) => {
    if (method === "getTactics") return { _tag: "Success", value: tacticView() } as never;
    if (method === "resumeSimulation") return { _tag: "Success", value: resumeView() } as never;
    if (method === "submitMatchCommand") {
      submissions.calls.push({ method, payload: payload as Record<string, unknown> });
      return { _tag: "Success", value: resumeView() } as never;
    }
    const custom = onCall?.(method, payload);
    if (custom !== undefined) return custom as never;
    return { _tag: "Failure", error: NOT_FOUND } as never;
  });
  const rootRoute = createRootRoute({
    component: () => (
      <>
        <Outlet />
        <KeyboardSpine />
      </>
    ),
  });
  const matchRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/career/$saveId/match",
    component: () => (
      <RegistryProvider>
        <MatchDayScreen saveId={rid("s1")} />
      </RegistryProvider>
    ),
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([matchRoute]),
    history: createMemoryHistory({ initialEntries: ["/career/s1/match"] }),
  });
  bindRouter({ navigate: () => undefined, history: { back: () => undefined } } as never);
  render(<RouterProvider router={router} />);
  // The live panel is mounted once the resumed match renders with a loaded tactic.
  await screen.findByRole("button", { name: /Tactics & substitutions/ });
  return submissions;
};

/** Every joint keystroke passes the physical `code` react-hotkeys-hook's matcher
 *  reads (jsdom leaves `code` empty otherwise), separate from the logical `key`. */
const keyDown = (key: string, init: Record<string, unknown> = {}, code?: string): void => {
  act(() => fireEvent.keyDown(document, { key, code: code ?? key, ...init }));
};

const openPanel = (): void => {
  act(() => {
    fireEvent.click(screen.getByRole("button", { name: /Tactics & substitutions/ }));
  });
};

const panelContent = (): HTMLElement | null => screen.queryByText("Make a substitution");

beforeEach(() => {
  cleanup();
  resetActionHandlers();
  resetScopeState();
  window.scrollTo = () => undefined;
});

afterEach(() => {
  cleanup();
  clearActiveMatch(rid("s1"));
  resetActionHandlers();
  resetScopeState();
  window.localStorage.clear();
});

describe("AC-33 — panel Escape semantics (open/closed/paused)", () => {
  it("Escape closes the open panel and the match feed keeps running", async () => {
    await mountMatchDayWithSpine(session());
    openPanel();
    expect(panelContent()).toBeTruthy();
    // Focus a control that Escape's close will unmount — close must hand focus
    // back to the toggle, never leave it on document.body.
    const inSelect = document.querySelector<HTMLSelectElement>(
      '[data-action-id="set-live-substitute-in"]',
    )!;
    inSelect.focus();
    keyDown("Escape", {}, "Escape");

    await waitFor(() => expect(panelContent()).toBeNull());
    // Feed continues: the match badge is Live, not Paused.
    expect(screen.getByText("Live")).toBeTruthy();
    // Focus returned to the toggle (never document.body).
    expect(document.activeElement?.getAttribute("data-action-id")).toBe("toggle-control-panel");
  });

  it("Escape with the panel closed is a no-op (feed continues)", async () => {
    await mountMatchDayWithSpine(session());
    expect(panelContent()).toBeNull();
    keyDown("Escape", {}, "Escape");
    expect(panelContent()).toBeNull();
    expect(screen.getByText("Live")).toBeTruthy();
  });
});

describe("AC-33 — injury decision flow: Play On (Enter) / Bring Off (B), Escape keeps the pause", () => {
  const pausedSession = () =>
    session({
      homeSubs: noSubs({ used: 5, remaining: 0, capReached: true }),
      chunkInjuries: [orangeInjury()],
    });

  it("an orange no-subs injury pauses the feed and auto-opens the panel with the decision modal", async () => {
    await mountMatchDayWithSpine(pausedSession());
    await screen.findByText("Paused — awaiting decision");
    expect(screen.getByRole("button", { name: "Play on" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Bring off/ })).toBeTruthy();
  });

  it("Enter triggers Play On — the pause clears, the match resumes", async () => {
    const submissions = await mountMatchDayWithSpine(pausedSession());
    await screen.findByText("Paused — awaiting decision");
    keyDown("Enter", {}, "Enter");

    await waitFor(() => expect(screen.queryByText("Paused — awaiting decision")).toBeNull());
    expect(screen.getByText("Live")).toBeTruthy();
    // No command leaves the renderer for Play On — it is a local
    // acknowledgement: submitMatchCommand is never called. The B-path test
    // above proves the same helper DOES record a call when a command
    // legitimately goes out, so a zero-count here is a real negative.
    expect(submissions.calls.length).toBe(0);
  });

  it("B triggers Bring Off — a ForceOff command is submitted and the pause clears", async () => {
    const submissions = await mountMatchDayWithSpine(pausedSession());
    await screen.findByText("Paused — awaiting decision");
    keyDown("b", {}, "KeyB");

    await waitFor(() => expect(submissions.calls.length).toBeGreaterThan(0));
    const call = submissions.calls[0]!;
    expect(call.method).toBe("submitMatchCommand");
    expect((call.payload.command as { _tag: string })._tag).toBe("ForceOff");
    expect((call.payload.command as { playerId: string }).playerId).toBe(String(rid("on-5")));
    await waitFor(() => expect(screen.getByText("Live")).toBeTruthy());
  });

  it("Escape closes the panel and the injury modal but the match STAYS paused (deliberation)", async () => {
    await mountMatchDayWithSpine(pausedSession());
    await screen.findByText("Paused — awaiting decision");
    keyDown("Escape", {}, "Escape");

    await waitFor(() => expect(panelContent()).toBeNull());
    expect(screen.queryByRole("button", { name: "Play on" })).toBeNull();
    // Not resumed: the paused badge persists (chunkInjuries untouched).
    expect(screen.getByText("Paused — awaiting decision")).toBeTruthy();
  });

  it("B with the panel closed does nothing (panel-scoped bindings are open-only)", async () => {
    const submissions = await mountMatchDayWithSpine(pausedSession());
    await screen.findByText("Paused — awaiting decision");
    keyDown("Escape", {}, "Escape"); // close panel, match stays paused
    await waitFor(() => expect(panelContent()).toBeNull());
    keyDown("b", {}, "KeyB"); // panel is closed → no bring-off
    expect(submissions.calls.length).toBe(0);
    expect(screen.getByText("Paused — awaiting decision")).toBeTruthy();
  });
});

describe("AC-33 — two-step substitution by keyboard (Enter confirms, Escape aborts + closes)", () => {
  it("Enter confirms a complete out/in draft as a MakeSubstitution command", async () => {
    const submissions = await mountMatchDayWithSpine(session());
    openPanel();

    const outSelect = document.querySelector<HTMLSelectElement>(
      '[data-action-id="set-live-substitute-off"]',
    )!;
    const inSelect = document.querySelector<HTMLSelectElement>(
      '[data-action-id="set-live-substitute-in"]',
    )!;
    act(() => {
      fireEvent.change(outSelect, { target: { value: String(rid("on-0")) } });
      fireEvent.change(inSelect, { target: { value: String(rid("bench-1")) } });
    });
    // The draft is complete → Enter (not over a native clickable) confirms.
    keyDown("Enter", {}, "Enter");

    await waitFor(() => expect(submissions.calls.length).toBe(1));
    const call = submissions.calls[0]!;
    expect((call.payload.command as { _tag: string })._tag).toBe("MakeSubstitution");
    expect(call.payload.command).toMatchObject({
      _tag: "MakeSubstitution",
      outPlayerId: String(rid("on-0")),
      inPlayerId: String(rid("bench-1")),
    });
    // The optimistic local swap cleared the draft selectors for the next sub.
    const outAfter = () =>
      (document.querySelector('[data-action-id="set-live-substitute-off"]') as HTMLSelectElement)
        .value;
    await waitFor(() => expect(outAfter()).toBe(""));
  }, 10_000);

  it("Enter over a native clickable control leaves the clickable in charge (AC-19), not the confirm", async () => {
    const submissions = await mountMatchDayWithSpine(session());
    openPanel();
    const outSelect = document.querySelector<HTMLSelectElement>(
      '[data-action-id="set-live-substitute-off"]',
    )!;
    const inSelect = document.querySelector<HTMLSelectElement>(
      '[data-action-id="set-live-substitute-in"]',
    )!;
    act(() => {
      fireEvent.change(outSelect, { target: { value: String(rid("on-0")) } });
      fireEvent.change(inSelect, { target: { value: String(rid("bench-1")) } });
    });
    const apply = screen.getByRole("button", { name: "Apply tactics change" });
    apply.focus();
    // A focused native control owns Enter: the seam confirm must not fire.
    act(() => fireEvent.keyDown(apply, { key: "Enter", bubbles: true }));
    expect(submissions.calls.length).toBe(0);
  });

  it("a same-player draft is rejected with a visible reason, never silently submitted", async () => {
    const submissions = await mountMatchDayWithSpine(session());
    openPanel();
    // Each dispatch re-renders first, so the submit handler reads both picks.
    await act(async () => {
      dispatchAction("set-live-substitute-off", { playerId: rid("on-0") });
    });
    await act(async () => {
      dispatchAction("set-live-substitute-in", { playerId: rid("on-0") });
    });
    await act(async () => {
      dispatchAction("make-substitution");
    });
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "The player coming on must be a different player",
      ),
    );
    expect(submissions.calls.length).toBe(0);
  });

  it("Escape aborts the in-progress two-step selection and closes the panel", async () => {
    await mountMatchDayWithSpine(session());
    openPanel();
    const outSelect = document.querySelector<HTMLSelectElement>(
      '[data-action-id="set-live-substitute-off"]',
    )!;
    act(() => {
      fireEvent.change(outSelect, { target: { value: String(rid("on-0")) } });
    });
    keyDown("Escape", {}, "Escape");
    await waitFor(() => expect(panelContent()).toBeNull());
    // Reopen: the draft was aborted, so no out player stays selected.
    openPanel();
    await waitFor(() =>
      expect(
        (document.querySelector('[data-action-id="set-live-substitute-off"]') as HTMLSelectElement).value,
      ).toBe(""),
    );
  });

  it("the substitution controls are disabled when the server reports the cap reached", async () => {
    await mountMatchDayWithSpine(
      session({ homeSubs: noSubs({ used: 5, remaining: 0, capReached: true }) }),
    );
    openPanel();
    const outSelect = document.querySelector<HTMLSelectElement>(
      '[data-action-id="set-live-substitute-off"]',
    )!;
    const inSelect = document.querySelector<HTMLSelectElement>(
      '[data-action-id="set-live-substitute-in"]',
    )!;
    expect(outSelect.disabled).toBe(true);
    expect(inSelect.disabled).toBe(true);
  });
});

describe("AC-33 — live tactics arrow toggles and Tab cycling", () => {
  it("ArrowRight/ArrowLeft toggle the focused instruction and move the roving tab stop", async () => {
    await mountMatchDayWithSpine(session());
    openPanel();
    const mentality = screen.getByRole("group", { name: "Mentality" });
    const attacking = within(mentality).getByRole("button", { name: "attacking" });
    const balanced = within(mentality).getByRole("button", { name: "balanced" });
    expect(balanced.getAttribute("aria-pressed")).toBe("true");

    balanced.focus();
    act(() => fireEvent.keyDown(mentality, { key: "ArrowRight", bubbles: true }));
    await waitFor(() => expect(attacking.getAttribute("aria-pressed")).toBe("true"));
    expect(balanced.getAttribute("aria-pressed")).toBe("false");
    expect(document.activeElement).toBe(attacking);

    act(() => fireEvent.keyDown(mentality, { key: "ArrowLeft", bubbles: true }));
    await waitFor(() => expect(balanced.getAttribute("aria-pressed")).toBe("true"));
    expect(document.activeElement).toBe(balanced);
  });

  it("each instruction keeps exactly one tab stop, in group order (Tab cycles Mentality → Tempo → Pressing)", async () => {
    await mountMatchDayWithSpine(session());
    openPanel();
    for (const name of ["Mentality", "Tempo", "Pressing"]) {
      const group = screen.getByRole("group", { name });
      const stops = within(group)
        .getAllByRole("button")
        .filter((b) => b.getAttribute("tabindex") === "0");
      expect(stops.length, `${name} must expose one tab stop`).toBe(1);
    }
    // The three groups appear in tab order: Mentality before Tempo before Pressing.
    const docOrder = [...document.querySelectorAll('[role="group"][aria-label]')];
    expect(docOrder.map((g) => g.getAttribute("aria-label"))).toEqual([
      "Mentality",
      "Tempo",
      "Pressing",
    ]);
  });
});

describe("AC-33 — the panel layer composes with splash/palette/help Escape stacking", () => {
  it("Primary+K still opens the palette while the panel is open; Escape closes the palette only", async () => {
    await mountMatchDayWithSpine(session());
    openPanel();
    expect(panelContent()).toBeTruthy();

    keyDown("k", { ctrlKey: true }, "KeyK");
    expect(screen.getByRole("dialog", { name: "Command palette" })).toBeTruthy();

    // Escape closes the topmost layer (the palette) — the panel stays open.
    keyDown("Escape", {}, "Escape");
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Command palette" })).toBeNull(),
    );
    expect(panelContent()).toBeTruthy();

    // A second Escape now owns the panel.
    keyDown("Escape", {}, "Escape");
    await waitFor(() => expect(panelContent()).toBeNull());
  });

  it("the g prefix is suppressed while the panel is open, and live again after it closes", async () => {
    await mountMatchDayWithSpine(session());
    openPanel();
    keyDown("g", {}, "KeyG");
    expect(screen.queryByText("Go to:")).toBeNull();

    keyDown("Escape", {}, "Escape");
    await waitFor(() => expect(panelContent()).toBeNull());
    keyDown("g", {}, "KeyG");
    expect(screen.getByText("Go to:")).toBeTruthy();
  });
});