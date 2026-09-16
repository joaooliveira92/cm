// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  ClubId,
  PlayerId,
  SaveId,
  type CommentaryLineView,
  type InjuryView,
  type SubstitutionStatusView,
} from "@cm-clone/contracts";
import { POLL_INTERVAL_MS, REVEAL_INTERVAL_MS, RegistryProvider } from "../../../src/renderer/rpc.js";
import { MatchProvider, useMatchContext } from "../../../src/renderer/match/MatchProvider.js";
import { CommentaryProvider, useCommentaryContext } from "../../../src/renderer/match/CommentaryProvider.js";
import { useMatchStreaming } from "../../../src/renderer/match/streaming.js";
import { clearActiveMatch, getRevealedScore, setActiveMatch } from "../../../src/renderer/match/session.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";

const rid = (id: string) => SaveId.make(id);
const cid = (id: string) => ClubId.make(id);
const pid = (id: string) => PlayerId.make(id);

const NOT_FOUND = { _tag: "SaveNotFoundError", id: rid("s1") };

const noSubs = (overrides: Partial<SubstitutionStatusView> = {}): SubstitutionStatusView => ({
  used: 0,
  remaining: 5,
  windowsUsed: 0,
  windowsRemaining: 3,
  capReached: false,
  ...overrides,
});

const line = (minute: number, text: string): CommentaryLineView => ({
  minute,
  tag: "MatchStarted",
  text,
});

const knock = (): InjuryView => ({
  minute: 23,
  teamClubId: cid("home"),
  playerId: pid("on-5"),
  trigger: "contact",
  severity: "medium",
  tier: "orange",
  type: "twistedAnkle",
});

/** A club's pitch: `onPitch` players, each at a DC slot (positions play no part here). */
const pitch = (onPitch: ReadonlyArray<string>, substitutes: ReadonlyArray<string> = []) => ({
  onPitch: onPitch.map((playerId) => ({ playerId, position: "DC" })),
  substitutes,
});

const resumeView = (overrides: Record<string, unknown> = {}) => ({
  matchId: rid("m1"),
  cursor: 0,
  isComplete: false,
  homeScore: 0,
  awayScore: 0,
  lines: [] as CommentaryLineView[],
  homeSubs: noSubs(),
  awaySubs: noSubs(),
  homePitch: pitch(["on-1"], ["bench-1"]),
  awayPitch: pitch(["away-1"]),
  injuredClubIds: [],
  injuries: [] as InjuryView[],
  homeOnPitchCount: 11,
  awayOnPitchCount: 11,
  ...overrides,
});

const session = (overrides: Record<string, unknown> = {}) => ({
  saveId: rid("s1"),
  match: {
    matchId: rid("m1"),
    homeClubId: cid("home"),
    homeClubName: "Home FC",
    awayClubId: cid("away"),
    awayClubName: "Away FC",
  },
  cursor: 0,
  phase: "live" as const,
  streamComplete: false,
  ...overrides,
});

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

/** The real seam under test: a host that runs the extracted streaming hook and reads the
 *  provider state it feeds. This is exactly the MatchCommentaryStream composition. */
const Probe = () => {
  useMatchStreaming();
  const { state } = useMatchContext();
  const { state: comm, actions } = useCommentaryContext();
  const bringOff = () => {
    void actions.submitCommand({ _tag: "ForceOff", clubId: cid("home"), playerId: pid("on-1") }, false);
  };
  return (
    <>
      <button type="button" onClick={bringOff}>
        Bring off
      </button>
      <output data-testid="probe">
        {comm.revealed.length}|{state.phase === "complete" ? "complete" : "live"}|{state.phase === "paused" ? "paused" : "running"}|{comm.homeScore}-{comm.awayScore}
      </output>
      <output data-testid="injuries">
        {comm.revealedInjuries.map((revealed) => revealed.injury.playerId).join(",")}
      </output>
      <output data-testid="pitch">
        {comm.clubPitch === null ? "unknown" : `${comm.clubPitch.onPitch.map((slot) => slot.playerId).join(",")}|${comm.clubPitch.substitutes.join(",")}`}
      </output>
    </>
  );
};

