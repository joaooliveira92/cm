import { beforeEach, describe, expect, it } from "vitest";
import {
  prefixReduce,
  IDLE_PREFIX,
  type PrefixState,
} from "../src/renderer/keymap/prefix.js";
import { prefixTimeoutMs, setPrefixTimeoutMs } from "../src/renderer/keymap/timeout.js";
import { G_PREFIX_COMPLETIONS } from "../src/renderer/actions/allActions.js";

const completions = new Set(["s", "a", "t", "l", "f", "m", "y"]);

describe("AC-18 — the g <key> prefix lifecycle", () => {
  it("pressing g alone only enters the prefix state, it does not navigate", () => {
    const step = prefixReduce(IDLE_PREFIX, { kind: "start", now: 0 }, completions);
    expect(step.outcome.kind).toBe("active");
    expect(step.state.active).toBe(true);
    expect(step.outcome.completion).toBeUndefined();
  });

  it("a valid destination key completes navigation", () => {
    const started = prefixReduce(IDLE_PREFIX, { kind: "start", now: 0 }, completions);
    const step = prefixReduce(
      started.state,
      { kind: "key", key: "s", now: 100 },
      completions,
    );
    expect(step.outcome).toEqual({ kind: "complete", completion: "s" });
    expect(step.state.active).toBe(false);
  });

  it("Escape cancels an incomplete prefix without navigating", () => {
    const started = prefixReduce(IDLE_PREFIX, { kind: "start", now: 0 }, completions);
    const step = prefixReduce(
      started.state,
      { kind: "key", key: "Escape", now: 10 },
      completions,
    );
    expect(step.outcome).toEqual({ kind: "cancel", reason: "escape" });
  });

  it("an invalid key cancels the prefix without firing an unrelated action", () => {
    const started = prefixReduce(IDLE_PREFIX, { kind: "start", now: 0 }, completions);
    const step = prefixReduce(started.state, { kind: "key", key: "x", now: 10 }, completions);
    expect(step.outcome).toEqual({ kind: "cancel", reason: "invalid" });
  });

  it("a timeout cancels the prefix", () => {
    const timeout = prefixTimeoutMs();
    const started = prefixReduce(IDLE_PREFIX, { kind: "start", now: 0 }, completions);
    const step = prefixReduce(
      started.state,
      { kind: "tick", now: timeout + 1 },
      completions,
    );
    expect(step.outcome).toEqual({ kind: "cancel", reason: "timeout" });
  });

  it("an incomplete prefix remains active short of the timeout", () => {
    const started = prefixReduce(IDLE_PREFIX, { kind: "start", now: 0 }, completions);
    const step = prefixReduce(started.state, { kind: "tick", now: 400 }, completions);
    expect(step.outcome).toEqual({ kind: "active" });
    expect(step.state.active).toBe(true);
  });

  it("a completion key past the timeout is treated as a timeout cancel, not a navigation", () => {
    const timeout = prefixTimeoutMs();
    const started = prefixReduce(IDLE_PREFIX, { kind: "start", now: 0 }, completions);
    const step = prefixReduce(
      started.state,
      { kind: "key", key: "s", now: timeout + 5 },
      completions,
    );
    expect(step.outcome.kind).toBe("cancel");
  });

  it("the timeout knob is tunable and observable (AC-07 tuning parameter)", () => {
    const prior = setPrefixTimeoutMs(500);
    try {
      expect(prefixTimeoutMs()).toBe(500);
    } finally {
      setPrefixTimeoutMs(prior);
    }
  });
});

describe("prefix state identity", () => {
  let state: PrefixState;
  beforeEach(() => {
    state = IDLE_PREFIX;
  });

  it("a keystroke while idle does nothing", () => {
    const step = prefixReduce(state, { kind: "key", key: "s", now: 0 }, completions);
    expect(step.outcome.kind).toBe("idle");
  });
});

describe("AC-18 — the live completion set (g b included)", () => {
  it("the registry-derived set covers all seven screens plus go-back's b", () => {
    expect(G_PREFIX_COMPLETIONS.has("b")).toBe(true);
    for (const key of ["s", "a", "t", "l", "f", "m", "y", "b"]) {
      expect(G_PREFIX_COMPLETIONS.has(key)).toBe(true);
    }
  });

  it("g then b completes navigation against the live set", () => {
    const started = prefixReduce(IDLE_PREFIX, { kind: "start", now: 0 }, G_PREFIX_COMPLETIONS);
    const step = prefixReduce(started.state, { kind: "key", key: "b", now: 10 }, G_PREFIX_COMPLETIONS);
    expect(step.outcome).toEqual({ kind: "complete", completion: "b" });
  });
});
