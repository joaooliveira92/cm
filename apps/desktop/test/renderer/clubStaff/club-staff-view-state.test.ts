import { describe, expect, it } from "vitest";
import {
  CLUB_STAFF_VIEW_STATES,
  clubStaffViewState,
} from "../../../src/renderer/clubStaff/clubStaffViewState.js";

describe("ticket 04 — exactly three view states, none left as a hook", () => {
  it("the state space is exactly loading, ready, error", () => {
    expect([...CLUB_STAFF_VIEW_STATES]).toEqual(["loading", "ready", "error"]);
  });

  it("maps the club staff read directly: Initial → loading, Failure → error, Success → ready", () => {
    expect(clubStaffViewState({ _tag: "Initial" })).toBe("loading");
    expect(clubStaffViewState({ _tag: "Failure" })).toBe("error");
    expect(clubStaffViewState({ _tag: "Success" })).toBe("ready");
  });

  it("has no state the one read cannot produce: every tag maps, and only into the three", () => {
    const states = (["Initial", "Failure", "Success"] as const).map((tag) =>
      clubStaffViewState({ _tag: tag }),
    );
    expect(new Set(states)).toEqual(new Set(CLUB_STAFF_VIEW_STATES));
  });
});
