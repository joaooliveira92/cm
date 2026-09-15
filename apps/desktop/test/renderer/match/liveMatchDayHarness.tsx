/** Shared Match day harness for the live control panel specs: a resumed match mounted with the
 *  keyboard spine, a mocked preload that records every `submitMatchCommand`, and key helpers. */
import { act, fireEvent, render, screen } from "@testing-library/react";
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
import { MatchDayScreen } from "../../../src/renderer/match/MatchDayScreen.js";
import { KeyboardSpine } from "../../../src/renderer/keyboard/KeyboardSpine.js";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { setActiveMatch } from "../../../src/renderer/match/session.js";
import { teachingSplashStorageKey } from "../../../src/renderer/discoverability/TeachingSplash.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";

export const rid = (id: string) => SaveId.make(id);

export const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

export const NOT_FOUND = { _tag: "SaveNotFoundError", id: rid("s1") };

export const noSubs = (overrides: Partial<SubstitutionStatusView> = {}): SubstitutionStatusView => ({
  used: 0,
  remaining: 5,
  windowsUsed: 0,
  windowsRemaining: 3,
  capReached: false,
  ...overrides,
});

/** A full valid tactic so the live panel has on-pitch players to edit. */
export const fullTactic = () => {
  const formation = FORMATIONS[0]; // 4-4-2
  return {
    formation,
    slots: (FORMATION_SLOTS[formation] ?? []).map((position, index) => ({
      position,
      role: POSITION_ROLES[position],
      playerId: rid(`on-${index}`),
    })),
    bench: [rid("bench-1"), rid("bench-2")],
    mentality: "balanced" as const,
    tempo: "normal" as const,
    pressing: "medium" as const,
  };
};

export const tacticView = (tactic = fullTactic()) => {
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
    nationality: "England",
    birthplace: "London",
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
    revision: 0,
  };
};

export const orangeInjury = () => ({
  minute: 23,
  teamClubId: rid("home"),
  playerId: rid("on-5"),
  trigger: "contact" as const,
  severity: "medium" as const,
  tier: "orange" as const,
  type: "twistedAnkle" as const,
});

export const resumeView = (overrides: Record<string, unknown> = {}) => ({
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

export interface SessionOverrides {
  readonly isHome?: boolean;
  readonly homeSubs?: SubstitutionStatusView;
  readonly chunkInjuries?: ReadonlyArray<ReturnType<typeof orangeInjury>>;
}

export const session = (overrides: SessionOverrides = {}) => ({
  saveId: rid("s1"),
  match: {
    matchId: rid("m1"),
    homeClubId: rid("home"),
    homeClubName: "Home FC",
    awayClubId: rid("away"),
    awayClubName: "Away FC",
    isHome: overrides.isHome ?? true,
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

export interface Submissions {
  readonly calls: Array<{ method: string; payload: Record<string, unknown> }>;
}

/** How the mocked match answers a command: by default it takes every substitution, counting it for
 *  the side that made it, as the engine's whole-match counts do. */
export type CommandResponder = (command: { _tag: string; clubId: string }, taken: { home: number; away: number }) => unknown;

export const takesSubstitutions: CommandResponder = (command, taken) => {
  if (command._tag === "MakeSubstitution") taken[command.clubId === "home" ? "home" : "away"] += 1;
  return {
    _tag: "Success",
    value: resumeView({ homeSubs: noSubs({ used: taken.home }), awaySubs: noSubs({ used: taken.away }) }),
  };
};

export const mountMatchDayWithSpine = async (
  sess: ReturnType<typeof session>,
  onCall?: (method: string, payload: unknown) => Promise<unknown> | undefined,
  respond: CommandResponder = takesSubstitutions,
  polled: Record<string, unknown> = {},
): Promise<Submissions> => {
  const submissions: Submissions = { calls: [] };
  const taken = { home: 0, away: 0 };
  window.localStorage.clear();
  window.localStorage.setItem(teachingSplashStorageKey, "1");
  setActiveMatch(sess as never);
  mockPreload(async (method, payload) => {
    if (method === "getTactics") return { _tag: "Success", value: tacticView() } as never;
    if (method === "resumeSimulation") return { _tag: "Success", value: resumeView(polled) } as never;
    if (method === "submitMatchCommand") {
      submissions.calls.push({ method, payload: payload as Record<string, unknown> });
      return respond((payload as { command: { _tag: string; clubId: string } }).command, taken) as never;
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
  bindRouter({ navigate: () => undefined, history: { back: () => undefined, forward: () => undefined, canGoBack: () => false } } as never);
  render(<RouterProvider router={router} />);
  // The live panel is mounted once the resumed match renders with a loaded tactic.
  await screen.findByRole("button", { name: /Tactics & substitutions/ });
  return submissions;
};

/** Every joint keystroke passes the physical `code` react-hotkeys-hook's matcher
 *  reads (jsdom leaves `code` empty otherwise), separate from the logical `key`. */
export const keyDown = (key: string, init: Record<string, unknown> = {}, code?: string): void => {
  act(() => fireEvent.keyDown(document, { key, code: code ?? key, ...init }));
};

export const openPanel = (): void => {
  act(() => {
    fireEvent.click(screen.getByRole("button", { name: /Tactics & substitutions/ }));
  });
};

export const panelContent = (): HTMLElement | null => screen.queryByText("Make a substitution");

