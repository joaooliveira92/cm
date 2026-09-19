import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { MatchId } from "@cm-clone/contracts";
import { clearActiveMatch, getLiveTactic, recordLiveTactic, setActiveMatch } from "../../../src/renderer/match/session.js";
import { dispatchAction, resetActionHandlers } from "../../../src/renderer/actions/dispatch.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";
import {
  rid,
  noSubs,
  fullTactic,
  orangeInjury,
  session,
  mountMatchDayWithSpine,
  keyDown,
  openPanel,
  panelContent,
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

describe("AC-33 — panel Escape semantics (open/closed/paused)", () => {
  it("Escape closes the open panel and the match feed keeps running", async () => {
    await mountMatchDayWithSpine(session());
    openPanel();
    expect(panelContent()).toBeTruthy();
    // Focus a control that Escape's close will unmount — close must hand focus
    // back to the toggle, never leave it on document.body.
    const inSelect = document.querySelector<HTMLSelectElement>(
      '[data-action-id="set-live-substitute-in"]',
    )!;
    inSelect.focus();
    keyDown("Escape", {}, "Escape");

    await waitFor(() => expect(panelContent()).toBeNull());
    // Feed continues: the match badge is Live, not Paused.
    expect(screen.getByText("Live")).toBeTruthy();
    // Focus returned to the toggle (never document.body).
    expect(document.activeElement?.getAttribute("data-action-id")).toBe("toggle-control-panel");
  });

  it("Escape with the panel closed is a no-op (feed continues)", async () => {
    await mountMatchDayWithSpine(session());
    expect(panelContent()).toBeNull();
    keyDown("Escape", {}, "Escape");
    expect(panelContent()).toBeNull();
    expect(screen.getByText("Live")).toBeTruthy();
  });
});

describe("AC-33 — injury decision flow: Play On (Enter) / Bring Off (B), Escape keeps the pause", () => {
  const capReached = noSubs({ used: 5, remaining: 0, capReached: true });
  const injuryLine = { minute: 23, tag: "Injury", text: "He is down." };
  const filler = (minute: number) => ({ minute, tag: "MatchStarted", text: "Play goes on." });
  /** The first poll brings an orange Injury to the controlled club, `before` lines ahead of its
   *  line, with no substitutions left; every later poll brings nothing new. */
  const injuryAfter = (before: number) => (call: number) =>
    call === 0
      ? {
          cursor: before + 1,
          homeSubs: capReached,
          lines: [...Array.from({ length: before }, (_, index) => filler(index + 1)), injuryLine],
          injuries: [orangeInjury()],
        }
      : { cursor: before + 1, homeSubs: capReached };
  const mountPaused = () => mountMatchDayWithSpine(session(), undefined, undefined, injuryAfter(0));

  it("an Injury still in the buffer neither pauses nor prompts; its reveal does both", async () => {
    await mountMatchDayWithSpine(session(), undefined, undefined, injuryAfter(4));
    expect(screen.getByText("Live")).toBeTruthy();
    expect(screen.queryByText("Knock — sub or play on")).toBeNull();
    expect(panelContent()).toBeNull();

    await screen.findByText("Paused — awaiting decision", {}, { timeout: 4000 });
    expect(screen.getByText("Knock — sub or play on")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Play on" })).toBeTruthy();
  }, 10_000);

  it("an orange no-subs injury pauses the feed and auto-opens the panel with the decision modal", async () => {
    await mountPaused();
    await screen.findByText("Paused — awaiting decision");
    expect(screen.getByRole("button", { name: "Play on" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Bring off/ })).toBeTruthy();
  });

  it("Enter triggers Play On — the pause clears, the match resumes", async () => {
    const submissions = await mountPaused();
    await screen.findByText("Paused — awaiting decision");
    keyDown("Enter", {}, "Enter");

    await waitFor(() => expect(screen.queryByText("Paused — awaiting decision")).toBeNull());
    expect(screen.getByText("Live")).toBeTruthy();
    // No command leaves the renderer for Play On — it is a local
    // acknowledgement: submitMatchCommand is never called. The B-path test
    // above proves the same helper DOES record a call when a command
    // legitimately goes out, so a zero-count here is a real negative.
    expect(submissions.calls.length).toBe(0);
  });

  it("B triggers Bring Off — a ForceOff command is submitted and the pause clears", async () => {
    const submissions = await mountPaused();
    await screen.findByText("Paused — awaiting decision");
    keyDown("b", {}, "KeyB");

    await waitFor(() => expect(submissions.calls.length).toBeGreaterThan(0));
    const call = submissions.calls[0]!;
    expect(call.method).toBe("submitMatchCommand");
    expect((call.payload.command as { _tag: string })._tag).toBe("ForceOff");
    expect((call.payload.command as { playerId: string }).playerId).toBe(String(rid("on-5")));
    await waitFor(() => expect(screen.getByText("Live")).toBeTruthy());
  });

  it("Escape closes the panel and the injury modal but the match STAYS paused (deliberation)", async () => {
    await mountPaused();
    await screen.findByText("Paused — awaiting decision");
    keyDown("Escape", {}, "Escape");

    await waitFor(() => expect(panelContent()).toBeNull());
    expect(screen.queryByRole("button", { name: "Play on" })).toBeNull();
    // Not resumed: the paused badge persists (the revealed injury is untouched).
    expect(screen.getByText("Paused — awaiting decision")).toBeTruthy();
  });

  it("B with the panel closed does nothing (panel-scoped bindings are open-only)", async () => {
    const submissions = await mountPaused();
    await screen.findByText("Paused — awaiting decision");
    keyDown("Escape", {}, "Escape"); // close panel, match stays paused
    await waitFor(() => expect(panelContent()).toBeNull());
    keyDown("b", {}, "KeyB"); // panel is closed → no bring-off
    expect(submissions.calls.length).toBe(0);
    expect(screen.getByText("Paused — awaiting decision")).toBeTruthy();
  });
  it("a second Injury re-opens the panel the manager closed after the first", async () => {
    const second = { ...orangeInjury(), minute: 30, playerId: rid("on-6") };
    const lines = [injuryLine, ...Array.from({ length: 6 }, (_, index) => filler(24 + index)), { ...injuryLine, minute: 30 }];
    await mountMatchDayWithSpine(session(), undefined, undefined, (call) =>
      call === 0 ? { cursor: lines.length, lines, injuries: [orangeInjury(), second] } : { cursor: lines.length },
    );
    await waitFor(() => expect(panelContent()).toBeTruthy(), { timeout: 2000 });
    keyDown("Escape", {}, "Escape");
    await waitFor(() => expect(panelContent()).toBeNull());

    await waitFor(() => expect(panelContent()).toBeTruthy(), { timeout: 4000 });
  }, 10_000);

  it("a severe Injury with substitutions left does not tell the manager there are none", async () => {
    const severe = { ...orangeInjury(), severity: "severe", tier: "red" };
    await mountMatchDayWithSpine(session(), undefined, undefined, (call) =>
      call === 0 ? { cursor: 1, lines: [injuryLine], injuries: [severe] } : { cursor: 1 },
    );
    await screen.findByText("A severe injury has forced a player off.", {}, { timeout: 2000 });
    expect(screen.queryByText(/No subs left/)).toBeNull();
  });

  it("a severe Injury at the cap tells the manager to rearrange", async () => {
    const severe = { ...orangeInjury(), severity: "severe", tier: "red" };
    await mountMatchDayWithSpine(session(), undefined, undefined, (call) =>
      call === 0
        ? { cursor: 1, homeSubs: capReached, lines: [injuryLine], injuries: [severe] }
        : { cursor: 1, homeSubs: capReached },
    );
    await screen.findByText(/No subs left/, {}, { timeout: 2000 });
  });
});

describe("AC-33 — two-step substitution by keyboard (Enter confirms, Escape aborts + closes)", () => {
  it("Enter confirms a complete out/in draft as a MakeSubstitution command", async () => {
    const submissions = await mountMatchDayWithSpine(session());
    openPanel();

    expect(
      document.querySelector<HTMLSelectElement>('[data-action-id="set-live-substitute-off"]'),
    ).not.toBeNull();
    expect(
      document.querySelector<HTMLSelectElement>('[data-action-id="set-live-substitute-in"]'),
    ).not.toBeNull();
    // Each dispatch re-renders first, so the submit handler reads both picks.
    await act(async () => {
      dispatchAction("set-live-substitute-off", { playerId: rid("on-0") });
    });
    await act(async () => {
      dispatchAction("set-live-substitute-in", { playerId: rid("bench-1") });
    });
    // The draft is complete → Enter (not over a native clickable) confirms.
    keyDown("Enter", {}, "Enter");

    await waitFor(() => expect(submissions.calls.length).toBe(1));
    const call = submissions.calls[0]!;
    expect((call.payload.command as { _tag: string })._tag).toBe("MakeSubstitution");
    expect(call.payload.command).toMatchObject({
      _tag: "MakeSubstitution",
      outPlayerId: String(rid("on-0")),
      inPlayerId: String(rid("bench-1")),
    });
    // The optimistic local swap cleared the draft selectors for the next sub.
    const outAfter = () =>
      (document.querySelector('[data-action-id="set-live-substitute-off"]') as HTMLSelectElement)
        .value;
    await waitFor(() => expect(outAfter()).toBe(""));
  }, 10_000);

  it("Enter over a native clickable control leaves the clickable in charge (AC-19), not the confirm", async () => {
    const submissions = await mountMatchDayWithSpine(session());
    openPanel();
    const outSelect = document.querySelector<HTMLSelectElement>(
      '[data-action-id="set-live-substitute-off"]',
    )!;
    const inSelect = document.querySelector<HTMLSelectElement>(
      '[data-action-id="set-live-substitute-in"]',
    )!;
    act(() => {
      fireEvent.change(outSelect, { target: { value: String(rid("on-0")) } });
      fireEvent.change(inSelect, { target: { value: String(rid("bench-1")) } });
    });
    const apply = screen.getByRole("button", { name: "Apply tactics change" });
    apply.focus();
    // A focused native control owns Enter: the seam confirm must not fire.
    act(() => fireEvent.keyDown(apply, { key: "Enter", bubbles: true }));
    expect(submissions.calls.length).toBe(0);
  });

  it("a same-player draft is rejected with a visible reason, never silently submitted", async () => {
    const submissions = await mountMatchDayWithSpine(session());
    openPanel();
    // Each dispatch re-renders first, so the submit handler reads both picks.
    await act(async () => {
      dispatchAction("set-live-substitute-off", { playerId: rid("on-0") });
    });
    await act(async () => {
      dispatchAction("set-live-substitute-in", { playerId: rid("on-0") });
    });
    await act(async () => {
      dispatchAction("make-substitution");
    });
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "The player coming on must be a different player",
      ),
    );
    expect(submissions.calls.length).toBe(0);
  });

  it("Escape aborts the in-progress two-step selection and closes the panel", async () => {
    await mountMatchDayWithSpine(session());
    openPanel();
    const outSelect = document.querySelector<HTMLSelectElement>(
      '[data-action-id="set-live-substitute-off"]',
    )!;
    act(() => {
      fireEvent.change(outSelect, { target: { value: String(rid("on-0")) } });
    });
    keyDown("Escape", {}, "Escape");
    await waitFor(() => expect(panelContent()).toBeNull());
    // Reopen: the draft was aborted, so no out player stays selected.
    openPanel();
    await waitFor(() =>
      expect(
        (document.querySelector('[data-action-id="set-live-substitute-off"]') as HTMLSelectElement).value,
      ).toBe(""),
    );
  });

  it("the substitution controls are disabled when the server reports the cap reached", async () => {
    await mountMatchDayWithSpine(session(), undefined, undefined, {
      homeSubs: noSubs({ used: 5, remaining: 0, capReached: true }),
    });
    openPanel();
    const select = (actionId: string) =>
      document.querySelector<HTMLSelectElement>(`[data-action-id="${actionId}"]`)!;
    // The counts arrive with the first poll, not with the restored session.
    await waitFor(() => expect(select("set-live-substitute-off").disabled).toBe(true));
    expect(select("set-live-substitute-in").disabled).toBe(true);
  });
});

