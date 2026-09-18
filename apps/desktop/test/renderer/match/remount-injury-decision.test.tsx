import { cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearActiveMatch } from "../../../src/renderer/match/session.js";
import { resetActionHandlers } from "../../../src/renderer/actions/dispatch.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";
import { keyDown, mountMatchDayWithSpine, noSubs, orangeInjury, rid, session } from "./liveMatchDayHarness.js";

/**
 * group-g-match-day 23: a manager who leaves Match day while it waits on a no-subs injury decision
 * comes back to the same decision, offered at once: the paused match is not polled, so the counts
 * that make it a decision come back with the rest of what was revealed.
 */

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

describe("returning to Match day during a no-subs injury decision (group-g-match-day 23)", () => {
  it("offers Play on with the cap reached, and Enter resolves it", async () => {
    const capReached = noSubs({ used: 5, remaining: 0, windowsUsed: 3, windowsRemaining: 0, capReached: true });
    const injuryLine = { minute: 23, tag: "Injury", text: "He is down." };
    await mountMatchDayWithSpine(session(), undefined, undefined, (call) =>
      call === 0
        ? { cursor: 1, homeSubs: capReached, lines: [injuryLine], injuries: [orangeInjury()] }
        : { cursor: 1, homeSubs: capReached },
    );
    await screen.findByText("Paused — awaiting decision", {}, { timeout: 4000 });
    cleanup();

    await mountMatchDayWithSpine(null, undefined, undefined, () => ({ cursor: 1, homeSubs: capReached }));

    // On the first render with the panel, not after a read catches up.
    expect(screen.getByText("Paused — awaiting decision")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Play on" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Bring off/ })).toBeTruthy();
    expect(screen.getByText(/Substitutions used: 5\/5/)).toBeTruthy();
    expect(screen.getByText("Cap reached")).toBeTruthy();

    keyDown("Enter", {}, "Enter");
    await waitFor(() => expect(screen.queryByText("Paused — awaiting decision")).toBeNull());
    expect(screen.getByText("Live")).toBeTruthy();
  }, 10_000);
});
