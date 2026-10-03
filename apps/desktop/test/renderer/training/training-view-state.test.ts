import { describe, expect, it } from "vitest";
import {
  TRAINING_VIEW_STATES,
  trainingViewState,
} from "../../../src/renderer/training/trainingViewState.js";

describe("ticket 04 — exactly three view states for the Training screen", () => {
  it("the state space is exactly loading, ready, error", () => {
    expect([...TRAINING_VIEW_STATES]).toEqual(["loading", "ready", "error"]);
  });

  it("maps the read directly: Initial → loading, Failure → error, Success → ready", () => {
    expect(trainingViewState({ _tag: "Initial" })).toBe("loading");
    expect(trainingViewState({ _tag: "Failure" })).toBe("error");
    expect(trainingViewState({ _tag: "Success" })).toBe("ready");
  });

  it("has no state the one read cannot produce: every tag maps, and only into the three", () => {
    const states = (["Initial", "Failure", "Success"] as const).map((tag) =>
      trainingViewState({ _tag: tag }),
    );
    expect(new Set(states)).toEqual(new Set(TRAINING_VIEW_STATES));
  });
});