describe("AC-33 — live tactics arrow toggles and Tab cycling", () => {
  it("ArrowRight/ArrowLeft toggle the focused instruction and move the roving tab stop", async () => {
    await mountMatchDayWithSpine(session());
    openPanel();
    const mentality = screen.getByRole("group", { name: "Mentality" });
    const attacking = within(mentality).getByRole("button", { name: "attacking" });
    const balanced = within(mentality).getByRole("button", { name: "balanced" });
    expect(balanced.getAttribute("aria-pressed")).toBe("true");

    balanced.focus();
    act(() => fireEvent.keyDown(mentality, { key: "ArrowRight", bubbles: true }));
    await waitFor(() => expect(attacking.getAttribute("aria-pressed")).toBe("true"));
    expect(balanced.getAttribute("aria-pressed")).toBe("false");
    expect(document.activeElement).toBe(attacking);

    act(() => fireEvent.keyDown(mentality, { key: "ArrowLeft", bubbles: true }));
    await waitFor(() => expect(balanced.getAttribute("aria-pressed")).toBe("true"));
    expect(document.activeElement).toBe(balanced);
  });

  it("each instruction keeps exactly one tab stop, in group order (Tab cycles Mentality → Tempo → Pressing)", async () => {
    await mountMatchDayWithSpine(session());
    openPanel();
    for (const name of ["Mentality", "Tempo", "Pressing"]) {
      const group = screen.getByRole("group", { name });
      const stops = within(group)
        .getAllByRole("button")
        .filter((b) => b.getAttribute("tabindex") === "0");
      expect(stops.length, `${name} must expose one tab stop`).toBe(1);
    }
    // The three groups appear in tab order: Mentality before Tempo before Pressing.
    const docOrder = [...document.querySelectorAll('[role="group"][aria-label]')];
    expect(docOrder.map((g) => g.getAttribute("aria-label"))).toEqual([
      "Mentality",
      "Tempo",
      "Pressing",
    ]);
  });
});

