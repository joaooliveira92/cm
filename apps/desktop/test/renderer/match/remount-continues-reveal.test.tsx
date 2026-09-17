// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClubId, MatchId, PlayerId, SaveId, type CommentaryLineView, type InjuryView } from "@cm-clone/contracts";
import { POLL_INTERVAL_MS, REVEAL_INTERVAL_MS, RegistryProvider } from "../../../src/renderer/rpc.js";
import { MatchProvider, useMatchContext } from "../../../src/renderer/match/MatchProvider.js";
import { CommentaryProvider, useCommentaryContext } from "../../../src/renderer/match/CommentaryProvider.js";
import { useMatchStreaming } from "../../../src/renderer/match/streaming.js";
import {
  clearActiveMatch,
  getRevealedEvents,
  getRevealedMinute,
  getRevealedScore,
  recordRevealedInjuries,
  recordRevealedLines,
  recordRevealedMinute,
  setActiveMatch,
} from "../../../src/renderer/match/session.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";

/**
 * group-g-match-day 23: leaving Match day and coming back continues from the revealed position. The
 * first mount reveals part of a match through the real providers; unmounting and mounting again is
 * what navigating away and back does, with the module-level match session surviving in between.
 */

const s1 = SaveId.make("s1");
const home = ClubId.make("home");

const subs = (capReached = false) => ({
  used: capReached ? 5 : 0,
  remaining: capReached ? 0 : 5,
  windowsUsed: capReached ? 3 : 0,
  windowsRemaining: capReached ? 0 : 3,
  capReached,
});

const at = (minute: number, tag: string, text: string): CommentaryLineView => ({ minute, tag, text });

const MATCH: ReadonlyArray<CommentaryLineView> = [
  at(1, "MatchStarted", "Kick-off."),
  at(12, "ShotMissed", "Wide."),
  at(30, "Goal", "Home FC score! 1-0."),
  at(38, "ShotSaved", "Saved."),
  at(41, "ShotMissed", "Over the bar."),
  at(44, "ShotMissed", "Just wide."),
];

const knock = (): InjuryView => ({
  minute: 23,
  teamClubId: home,
  playerId: PlayerId.make("on-5"),
  trigger: "contact",
  severity: "medium",
  tier: "orange",
  type: "twistedAnkle",
});

interface Mocked {
  readonly reads: Array<{ cursor: number; revealedEvents: number }>;
  readonly commands: Array<Record<string, unknown>>;
  readonly answerCommands: () => void;
}

/** Answers the way the main process does: the chunk after `cursor`, and the score cut at the request's
 *  revealed position. `injuries` are the chunk's, paired with its Injury lines. */
const mockMatch = (
  lines: ReadonlyArray<CommentaryLineView>,
  /** `holdReads`: `resumeSimulation` never answers, so whatever shows came from the session. */
  options: {
    capReached?: boolean;
    injuries?: ReadonlyArray<InjuryView>;
    holdReads?: boolean;
    /** The home score a command response reports, whatever was revealed. */
    commandScore?: number;
    holdCommands?: boolean;
  } = {},
): Mocked => {
  const held: Array<() => void> = [];
  const mocked: Mocked = { reads: [], commands: [], answerCommands: () => {
      for (const answer of held.splice(0)) answer();
    },
  };
  const view = (request: { cursor: number; revealedEvents: number }) => ({
    matchId: "m1",
    cursor: lines.length,
    isComplete: false,
    homeScore: lines.slice(0, request.revealedEvents).filter((line) => line.tag === "Goal").length,
    awayScore: 0,
    lines: lines.slice(request.cursor),
    homeSubs: subs(options.capReached),
    awaySubs: subs(),
    homePitch: { onPitch: [{ playerId: "on-1", position: "DC" }], substitutes: ["bench-1"] },
    awayPitch: { onPitch: [], substitutes: [] },
    injuredClubIds: [],
    injuries: lines.slice(0, request.cursor).some((line) => line.tag === "Injury") ? [] : (options.injuries ?? []),
    homeOnPitchCount: 1,
    awayOnPitchCount: 0,
  });
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string, payload: { cursor: number; revealedEvents: number }) => {
      if (method === "resumeSimulation") {
        mocked.reads.push(payload);
        if (options.holdReads === true) return new Promise(() => undefined);
        return { _tag: "Success", value: view(payload) };
      }
      if (method === "submitMatchCommand") {
        mocked.commands.push(payload as never);
        const answer = {
          _tag: "Success",
          value: { ...view(payload), homeScore: options.commandScore ?? view(payload).homeScore, substitutionApplied: null },
        };
        if (options.holdCommands !== true) return answer;
        return new Promise((resolve) => held.push(() => resolve(answer)));
      }
      return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: s1 } };
    },
  };
  return mocked;
};