interface MountedProbe {
  readonly calls: () => number;
  readonly text: () => string;
  readonly pitch: () => string;
  /** The playerIds of the revealed injuries not yet acted on or resolved, in reveal order. */
  readonly injuries: () => string;
  readonly payloads: ReadonlyArray<Record<string, unknown>>;
  /** Queues a view for a later poll, after the chunks given at mount. */
  readonly enqueue: (view: Record<string, unknown>) => void;
}

const mountProbe = async (
  sess: Record<string, unknown>,
  chunks: ReadonlyArray<Record<string, unknown>>,
  /** What `submitMatchCommand` answers; a failure when omitted. */
  onCommand?: () => Promise<unknown>,
): Promise<MountedProbe> => {
  setActiveMatch(session(sess) as never);
  let calls = 0;
  const payloads: Array<Record<string, unknown>> = [];
  const queue = [...chunks];
  mockPreload(async (method, payload) => {
    if (method === "resumeSimulation") {
      calls += 1;
      payloads.push(payload as Record<string, unknown>);
      const next = queue.shift() ?? resumeView();
      return { _tag: "Success", value: next } as never;
    }
    if (method === "submitMatchCommand" && onCommand !== undefined) return onCommand() as never;
    return { _tag: "Failure", error: NOT_FOUND } as never;
  });
  render(
    <RegistryProvider>
      <MatchProvider saveId={rid("s1")}>
        <CommentaryProvider>
          <Probe />
        </CommentaryProvider>
      </MatchProvider>
    </RegistryProvider>,
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  return {
    calls: () => calls,
    text: () => screen.getByTestId("probe").textContent ?? "",
    pitch: () => screen.getByTestId("pitch").textContent ?? "",
    injuries: () => screen.getByTestId("injuries").textContent ?? "",
    payloads,
    enqueue: (view) => queue.push(view),
  };
};

beforeEach(() => {
  cleanup();
  resetScopeState();
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  clearActiveMatch(rid("s1"));
  resetScopeState();
  vi.useRealTimers();
});

describe("useMatchStreaming — poll ahead, buffer, reveal one line per tick (ADR-0007)", () => {
  it("consumes a successful poll chunk and reveals its lines at the reveal pace, then completes", async () => {
    // A response's score is as of the position its request was sent at: none revealed for the first.
    const chunk1 = resumeView({
      cursor: 2,
      lines: [line(10, "Kick-off."), line(20, "A chance!")],
    });
    const chunk2 = resumeView({ cursor: 2, isComplete: true, homeScore: 2, awayScore: 1 });
    const probe = await mountProbe({}, [chunk1, chunk2]);

    // First poll answered immediately: lines buffered (not yet revealed), scores synced.
    expect(probe.calls()).toBe(1);
    expect(probe.text()).toBe("0|live|running|0-0");

    // One line per REVEAL_INTERVAL_MS, in order.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(REVEAL_INTERVAL_MS);
    });
    expect(probe.text()).toBe("1|live|running|0-0");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(REVEAL_INTERVAL_MS);
    });
    expect(probe.text()).toBe("2|live|running|0-0");

    // The 800ms poll tick runs once more (buffer drained below the refetch threshold), marking
    // the stream complete and syncing the score at the new revealed position; the reveal pacer then
    // flips the match to full time.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    });
    expect(probe.calls()).toBe(2);
    expect(probe.payloads[1]).toMatchObject({ revealedEvents: 2 });
    expect(probe.text()).toBe("2|complete|running|2-1");

    // A finished match stops polling: further ticks leave the call count untouched.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(probe.calls()).toBe(2);
    expect(probe.text()).toBe("2|complete|running|2-1");
  });

  it("re-reads the controlled club's pitch once a revealed line changes it, at the revealed position", async () => {
    const substitution: CommentaryLineView = { minute: 30, tag: "Substitution", text: "A forced change." };
    const chunk1 = resumeView({ cursor: 3, lines: [line(1, "Kick-off."), substitution, line(31, "Play on.")] });
    const afterSub = resumeView({ cursor: 3, homePitch: pitch(["bench-1"]) });
    const probe = await mountProbe({ match: { ...session().match, isHome: true } }, [chunk1, afterSub]);

    // The poll that brought the substitution was read before any of it was revealed.
    expect(probe.pitch()).toBe("on-1|bench-1");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(REVEAL_INTERVAL_MS);
    });
    expect(probe.calls()).toBe(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(REVEAL_INTERVAL_MS);
    });
    expect(probe.calls()).toBe(2);
    expect(probe.payloads[1]).toMatchObject({ cursor: 3, revealedEvents: 2 });
    expect(probe.pitch()).toBe("bench-1|");
    // The re-read's chunk is not fed to the reveal a second time.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(REVEAL_INTERVAL_MS);
    });
    expect(probe.text()).toBe("3|live|running|0-0");
  });

  it("keeps a command's pitch when a poll sent before the command is answered after it", async () => {
    setActiveMatch(session({ match: { ...session().match, isHome: true } }) as never);
    let polls = 0;
    let answerHeldPoll: (() => void) | undefined;
    mockPreload((method) => {
      if (method === "submitMatchCommand") {
        return Promise.resolve({ _tag: "Success", value: { ...resumeView({ homePitch: pitch([], ["bench-1"]) }), substitutionApplied: null } } as never);
      }
      if (method !== "resumeSimulation") return Promise.resolve({ _tag: "Failure", error: NOT_FOUND } as never);
      polls += 1;
      const answer = { _tag: "Success", value: resumeView() } as never;
      // The second poll is held in flight until the test answers it.
      if (polls !== 2) return Promise.resolve(answer);
      return new Promise((resolve) => {
        answerHeldPoll = () => resolve(answer);
      });
    });
    render(
      <RegistryProvider>
        <MatchProvider saveId={rid("s1")}>
          <CommentaryProvider>
            <Probe />
          </CommentaryProvider>
        </MatchProvider>
      </RegistryProvider>,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    });
    expect(polls).toBe(2);
    expect(screen.getByTestId("pitch").textContent).toBe("on-1|bench-1");

    // The command is sent while the poll is in flight, at the same revealed position, and answered first.
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Bring off" }));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByTestId("pitch").textContent).toBe("|bench-1");

    await act(async () => {
      answerHeldPoll?.();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByTestId("pitch").textContent).toBe("|bench-1");
  });

  it("a match restored paused with no decision pending returns to live and polls", async () => {
    // A session carries the phase but not the injuries: with nothing to decide, nothing would ever
    // lift a restored pause, so the feed must not stay held on it.
    const probe = await mountProbe({ phase: "paused" as const }, [resumeView({ cursor: 1, lines: [line(1, "Kick-off.")] })]);

    expect(probe.text()).toBe("0|live|running|0-0");
    expect(probe.calls()).toBe(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(REVEAL_INTERVAL_MS);
    });
    expect(probe.text()).toBe("1|live|running|0-0");
  });
});

