import { describe, expect, it } from "vitest";
import { ALL_ACTIONS } from "../../../src/renderer/actions/allActions.js";
import {
  actionsInTiers,
  activeSet,
  isCareerScreen,
  isInsideCareer,
} from "../../../src/renderer/actions/registry.js";
import { type ScopeState } from "../../../src/renderer/actions/types.js";

/**
 * Mirror of the club-staff scope spec for the new any-club squad surface: the club segment hangs
 * off the save rather than off a career screen, so a club-scoped route has no parent id to
 * inherit. These assert the registry and the spine agree for `clubSquad` exactly as they must.
 */

/** A career mid-flight: the season can advance and no match is in progress. */
const readyState: ScopeState = { ready: true, phase: "pre_season" } as ScopeState;

describe("the any-club squad is inside the career without being a career screen", () => {
  it("is inside the career, but is not one of the nine", () => {
    expect(isInsideCareer("clubSquad")).toBe(true);
    expect(isCareerScreen("clubSquad")).toBe(false);
  });

  it("every career-global action the spine can dispatch on it is one the registry reports active", () => {
    const active = new Set(activeSet(ALL_ACTIONS, "clubSquad", readyState).map((a) => a.id));
    const bindable = actionsInTiers(ALL_ACTIONS, "clubSquad").filter(
      (action) => action.scope === "career-global",
    );

    expect(bindable.length).toBeGreaterThan(0);
    for (const action of bindable) {
      if (action.available(readyState)) expect(active.has(action.id)).toBe(true);
    }
  });

  it("go-back is available on it, so `g b` works by availability, not bypass", () => {
    const active = activeSet(ALL_ACTIONS, "clubSquad", readyState);
    expect(active.map((action) => action.id)).toContain("go-back");
  });

  it("offers it exactly the career-globals a career screen gets", () => {
    const idsOn = (screen: "clubSquad" | "league") =>
      activeSet(ALL_ACTIONS, screen, readyState)
        .filter((action) => action.scope === "career-global")
        .map((action) => action.id)
        .sort();

    expect(idsOn("clubSquad")).toEqual(idsOn("league"));
    expect(idsOn("clubSquad").length).toBeGreaterThan(0);
  });
});