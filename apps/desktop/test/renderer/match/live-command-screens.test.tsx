// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SaveId, type SubstitutionStatusView } from "@cm-clone/contracts";
import {
  FORMATION_SLOTS,
  FORMATIONS,
  OUTFIELD_ATTRIBUTES,
  POSITION_ROLES,
  STATURE_TIERS,
} from "@cm-clone/shared";
import { MatchSubstitutionsScreen } from "../../../src/renderer/matchSubstitutions/MatchSubstitutionsScreen.js";
import { MatchMatchTacticsScreen } from "../../../src/renderer/matchMatchTactics/MatchMatchTacticsScreen.js";
import {
  clearActiveMatch,
  getLiveTactic,
  recordHalfTimeRevealed,
  recordLiveTactic,
  recordRevealedMinute,
  recordRevealedScore,
  setActiveMatch,
} from "../../../src/renderer/match/session.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";

const rid = (id: string) => SaveId.make(id);

const subs = (overrides: Partial<SubstitutionStatusView> = {}): SubstitutionStatusView => ({
  used: 0,
  remaining: 5,
  windowsUsed: 0,
  windowsRemaining: 3,
  capReached: false,
  ...overrides,
});

const tactic = () => {
  const formation = FORMATIONS[0];
  return {
    formation,
    slots: (FORMATION_SLOTS[formation] ?? []).map((position, index) => ({
      position,
      role: POSITION_ROLES[position],
      playerId: rid(`on-${index}`),
    })),
    bench: [rid("bench-1")],
    mentality: "balanced" as const,
    tempo: "normal" as const,
    pressing: "medium" as const,
  };
};

const player = (id: string, firstName: string) => ({
  id,
  firstName,
  lastName: "Player",
  dateOfBirth: "1990-01-01",
  age: 25,
  attributes: Object.fromEntries(OUTFIELD_ATTRIBUTES.map((a) => [a, 12])),
  positions: [],
  overallRating: 80,
  positionRatings: {},
  condition: 90,
  trainingFocus: null,
  nationality: "England",
  birthplace: "London",
});

const tacticsView = () => ({
  club: { id: rid("away"), name: "Away FC", statureTier: STATURE_TIERS[0] },
  squad: [...tactic().slots.map((slot, i) => player(String(slot.playerId), `On${i}`)), player("bench-1", "Bench")],
  tactic: tactic(),
  revision: 0,
});

const resumeView = (overrides: Record<string, unknown> = {}) => ({
  matchId: rid("m1"),
  cursor: 0,
  isComplete: false,
  homeScore: 1,
  awayScore: 2,
  lines: [],
  homeSubs: subs(),
  awaySubs: subs(),
  injuredClubIds: [],
  injuries: [],
  homeOnPitchCount: 11,
  awayOnPitchCount: 11,
  conditions: {},
  ...overrides,
});

/** The human club is the away side, so every read and command must use the away facts. */
const liveSession = (phase: "live" | "complete" = "live") => ({
  saveId: rid("s1"),
  match: {
    matchId: rid("m1"),
    fixtureId: rid("f1"),
    homeClubId: rid("home"),
    homeClubName: "Home FC",
    awayClubId: rid("away"),
    awayClubName: "Away FC",
    isHome: false,
  },
  cursor: 0,
  phase,
  streamComplete: false,
});

type Handler = (method: string, payload: Record<string, unknown>) => unknown;

const mount = (Screen: typeof MatchSubstitutionsScreen, handler: Handler) => {
  const calls: Array<{ method: string; payload: Record<string, unknown> }> = [];
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string, payload: Record<string, unknown>) => {
      calls.push({ method, payload });
      return handler(method, payload);
    },
  };
  render(
    <RegistryProvider>
      <Screen saveId={rid("s1")} />
    </RegistryProvider>,
  );
  return calls;
};

const ok = (value: unknown) => ({ _tag: "Success", value });

beforeEach(() => cleanup());
afterEach(() => {
  cleanup();
  clearActiveMatch(rid("s1"));
});