describe("the injury decision pause fires when the Injury line is revealed (group-g-match-day 21)", () => {
  const injuryLine = (minute: number): CommentaryLineView => ({ minute, tag: "Injury", text: "He is down." });
  const capReached = noSubs({ used: 5, remaining: 0, capReached: true });
  const home = { ...session().match, isHome: true };
  const withInjury = (injury: InjuryView) =>
    resumeView({
      cursor: 3,
      homeSubs: capReached,
      lines: [line(1, "Kick-off."), injuryLine(23), line(24, "Play on.")],
      injuries: [injury],
    });

  it("an Injury to the controlled club still in the buffer does not pause; revealing it does", async () => {
    const probe = await mountProbe({ match: home }, [withInjury(knock()), resumeView({ homeSubs: capReached })]);

    // The chunk carrying the Injury has arrived, but none of it is revealed.
    expect(probe.calls()).toBe(1);
    expect(probe.text()).toBe("0|live|running|0-0");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(REVEAL_INTERVAL_MS);
    });
    expect(probe.text()).toBe("1|live|running|0-0");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(REVEAL_INTERVAL_MS);
    });
    expect(probe.text()).toBe("2|live|paused|0-0");

    // Paused: nothing further is revealed.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(REVEAL_INTERVAL_MS * 5);
    });
    expect(probe.text()).toBe("2|live|paused|0-0");
  });

  it("does not pause for a revealed Injury to the opponent, even at the cap", async () => {
    const opponentKnock: InjuryView = { ...knock(), teamClubId: cid("away"), playerId: pid("away-1") };
    const probe = await mountProbe({ match: home }, [withInjury(opponentKnock), resumeView({ homeSubs: capReached })]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(REVEAL_INTERVAL_MS * 3);
    });
    expect(probe.text()).toBe("3|live|running|0-0");
  });

  it("does not pause for a revealed Injury to the controlled club while it has substitutions left", async () => {
    const withSubs = resumeView({ ...withInjury(knock()), homeSubs: noSubs() });
    const probe = await mountProbe({ match: home }, [withSubs, resumeView()]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(REVEAL_INTERVAL_MS * 3);
    });
    expect(probe.text()).toBe("3|live|running|0-0");
  });
});

