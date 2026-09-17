// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MatchId, SaveId, type SubstitutionStatusView } from "@cm-clone/contracts";
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
  recordRevealedLines,
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

/** A club's pitch as the match reports it: the kickoff XI, with `swaps` applied slot for slot. */
const pitch = (swaps: Record<string, string> = {}, substitutes: ReadonlyArray<string> = ["bench-1"]) => ({
  onPitch: tactic().slots.map((slot) => ({ playerId: swaps[slot.playerId] ?? slot.playerId, position: slot.position })),
  substitutes,
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
  homePitch: pitch(),
  awayPitch: pitch(),
  injuredClubIds: [],
  injuries: [],
  homeOnPitchCount: 11,
  awayOnPitchCount: 11,
  ...overrides,
});

/** A `submitMatchCommand` response: the chunk plus the command's own outcome. */
const commandView = (substitutionApplied: boolean | null, overrides: Record<string, unknown> = {}) => ({
  forceOffApplied: null,
  ...resumeView(overrides),
  substitutionApplied,
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
  phase,
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

  it("lists who the match has on the pitch and who is unused, not the tactic, and follows a command's response", async () => {
    setActiveMatch(liveSession() as never);
    // The tactic still names on-0 and on-3, but the match took on-0 off for bench-1 and sent on-3 off.
    recordLiveTactic(rid("s1"), tactic() as never);
    const swapped = pitch({ "on-0": "bench-1" }, ["bench-2"]);
    const afterRed = { ...swapped, onPitch: swapped.onPitch.filter((slot) => slot.playerId !== "on-3") };
    const afterCommand = { ...afterRed, onPitch: afterRed.onPitch.map((slot) => (slot.playerId === "on-1" ? { ...slot, playerId: "bench-2" } : slot)), substitutes: [] };
    mount(MatchSubstitutionsScreen, (method) => {
      if (method === "getTactics") {
        const view = tacticsView();
        return ok({ ...view, squad: [...view.squad, player("bench-2", "Second")] });
      }
      if (method === "submitMatchCommand") return ok(commandView(true, { awayPitch: afterCommand }));
      // The home side's pitch is the kickoff XI: it must not leak into the controlled away club's lists.
      return ok(resumeView({ homePitch: pitch(), awayPitch: afterRed }));
    });
    const off = (await screen.findByLabelText("Player coming off")) as HTMLSelectElement;
    const on = screen.getByLabelText("Player coming on") as HTMLSelectElement;
    const values = (select: HTMLSelectElement) => [...select.options].map((o) => o.value).filter((id) => id !== "");

    expect(values(off)).toHaveLength(10);
    expect(values(off)).toContain("bench-1");
    expect(values(off)).not.toContain("on-0");
    expect(values(off)).not.toContain("on-3");
    expect([...off.options].find((o) => o.value === "bench-1")?.textContent).toBe(`Bench Player (${tactic().slots[0]!.position})`);
    expect(values(on)).toEqual(["bench-2"]);

    fireEvent.change(off, { target: { value: "on-1" } });
    fireEvent.change(on, { target: { value: "bench-2" } });
    fireEvent.click(screen.getByRole("button", { name: "Make substitution" }));

    await waitFor(() => expect(screen.getByRole("status").getAttribute("data-command-status")).toBe("applied"));
    expect(values(off)).toContain("bench-2");
    expect(values(off)).not.toContain("on-1");
    expect(values(on)).toEqual([]);
    // The applied substitution is still recorded for a later tactics change to carry.
    expect(getLiveTactic(rid("s1"))?.slots[1]?.playerId).toBe("bench-2");
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
        return ok(commandView(true, { awaySubs: subs({ used: 1, remaining: 4, windowsUsed: 1, windowsRemaining: 2 }) }));
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

  it("reads the counts and sends the command at the position Match day has revealed", async () => {
    setActiveMatch(liveSession() as never);
    recordRevealedLines(rid("s1"), MatchId.make("m1"), Array.from({ length: 12 }, (_, minute) => ({ minute, tag: "ShotMissed", text: "Wide." })));
    const calls = mount(MatchSubstitutionsScreen, (method) => {
      if (method === "getTactics") return ok(tacticsView());
      if (method === "submitMatchCommand") return ok(commandView(true));
      return ok(resumeView());
    });
    fireEvent.change(await screen.findByLabelText("Player coming off"), { target: { value: "on-3" } });
    fireEvent.change(screen.getByLabelText("Player coming on"), { target: { value: "bench-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Make substitution" }));

    await waitFor(() => expect(calls.some((c) => c.method === "submitMatchCommand")).toBe(true));
    expect(calls.find((c) => c.method === "resumeSimulation")!.payload).toMatchObject({ revealedEvents: 12 });
    expect(calls.find((c) => c.method === "submitMatchCommand")!.payload).toMatchObject({ revealedEvents: 12 });
  });

  it("shows a substitution applied from its own event though re-simulation holds the count level", async () => {
    setActiveMatch(liveSession() as never);
    // One forced substitution was counted; the command re-simulates it away, so the count stays 1.
    const level = { awaySubs: subs({ used: 1, remaining: 4, windowsUsed: 1, windowsRemaining: 2 }) };
    mount(MatchSubstitutionsScreen, (method) => {
      if (method === "getTactics") return ok(tacticsView());
      if (method === "submitMatchCommand") return ok(commandView(true, level));
      return ok(resumeView(level));
    });
    fireEvent.change(await screen.findByLabelText("Player coming off"), { target: { value: "on-3" } });
    fireEvent.change(screen.getByLabelText("Player coming on"), { target: { value: "bench-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Make substitution" }));

    await waitFor(() => expect(screen.getByRole("status").getAttribute("data-command-status")).toBe("applied"));
  });

  it("shows the substitution rejected when the match does not take it", async () => {
    setActiveMatch(liveSession() as never);
    mount(MatchSubstitutionsScreen, (method) => {
      if (method === "getTactics") return ok(tacticsView());
      if (method === "submitMatchCommand") return ok(commandView(false));
      return ok(resumeView());
    });
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
    const calls = mount(MatchMatchTacticsScreen, (method) => {
      if (method === "getTactics") return ok(tacticsView());
      if (method === "submitMatchCommand") return ok(commandView(null));
      return ok(resumeView());
    });
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
