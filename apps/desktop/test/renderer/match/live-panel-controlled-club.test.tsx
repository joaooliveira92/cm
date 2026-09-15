// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { clearActiveMatch, getLiveTactic } from "../../../src/renderer/match/session.js";
import { dispatchAction, resetActionHandlers } from "../../../src/renderer/actions/dispatch.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";
import {
  noSubs,
  rid,
  resumeView,
  session,
  type CommandResponder,
  mountMatchDayWithSpine,
  openPanel,
} from "./liveMatchDayHarness.js";

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

describe("ticket 12 — the panel commands the controlled club, and records only what the match took", () => {
  it("an away match sends every command with the away club's id", async () => {
    const submissions = await mountMatchDayWithSpine(session({ isHome: false }));
    openPanel();
    fireEvent.click(screen.getByRole("button", { name: "Apply tactics change" }));
    await waitFor(() => expect(submissions.calls).toHaveLength(1));
    act(() => void dispatchAction("set-live-substitute-off", { playerId: rid("on-2") }));
    act(() => void dispatchAction("set-live-substitute-in", { playerId: rid("bench-2") }));
    act(() => void dispatchAction("make-substitution"));

    await waitFor(() => expect(submissions.calls).toHaveLength(2));
    expect(submissions.calls.map((call) => (call.payload.command as { clubId: string }).clubId)).toEqual(["away", "away"]);
    // The away side's count is the one that confirms the substitution.
    await waitFor(() => expect(getLiveTactic(rid("s1"))?.slots[2]?.playerId).toBe("bench-2"));
  });

  it("a substitution the match did not take leaves the shared line-up alone", async () => {
    const refuses: CommandResponder = () => ({ _tag: "Success", value: resumeView() });
    const submissions = await mountMatchDayWithSpine(session(), undefined, refuses);
    openPanel();
    act(() => void dispatchAction("set-live-substitute-off", { playerId: rid("on-2") }));
    act(() => void dispatchAction("set-live-substitute-in", { playerId: rid("bench-2") }));
    act(() => void dispatchAction("make-substitution"));

    await waitFor(() => expect(submissions.calls).toHaveLength(1));
    expect(await screen.findByText(/^Rejected — /)).toBeTruthy();
    expect(getLiveTactic(rid("s1"))).toBeNull();
  });

  it("a refused tactics change is not recorded", async () => {
    const refused: CommandResponder = () => ({ _tag: "Failure", error: { _tag: "MatchNotFoundError", matchId: "m1" } });
    const submissions = await mountMatchDayWithSpine(session(), undefined, refused);
    openPanel();
    fireEvent.click(screen.getByRole("button", { name: "Apply tactics change" }));

    await waitFor(() => expect(submissions.calls).toHaveLength(1));
    expect(await screen.findByText("Rejected — That match could not be found.")).toBeTruthy();
    expect(getLiveTactic(rid("s1"))).toBeNull();
  });

  it("a substitution records the applied tactic, not unapplied instruction edits", async () => {
    await mountMatchDayWithSpine(session());
    openPanel();
    act(() => void dispatchAction("set-live-mentality", { value: "attacking" }));
    act(() => void dispatchAction("set-live-substitute-off", { playerId: rid("on-2") }));
    act(() => void dispatchAction("set-live-substitute-in", { playerId: rid("bench-2") }));
    act(() => void dispatchAction("make-substitution"));

    await waitFor(() => expect(getLiveTactic(rid("s1"))?.slots[2]?.playerId).toBe("bench-2"));
    expect(getLiveTactic(rid("s1"))?.mentality).toBe("balanced");
  });

  it("a refused substitution after earlier ones is not read as applied", async () => {
    // Two substitutions were made before Match day mounted; the match refuses the panel's third.
    const earlier = { homeSubs: noSubs({ used: 2, windowsUsed: 2 }) };
    const refuses: CommandResponder = () => ({ _tag: "Success", value: resumeView(earlier) });
    const submissions = await mountMatchDayWithSpine(session(), undefined, refuses, earlier);
    openPanel();
    act(() => void dispatchAction("set-live-substitute-off", { playerId: rid("on-2") }));
    act(() => void dispatchAction("set-live-substitute-in", { playerId: rid("bench-2") }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Make substitution" }).hasAttribute("disabled")).toBe(false));
    act(() => void dispatchAction("make-substitution"));

    await waitFor(() => expect(submissions.calls).toHaveLength(1));
    expect(await screen.findByText(/^Rejected — /)).toBeTruthy();
    expect(getLiveTactic(rid("s1"))).toBeNull();
  });

  it("an away match reads the away head-count", async () => {
    const tenMen: CommandResponder = () => ({ _tag: "Success", value: resumeView({ homeOnPitchCount: 11, awayOnPitchCount: 10 }) });
    const submissions = await mountMatchDayWithSpine(session({ isHome: false }), undefined, tenMen);
    openPanel();
    fireEvent.click(screen.getByRole("button", { name: "Apply tactics change" }));

    await waitFor(() => expect(submissions.calls).toHaveLength(1));
    expect(await screen.findByText("Playing with 10 men")).toBeTruthy();
  });
});