describe("revealed injuries: acted on, resolved, and the cap they were revealed at (group-g-match-day 21)", () => {
  const injuryLine = (minute: number): CommentaryLineView => ({ minute, tag: "Injury", text: "He is down." });
  const substitutionLine = (minute: number): CommentaryLineView => ({ minute, tag: "Substitution", text: "A change." });
  const capReached = noSubs({ used: 5, remaining: 0, capReached: true });
  const home = { ...session().match, isHome: true };
  const severe = (): InjuryView => ({ ...knock(), severity: "severe", tier: "red" });
  const tick = async (times = 1) => {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(REVEAL_INTERVAL_MS * times);
    });
  };

  it("an Injury revealed while a command is in flight survives that command's response", async () => {
    let answerCommand: (() => void) | undefined;
    const held = () =>
      new Promise((resolve) => {
        answerCommand = () => resolve({ _tag: "Success", value: { ...resumeView({ homeSubs: capReached }), substitutionApplied: null } });
      });
    const chunk = resumeView({ cursor: 2, homeSubs: capReached, lines: [line(1, "Kick-off."), injuryLine(23)], injuries: [knock()] });
    const probe = await mountProbe({ match: home }, [chunk], held);

    // The command is sent before the Injury line is revealed, so it cannot have acted on it.
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Bring off" }));
      await vi.advanceTimersByTimeAsync(0);
    });
    await tick(2);
    expect(probe.injuries()).toBe("on-5");
    expect(probe.text()).toBe("2|live|paused|0-0");

    await act(async () => {
      answerCommand?.();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(probe.injuries()).toBe("on-5");
    expect(probe.text()).toBe("2|live|paused|0-0");
  });

  it("a severe Injury is resolved by the forced Substitution revealed right after it", async () => {
    const chunk = resumeView({
      cursor: 4,
      homeSubs: noSubs({ used: 4, remaining: 1 }),
      lines: [line(1, "Kick-off."), injuryLine(23), substitutionLine(23), line(24, "Play on.")],
      injuries: [severe()],
    });
    const probe = await mountProbe({ match: home }, [chunk]);

    await tick(2);
    expect(probe.injuries()).toBe("on-5");
    await tick();
    expect(probe.injuries()).toBe("");
    await tick();
    expect(probe.text()).toBe("4|live|running|0-0");
  });

  it("a Substitution at a later minute does not resolve an earlier Injury", async () => {
    const chunk = resumeView({
      cursor: 3,
      lines: [line(1, "Kick-off."), injuryLine(23), substitutionLine(24)],
      injuries: [knock()],
    });
    const probe = await mountProbe({ match: home }, [chunk]);

    await tick(3);
    expect(probe.text()).toBe("3|live|running|0-0");
    expect(probe.injuries()).toBe("on-5");
  });

  it("an Injury revealed while substitutions remain never pauses once the cap is reached later", async () => {
    const chunk = resumeView({ cursor: 3, lines: [line(1, "Kick-off."), injuryLine(23), line(24, "Play on.")], injuries: [knock()] });
    const probe = await mountProbe({ match: home }, [chunk]);

    await tick(3);
    expect(probe.text()).toBe("3|live|running|0-0");
    expect(probe.injuries()).toBe("on-5");

    // A later read reports the cap reached: the decision the Injury was revealed at does not change.
    probe.enqueue(resumeView({ cursor: 3, homeSubs: capReached }));
    probe.enqueue(resumeView({ cursor: 3, homeSubs: capReached }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);
    });
    expect(probe.text()).toBe("3|live|running|0-0");
  });
});