describe("AC-33 — the panel layer composes with splash/palette/help Escape stacking", () => {
  it("Primary+K still opens the palette while the panel is open; Escape closes the palette only", async () => {
    await mountMatchDayWithSpine(session());
    openPanel();
    expect(panelContent()).toBeTruthy();

    keyDown("k", { ctrlKey: true }, "KeyK");
    expect(screen.getByRole("dialog", { name: "Command palette" })).toBeTruthy();

    // Escape closes the topmost layer (the palette) — the panel stays open.
    keyDown("Escape", {}, "Escape");
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Command palette" })).toBeNull(),
    );
    expect(panelContent()).toBeTruthy();

    // A second Escape now owns the panel.
    keyDown("Escape", {}, "Escape");
    await waitFor(() => expect(panelContent()).toBeNull());
  });

  it("the g prefix is suppressed while the panel is open, and live again after it closes", async () => {
    await mountMatchDayWithSpine(session());
    openPanel();
    keyDown("g", {}, "KeyG");
    expect(screen.queryByText("Go to:")).toBeNull();

    keyDown("Escape", {}, "Escape");
    await waitFor(() => expect(panelContent()).toBeNull());
    keyDown("g", {}, "KeyG");
    expect(screen.getByText("Go to:")).toBeTruthy();
  });
});
describe("Screen 97 — the panel and the standalone screens share one live line-up", () => {
  it("drafts a tactics change from the line-up a standalone substitution left, not the pre-match one", async () => {
    const substituted = fullTactic();
    const slots = substituted.slots.map((slot, index) => (index === 3 ? { ...slot, playerId: rid("bench-1") } : slot));
    setActiveMatch(session() as never);
    recordLiveTactic(rid("s1"), MatchId.make("m1"), { ...substituted, slots } as never);

    const submissions = await mountMatchDayWithSpine(session());
    openPanel();
    fireEvent.click(screen.getByRole("button", { name: "Apply tactics change" }));

    await waitFor(() => expect(submissions.calls).toHaveLength(1));
    const command = submissions.calls[0]!.payload.command as { tactic: { slots: Array<{ playerId: string }> } };
    expect(command.tactic.slots[3]!.playerId).toBe("bench-1");
    expect(command.tactic.slots.some((slot) => slot.playerId === "on-3")).toBe(false);
  });

  it("records a panel substitution so the standalone screens start from it", async () => {
    const submissions = await mountMatchDayWithSpine(session());
    openPanel();
    act(() => void dispatchAction("set-live-substitute-off", { playerId: rid("on-2") }));
    act(() => void dispatchAction("set-live-substitute-in", { playerId: rid("bench-2") }));
    act(() => void dispatchAction("make-substitution"));

    await waitFor(() => expect(submissions.calls).toHaveLength(1));
    await waitFor(() => expect(getLiveTactic(rid("s1"))?.slots[2]?.playerId).toBe("bench-2"));
  });
});
