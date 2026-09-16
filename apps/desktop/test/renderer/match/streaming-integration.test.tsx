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
import { clearActiveMatch, setActiveMatch } from "../../../src/renderer/match/session.js";
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
  conditions: {},
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
  readonly payloads: ReadonlyArray<Record<string, unknown>>;
}

const mountProbe = async (
  sess: Record<string, unknown>,
  chunks: ReadonlyArray<Record<string, unknown>>,
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
    payloads,
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
    const chunk1 = resumeView({
      cursor: 2,
      lines: [line(10, "Kick-off."), line(20, "A chance!")],
      homeScore: 2,
      awayScore: 1,
    });
    const chunk2 = resumeView({ cursor: 2, isComplete: true, homeScore: 2, awayScore: 1 });
    const probe = await mountProbe({}, [chunk1, chunk2]);

    // First poll answered immediately: lines buffered (not yet revealed), scores synced.
    expect(probe.calls()).toBe(1);
    expect(probe.text()).toBe("0|live|running|2-1");

    // One line per REVEAL_INTERVAL_MS, in order.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(REVEAL_INTERVAL_MS);
    });
    expect(probe.text()).toBe("1|live|running|2-1");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(REVEAL_INTERVAL_MS);
    });
    expect(probe.text()).toBe("2|live|running|2-1");

    // The 800ms poll tick runs once more (buffer drained below the refetch threshold), marking
    // the stream complete; the reveal pacer then flips the match to full time.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    });
    expect(probe.calls()).toBe(2);
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

  it("holds the feed while a no-subs decision is pending — no poll reaches the wire", async () => {
    const sess = {
      phase: "paused" as const,
      homeSubs: noSubs({ used: 5, remaining: 0, capReached: true }),
      chunkInjuries: [knock()],
    };
    const probe = await mountProbe(sess, [resumeView()]);

    // The pause gate arms during mount narration, before the streaming hook's first poll, so the
    // decision-pause holds every fetch: not one resumeSimulation call, no reveal, not complete.
    expect(probe.calls()).toBe(0);
    expect(probe.text()).toBe("0|live|paused|0-0");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(probe.calls()).toBe(0);
    expect(probe.text()).toBe("0|live|paused|0-0");
  });
});