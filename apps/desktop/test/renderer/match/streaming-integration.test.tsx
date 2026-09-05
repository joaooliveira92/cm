// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
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

const resumeView = (overrides: Record<string, unknown> = {}) => ({
  matchId: rid("m1"),
  cursor: 0,
  isComplete: false,
  homeScore: 0,
  awayScore: 0,
  lines: [] as CommentaryLineView[],
  homeSubs: noSubs(),
  awaySubs: noSubs(),
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
  revealed: [],
  homeScore: 0,
  awayScore: 0,
  phase: "live" as const,
  homeSubs: noSubs(),
  awaySubs: noSubs(),
  homeOnPitchCount: 11,
  chunkInjuries: [],
  currentMinute: 1,
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
  return (
    <output data-testid="probe">
      {state.revealed.length}|{state.phase === "complete" ? "complete" : "live"}|{state.phase === "paused" ? "paused" : "running"}|{state.homeScore}-{state.awayScore}
    </output>
  );
};

interface MountedProbe {
  readonly calls: () => number;
  readonly text: () => string;
}

const mountProbe = async (
  sess: Record<string, unknown>,
  chunks: ReadonlyArray<Record<string, unknown>>,
): Promise<MountedProbe> => {
  setActiveMatch(session(sess) as never);
  let calls = 0;
  const queue = [...chunks];
  mockPreload(async (method) => {
    if (method === "resumeSimulation") {
      calls += 1;
      const next = queue.shift() ?? resumeView();
      return { _tag: "Success", value: next } as never;
    }
    return { _tag: "Failure", error: NOT_FOUND } as never;
  });
  render(
    <RegistryProvider>
      <MatchProvider saveId={rid("s1")}>
        <Probe />
      </MatchProvider>
    </RegistryProvider>,
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  return {
    calls: () => calls,
    text: () => screen.getByTestId("probe").textContent ?? "",
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

  it("holds the feed while a no-subs decision is pending — no poll reaches the wire", async () => {
    const sess = {
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