const Probe = () => {
  useMatchStreaming();
  const { state } = useMatchContext();
  const { state: comm, actions } = useCommentaryContext();
  return (
    <>
      <button type="button" onClick={() => void actions.submitCommand({ _tag: "ForceOff", clubId: home, playerId: PlayerId.make("on-1") }, false)}>
        Bring off
      </button>
      <output data-testid="probe">
        {comm.revealed.map((line) => line.text).join(" / ")}|{comm.homeScore}-{comm.awayScore}|{comm.currentMinute}|{state.phase}
      </output>
      <output data-testid="subs">{comm.clubSubsKnown ? `${comm.clubSubs.used}${comm.clubSubs.capReached ? " cap" : ""}` : "unknown"}</output>
      <output data-testid="injuries">{comm.revealedInjuries.map((revealed) => revealed.injury.playerId).join(",")}</output>
    </>
  );
};

const mountMatchDay = async () => {
  render(
    <RegistryProvider>
      <MatchProvider saveId={s1}>
        <CommentaryProvider>
          <Probe />
        </CommentaryProvider>
      </MatchProvider>
    </RegistryProvider>,
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
};

const tick = async (times = 1) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(REVEAL_INTERVAL_MS * times);
  });
};

const probe = () => screen.getByTestId("probe").textContent ?? "";

/** Watches the first `revealed` lines of `lines` on Match day, then leaves it. */
const watchThenLeave = async (revealed: number) => {
  setActiveMatch({
    saveId: s1,
    match: { matchId: "m1", fixtureId: 1, homeClubId: home, homeClubName: "Home FC", awayClubId: "away", awayClubName: "Away FC", isHome: true },
    phase: "live",
  } as never);
  await mountMatchDay();
  await tick(revealed);
  cleanup();
};

beforeEach(() => {
  cleanup();
  resetScopeState();
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  clearActiveMatch(s1);
  resetScopeState();
  vi.useRealTimers();
});