describe("Match Substitutions — the live substitution screen", () => {
  it("says no match is in play when there is no live session, and calls nothing", async () => {
    setActiveMatch(liveSession("complete") as never);
    const calls = mount(MatchSubstitutionsScreen, () => ok(tacticsView()));
    expect(await screen.findByText(/No match is in play/)).toBeTruthy();
    expect(calls.some((c) => c.method === "resumeSimulation")).toBe(false);
  });

  it("shows a loading state, then the controlled club's allowance and the score Match day has shown", async () => {
    setActiveMatch(liveSession() as never);
    recordRevealedScore(rid("s1"), { homeScore: 0, awayScore: 1 });
    mount(MatchSubstitutionsScreen, (method) =>
      method === "getTactics"
        ? ok(tacticsView())
        : ok(resumeView({ homeSubs: subs({ used: 4 }), awaySubs: subs({ used: 1, remaining: 4, windowsUsed: 1, windowsRemaining: 2 }) })),
    );
    expect(screen.getByText("Loading the match...")).toBeTruthy();
    expect(await screen.findByText(/Substitutions used: 1\/5/)).toBeTruthy();
    // The read's score (1 - 2) describes the end of its chunk, not what the manager has seen.
    expect(screen.getByText("Home FC 0 - 1 Away FC")).toBeTruthy();
    expect(screen.queryByText("Home FC 1 - 2 Away FC")).toBeNull();
  });

  it("offers the halftime instruction only while the reveal stands at half time", async () => {
    setActiveMatch(liveSession() as never);
    recordRevealedMinute(rid("s1"), 70);
    mount(MatchSubstitutionsScreen, (method) => (method === "getTactics" ? ok(tacticsView()) : ok(resumeView())));
    const toggle = (await screen.findByLabelText(/Apply as a halftime instruction/)) as HTMLInputElement;
    expect(toggle.disabled).toBe(true);
    cleanup();

    recordRevealedMinute(rid("s1"), 45);
    recordHalfTimeRevealed(rid("s1"));
    mount(MatchSubstitutionsScreen, (method) => (method === "getTactics" ? ok(tacticsView()) : ok(resumeView())));
    expect(((await screen.findByLabelText(/Apply as a halftime instruction/)) as HTMLInputElement).disabled).toBe(false);
  });

  it("starts from the line-up the Match day panel last sent, and records its own applied substitution", async () => {
    setActiveMatch(liveSession() as never);
    const base = tactic();
    recordLiveTactic(rid("s1"), {
      ...base,
      slots: base.slots.map((slot, i) => (i === 0 ? { ...slot, playerId: rid("bench-1") } : slot)),
    } as never);
    mount(MatchSubstitutionsScreen, (method) => {
      if (method === "getTactics") return ok(tacticsView());
      if (method === "submitMatchCommand") return ok(resumeView({ awaySubs: subs({ used: 1, remaining: 4 }) }));
      return ok(resumeView());
    });
    const off = (await screen.findByLabelText("Player coming off")) as HTMLSelectElement;
    const offIds = [...off.options].map((o) => o.value);
    expect(offIds).toContain("bench-1");
    expect(offIds).not.toContain("on-0");

    fireEvent.change(off, { target: { value: "bench-1" } });
    fireEvent.change(screen.getByLabelText("Player coming on"), { target: { value: "on-0" } });
    fireEvent.click(screen.getByRole("button", { name: "Make substitution" }));
    await waitFor(() => expect(getLiveTactic(rid("s1"))?.slots[0]?.playerId).toBe("on-0"));
  });

  it("surfaces a failed load with Retry, and Retry reads again", async () => {
    setActiveMatch(liveSession() as never);
    let failures = 1;
    const calls = mount(MatchSubstitutionsScreen, (method) => {
      if (method === "getTactics") return ok(tacticsView());
      if (failures-- > 0) return { _tag: "Failure", error: { _tag: "MatchNotFoundError", matchId: rid("m1") } };
      return ok(resumeView());
    });
    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
    expect(await screen.findByText(/Substitutions used: 0\/5/)).toBeTruthy();
    expect(calls.filter((c) => c.method === "resumeSimulation")).toHaveLength(2);
  });

  it("disables the controls once the match reports the cap reached", async () => {
    setActiveMatch(liveSession() as never);
    mount(MatchSubstitutionsScreen, (method) =>
      method === "getTactics"
        ? ok(tacticsView())
        : ok(resumeView({ awaySubs: subs({ used: 3, remaining: 2, windowsUsed: 3, windowsRemaining: 0, capReached: true }) })),
    );
    const submit = await screen.findByRole("button", { name: "Make substitution" });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText("Player coming off") as HTMLSelectElement).disabled).toBe(true);
    expect(screen.getByText("Cap reached")).toBeTruthy();
  });

  it("submits the substitution for the controlled club at the revealed minute and shows it applied", async () => {
    setActiveMatch(liveSession() as never);
    recordRevealedMinute(rid("s1"), 63);
    recordHalfTimeRevealed(rid("s1"));
    const calls = mount(MatchSubstitutionsScreen, (method) => {
      if (method === "getTactics") return ok(tacticsView());
      if (method === "submitMatchCommand") {
        return ok(resumeView({ awaySubs: subs({ used: 1, remaining: 4, windowsUsed: 1, windowsRemaining: 2 }) }));
      }
      return ok(resumeView());
    });
    fireEvent.change(await screen.findByLabelText("Player coming off"), { target: { value: "on-3" } });
    fireEvent.change(screen.getByLabelText("Player coming on"), { target: { value: "bench-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Make substitution" }));

    await waitFor(() => expect(screen.getByRole("status").getAttribute("data-command-status")).toBe("applied"));
    const submitted = calls.find((c) => c.method === "submitMatchCommand")!.payload;
    expect(submitted).toMatchObject({
      matchId: "m1",
      minute: 63,
      isHalftime: false,
      command: { _tag: "MakeSubstitution", clubId: "away", outPlayerId: "on-3", inPlayerId: "bench-1" },
    });
    expect(screen.getByText(/Substitutions used: 1\/5/)).toBeTruthy();
  });

  it("shows the substitution rejected when the match does not count it", async () => {
    setActiveMatch(liveSession() as never);
    mount(MatchSubstitutionsScreen, (method) => (method === "getTactics" ? ok(tacticsView()) : ok(resumeView())));
    fireEvent.change(await screen.findByLabelText("Player coming off"), { target: { value: "on-3" } });
    fireEvent.change(screen.getByLabelText("Player coming on"), { target: { value: "bench-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Make substitution" }));

    await waitFor(() => expect(screen.getByRole("status").getAttribute("data-command-status")).toBe("rejected"));
    expect(screen.getByRole("status").textContent).toMatch(/did not take the substitution/);
  });
});

