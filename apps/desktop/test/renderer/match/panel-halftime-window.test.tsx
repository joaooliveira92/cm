// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CommentaryLineView } from "@cm-clone/contracts";
import { clearActiveMatch, getRevealedEvents } from "../../../src/renderer/match/session.js";
import { dispatchAction, resetActionHandlers } from "../../../src/renderer/actions/dispatch.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";
import { mountMatchDayWithSpine, openPanel, rid, session, type Polled } from "./liveMatchDayHarness.js";

/**
 * group-g-match-day 24: the Match day panel offers the halftime instruction only while the reveal
 * stands at half time — `HalfTimeReached` revealed and no second-half line after it — the same window
 * the standalone screens use (ticket 16).
 */

const at = (minute: number, tag: string, text: string): CommentaryLineView => ({ minute, tag, text });

/** A match fed to the polls in stages: each poll answers the lines pushed since the previous one. */
const stagedFeed = () => {
  const feed: Array<CommentaryLineView> = [];
  let delivered = 0;
  const polled: Polled = () => {
    const lines = feed.slice(delivered);
    delivered = feed.length;
    return { cursor: feed.length, lines };
  };
  return { feed, polled };
};

const halftimeToggle = (): HTMLInputElement =>
  screen.getByLabelText(/Apply as a halftime instruction/) as HTMLInputElement;

const revealedCount = (count: number) =>
  waitFor(() => expect(getRevealedEvents(rid("s1"))).toBe(count), { timeout: 4000 });

const substitute = (off: string, on: string): void => {
  act(() => void dispatchAction("set-live-substitute-off", { playerId: rid(off) }));
  act(() => void dispatchAction("set-live-substitute-in", { playerId: rid(on) }));
  act(() => void dispatchAction("make-substitution"));
};

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

describe("the Match day panel's halftime instruction is offered only at half time (group-g-match-day 24)", () => {
  it("is closed before HalfTimeReached, open once it is revealed, and closed again at the first second-half line", async () => {
    const { feed, polled } = stagedFeed();
    // A first-half stoppage line carries a minute above 45: it is still before half time.
    feed.push(at(1, "MatchStarted", "Kick-off."), at(47, "ShotMissed", "Stoppage-time shot wide."));
    const submissions = await mountMatchDayWithSpine(session(), undefined, undefined, polled);
    openPanel();
    await revealedCount(2);

    await waitFor(() => expect(halftimeToggle().disabled).toBe(true));
    expect(screen.getByText(/available at half time/)).toBeTruthy();
    fireEvent.click(halftimeToggle());
    substitute("on-1", "bench-1");
    await waitFor(() => expect(submissions.calls).toHaveLength(1));
    expect(submissions.calls[0]!.payload).toMatchObject({ isHalftime: false, minute: 45 });

    feed.push(at(45, "HalfTimeReached", "Half time."));
    await revealedCount(3);
    await waitFor(() => expect(halftimeToggle().disabled).toBe(false));
    expect(screen.queryByText(/available at half time/)).toBeNull();
    fireEvent.click(halftimeToggle());
    expect(halftimeToggle().checked).toBe(true);
    substitute("on-2", "bench-2");
    await waitFor(() => expect(submissions.calls).toHaveLength(2));
    expect(submissions.calls[1]!.payload).toMatchObject({ isHalftime: true, minute: 45 });

    feed.push(at(52, "ShotSaved", "Second-half save."));
    await revealedCount(4);
    await waitFor(() => expect(halftimeToggle().disabled).toBe(true));
    expect(halftimeToggle().checked).toBe(false);
    substitute("on-3", "bench-3");
    await waitFor(() => expect(submissions.calls).toHaveLength(3));
    expect(submissions.calls[2]!.payload).toMatchObject({ isHalftime: false, minute: 52 });
  }, 15_000);

  it("is open on the first render after returning to Match day at half time", async () => {
    const { feed, polled } = stagedFeed();
    feed.push(at(1, "MatchStarted", "Kick-off."), at(45, "HalfTimeReached", "Half time."));
    await mountMatchDayWithSpine(session(), undefined, undefined, polled);
    await revealedCount(2);
    cleanup();

    await mountMatchDayWithSpine(null, undefined, undefined, () => ({ cursor: 2, lines: [] }));
    openPanel();
    expect(halftimeToggle().disabled).toBe(false);
  }, 10_000);
});