describe("returning to Match day continues from the revealed position (group-g-match-day 23)", () => {
  it("shows the revealed lines and score at once, and polls from there instead of kickoff", async () => {
    mockMatch(MATCH);
    await watchThenLeave(3);
    expect(getRevealedEvents(s1)).toBe(3);

    const returned = mockMatch(MATCH);
    await mountMatchDay();

    expect(probe()).toBe("Kick-off. / Wide. / Home FC score! 1-0.|1-0|30|live");
    expect(returned.reads[0]).toMatchObject({ cursor: 3, revealedEvents: 3 });
    expect(returned.reads.every((read) => read.revealedEvents >= 3)).toBe(true);

    // The feed carries on with the fourth line, and the recorded position only moves forward.
    await tick();
    expect(probe()).toBe("Kick-off. / Wide. / Home FC score! 1-0. / Saved.|1-0|38|live");
    expect(getRevealedEvents(s1)).toBe(4);
    expect(getRevealedMinute(s1)).toBe(38);
    expect(getRevealedScore(s1)).toEqual({ homeScore: 1, awayScore: 0 });
  });

  it("restores the score and stamps a command raised straight after returning at the revealed minute", async () => {
    mockMatch(MATCH);
    await watchThenLeave(3);

    // No read is answered after the return, so nothing here comes from a match response.
    const returned = mockMatch(MATCH, { holdReads: true });
    await mountMatchDay();
    expect(probe()).toBe("Kick-off. / Wide. / Home FC score! 1-0.|1-0|30|live");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Bring off" }));
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(returned.commands).toHaveLength(1);
    expect(returned.commands[0]).toMatchObject({ minute: 30, revealedEvents: 3, isHalftime: false });
  });

  it("keeps a revealed Injury's decision pause across the return", async () => {
    const lines = [at(1, "MatchStarted", "Kick-off."), at(23, "Injury", "He is down."), at(24, "ShotMissed", "Play on.")];
    mockMatch(lines, { capReached: true, injuries: [knock()] });
    await watchThenLeave(2);

    const returned = mockMatch(lines, { capReached: true });
    await mountMatchDay();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 2);
    });

    expect(screen.getByTestId("injuries").textContent).toBe("on-5");
    expect(probe()).toBe("Kick-off. / He is down.|0-0|23|paused");
    // Paused on the decision: nothing is revealed past it, and any read is at the restored position
    // (the revealed Injury line re-reads the match state there).
    expect(returned.reads.every((read) => read.revealedEvents === 2)).toBe(true);
  });

  it("brings back the club's substitution counts with the decision, before any read answers", async () => {
    const lines = [at(1, "MatchStarted", "Kick-off."), at(23, "Injury", "He is down."), at(24, "ShotMissed", "Play on.")];
    mockMatch(lines, { capReached: true, injuries: [knock()] });
    await watchThenLeave(2);

    mockMatch(lines, { capReached: true, holdReads: true });
    await mountMatchDay();

    expect(screen.getByTestId("subs").textContent).toBe("5 cap");
    expect(probe()).toBe("Kick-off. / He is down.|0-0|23|paused");
  });

  it("reads the match once on return, even paused after a line that changes nothing, and takes its counts", async () => {
    const lines = [at(1, "MatchStarted", "Kick-off."), at(23, "Injury", "He is down."), at(23, "ShotMissed", "Wide.")];
    setActiveMatch({
      saveId: s1,
      match: { matchId: "m1", fixtureId: 1, homeClubId: home, homeClubName: "Home FC", awayClubId: "away", awayClubName: "Away FC", isHome: true },
      phase: "paused",
    } as never);
    // A session that recorded no substitution counts.
    const m1 = MatchId.make("m1");
    recordRevealedLines(s1, m1, lines);
    recordRevealedMinute(s1, 23);
    recordRevealedInjuries(s1, m1, [{ injury: knock(), capReachedWhenRevealed: true }], null);

    const returned = mockMatch(lines, { capReached: true });
    await mountMatchDay();

    expect(returned.reads).toEqual([expect.objectContaining({ cursor: 3, revealedEvents: 3 })]);
    expect(screen.getByTestId("subs").textContent).toBe("5 cap");
    expect(probe()).toBe("Kick-off. / He is down. / Wide.|0-0|23|paused");
  });

  it("keeps a response that lands after leaving out of the session the return restores from", async () => {
    const lines = [at(1, "MatchStarted", "Kick-off."), at(23, "Injury", "He is down."), at(24, "ShotMissed", "Play on.")];
    // Paused on the decision, so nothing is read after the command and its response is the latest.
    const first = mockMatch(lines, { capReached: true, injuries: [knock()], commandScore: 7, holdCommands: true });
    setActiveMatch({
      saveId: s1,
      match: { matchId: "m1", fixtureId: 1, homeClubId: home, homeClubName: "Home FC", awayClubId: "away", awayClubName: "Away FC", isHome: true },
      phase: "live",
    } as never);
    await mountMatchDay();
    await tick(2);
    expect(probe()).toBe("Kick-off. / He is down.|0-0|23|paused");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Bring off" }));
      await vi.advanceTimersByTimeAsync(0);
    });
    cleanup();

    await act(async () => {
      first.answerCommands();
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(first.commands).toHaveLength(1);
    expect(getRevealedScore(s1)).toEqual({ homeScore: 0, awayScore: 0 });
    expect(screen.queryByTestId("probe")).toBeNull();
  });
});