describe("the scoreboard and head-count follow the reveal, not the fetched chunk (group-g-match-day 22)", () => {
  const goalLine: CommentaryLineView = { minute: 30, tag: "Goal", text: "Home FC score! 1-0." };
  const redCardLine: CommentaryLineView = { minute: 50, tag: "RedCard", text: "Sent off!" };
  const home = { ...session().match, isHome: true };

  /** Answers every read the way the main process does: score and head-count as of the request's
   *  revealed position, whatever chunk is returned. */
  const mountCutAtReveal = async (lines: ReadonlyArray<CommentaryLineView>) => {
    setActiveMatch(session({ match: home }) as never);
    const payloads: Array<Record<string, unknown>> = [];
    mockPreload(async (method, payload) => {
      if (method !== "resumeSimulation") return { _tag: "Failure", error: NOT_FOUND } as never;
      const request = payload as { cursor: number; revealedEvents: number };
      payloads.push(request);
      const revealed = lines.slice(0, request.revealedEvents);
      const homeScore = revealed.filter((revealedLine) => revealedLine.tag === "Goal").length;
      const sentOff = revealed.filter((revealedLine) => revealedLine.tag === "RedCard").length;
      return {
        _tag: "Success",
        value: resumeView({
          cursor: lines.length,
          isComplete: true,
          lines: lines.slice(request.cursor),
          homeScore,
          homeOnPitchCount: 11 - sentOff,
        }),
      } as never;
    });
    const Host = () => {
      useMatchStreaming();
      const { state: comm } = useCommentaryContext();
      return (
        <output data-testid="board">
          {comm.revealed.length}|{comm.homeScore}-{comm.awayScore}|{comm.clubOnPitchCount}
        </output>
      );
    };
    render(
      <RegistryProvider>
        <MatchProvider saveId={rid("s1")}>
          <CommentaryProvider>
            <Host />
          </CommentaryProvider>
        </MatchProvider>
      </RegistryProvider>,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    return {
      payloads,
      board: () => screen.getByTestId("board").textContent ?? "",
      tick: async () => {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(REVEAL_INTERVAL_MS);
        });
      },
    };
  };

  it("shows a goal once its line is revealed, never while it waits in the buffer", async () => {
    const view = await mountCutAtReveal([line(1, "Kick-off."), line(10, "A chance."), goalLine, line(40, "Play on.")]);

    // The whole match is fetched, goal included; nothing is revealed.
    expect(view.board()).toBe("0|0-0|11");
    expect(getRevealedScore(rid("s1"))).toEqual({ homeScore: 0, awayScore: 0 });

    await view.tick();
    await view.tick();
    expect(view.board()).toBe("2|0-0|11");
    expect(getRevealedScore(rid("s1"))).toEqual({ homeScore: 0, awayScore: 0 });

    await view.tick();
    expect(view.payloads.at(-1)).toMatchObject({ revealedEvents: 3 });
    expect(view.board()).toBe("3|1-0|11");
    expect(getRevealedScore(rid("s1"))).toEqual({ homeScore: 1, awayScore: 0 });
  });

  it("shows the club a player short once the red card is revealed, not when it is fetched", async () => {
    const view = await mountCutAtReveal([line(1, "Kick-off."), redCardLine, line(60, "Play on.")]);
    expect(view.board()).toBe("0|0-0|11");

    await view.tick();
    expect(view.board()).toBe("1|0-0|11");

    await view.tick();
    expect(view.board()).toBe("2|0-0|10");
  });
});
