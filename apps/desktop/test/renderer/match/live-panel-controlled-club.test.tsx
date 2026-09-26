import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { clearActiveMatch, getLiveTactic } from "../../../src/renderer/match/session.js";
import { dispatchAction, resetActionHandlers } from "../../../src/renderer/actions/dispatch.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";
import {
  commandView,
  noSubs,
  rid,
  session,
  type CommandResponder,
  mountMatchDayWithSpine,
  openPanel,
  pitchView,
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
    const refuses: CommandResponder = () => ({ _tag: "Success", value: commandView(false) });
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
    const refuses: CommandResponder = () => ({ _tag: "Success", value: commandView(false, earlier) });
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

  it("a substitution the match took reads applied though re-simulation holds the count level", async () => {
    // A forced substitution counted before the command is re-simulated away by it: the count stays 1.
    const level = { homeSubs: noSubs({ used: 1, windowsUsed: 1 }) };
    const takesAndDropsForced: CommandResponder = () => ({ _tag: "Success", value: commandView(true, level) });
    const submissions = await mountMatchDayWithSpine(session(), undefined, takesAndDropsForced, level);
    openPanel();
    act(() => void dispatchAction("set-live-substitute-off", { playerId: rid("on-2") }));
    act(() => void dispatchAction("set-live-substitute-in", { playerId: rid("bench-2") }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Make substitution" }).hasAttribute("disabled")).toBe(false));
    act(() => void dispatchAction("make-substitution"));

    await waitFor(() => expect(submissions.calls).toHaveLength(1));
    expect(submissions.calls[0]!.payload).toMatchObject({ revealedEvents: 0 });
    await waitFor(() => expect(getLiveTactic(rid("s1"))?.slots[2]?.playerId).toBe("bench-2"));
  });

  it("the substitution draft lists the pitch the match reports, not the tactic", async () => {
    // on-2 was substituted for bench-1 and on-4 sent off; the tactic still names both.
    const reported = pitchView({ "on-2": "bench-1" }, ["bench-2"]);
    const polled = {
      homePitch: { ...reported, onPitch: reported.onPitch.filter((slot) => slot.playerId !== "on-4") },
      awayPitch: pitchView(),
    };
    await mountMatchDayWithSpine(session(), undefined, undefined, polled);
    openPanel();

    const optionsOf = async (name: string): Promise<ReadonlyArray<string>> => {
      fireEvent.click(screen.getByRole("combobox", { name }));
      const options = await screen.findAllByRole("option");
      const labels = options.map((option) => option.textContent ?? "").filter((label) => label !== "Select player");
      fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });
      await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
      return labels;
    };
    const off = await optionsOf("Player to bring off");
    expect(off).toHaveLength(10);
    expect(off.some((label) => label.startsWith("Bench1 Player"))).toBe(true);
    expect(off.some((label) => label.startsWith("On2 Player") || label.startsWith("On4 Player"))).toBe(false);
    expect(await optionsOf("Player to bring on")).toEqual(["Bench2 Player"]);
  });

  it("says the bench is empty when the match reports no substitute left, and offers no one on", async () => {
    // Ticket 35: bench-1 came on for on-2 and bench-2 was never named, so no one may come on.
    const polled = { homePitch: pitchView({ "on-2": "bench-1" }, []), awayPitch: pitchView() };
    await mountMatchDayWithSpine(session(), undefined, undefined, polled);
    openPanel();

    expect(await screen.findByText("No substitutes named or left on the bench.")).toBeTruthy();
    fireEvent.click(screen.getByRole("combobox", { name: "Player to bring on" }));
    const labels = (await screen.findAllByRole("option")).map((option) => option.textContent);
    expect(labels).toEqual(["Select player"]);
  });

  it("does not say the bench is empty while a substitute is left", async () => {
    await mountMatchDayWithSpine(session());
    openPanel();
    expect(await screen.findByRole("combobox", { name: "Player to bring on" })).toBeTruthy();
    expect(screen.queryByText("No substitutes named or left on the bench.")).toBeNull();
  });

  it("an away match reads the away head-count", async () => {
    const tenMen: CommandResponder = () => ({ _tag: "Success", value: commandView(null, { homeOnPitchCount: 11, awayOnPitchCount: 10 }) });
    const submissions = await mountMatchDayWithSpine(session({ isHome: false }), undefined, tenMen);
    openPanel();
    fireEvent.click(screen.getByRole("button", { name: "Apply tactics change" }));

    await waitFor(() => expect(submissions.calls).toHaveLength(1));
    expect(await screen.findByText("Playing with 10 men")).toBeTruthy();
  });
});