describe("Match Tactics — the live tactics screen", () => {
  it("shows the formation in play and submits a changed instruction as ChangeTactics", async () => {
    setActiveMatch(liveSession() as never);
    const calls = mount(MatchMatchTacticsScreen, (method) =>
      method === "getTactics" ? ok(tacticsView()) : ok(resumeView()),
    );
    expect(await screen.findByText(`Formation: ${FORMATIONS[0]}`)).toBeTruthy();
    const apply = screen.getByRole("button", { name: "Apply tactics change" }) as HTMLButtonElement;
    expect(apply.disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "attacking" }));
    fireEvent.click(apply);

    await waitFor(() => expect(screen.getByRole("status").getAttribute("data-command-status")).toBe("accepted"));
    const submitted = calls.find((c) => c.method === "submitMatchCommand")!.payload;
    expect(submitted.command).toMatchObject({ _tag: "ChangeTactics", clubId: "away", tactic: { mentality: "attacking" } });
  });

  it("shows a transport failure as a rejected command", async () => {
    setActiveMatch(liveSession() as never);
    mount(MatchMatchTacticsScreen, (method) => {
      if (method === "getTactics") return ok(tacticsView());
      if (method === "submitMatchCommand") throw new Error("ipc down");
      return ok(resumeView());
    });
    fireEvent.click(await screen.findByRole("button", { name: "attacking" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply tactics change" }));
    await waitFor(() => expect(screen.getByRole("status").getAttribute("data-command-status")).toBe("rejected"));
  });
});
