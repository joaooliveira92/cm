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
 * The club segment hangs off the save rather than off a career screen, so — unlike the tactics
 * editor, which registers as `tactics` and is a career screen by construction — a club-scoped
 * route has no parent id to inherit. It used to answer `club`, which `isCareerScreen` rejects,
 * while the spine registered the career-global handlers there anyway. The registry and the
 * behaviour disagreed: the palette and help overlay listed none of those actions, and `g b` fired
 * only because prefix completion dispatches without consulting availability.
 *
 * These assert the agreement, not the keypress. `club-staff-keyboard.test.tsx` covers the
 * keystroke end to end; if a future availability check lands on prefix completion, that spec keeps
 * passing only because these hold.
 */

/** A career mid-flight: the season can advance and no match is in progress. */
const readyState: ScopeState = { ready: true, phase: "pre_season" } as ScopeState;

describe("club-scoped screens are inside the career without being career screens", () => {
  it.each(["clubStaff", "teamScoutReport"] as const)(
    "%s is inside the career, but is not one of the nine",
    (screen) => {
      expect(isInsideCareer(screen)).toBe(true);
      // Still not a career screen: no `g` binding targets it and it owns no screen-scoped action.
      expect(isCareerScreen(screen)).toBe(false);
    },
  );

  it.each(["clubStaff", "teamScoutReport"] as const)(
    "every career-global action the spine can dispatch on %s is one the registry reports active",
    (screen) => {
      const active = new Set(activeSet(ALL_ACTIONS, screen, readyState).map((a) => a.id));
      const bindable = actionsInTiers(ALL_ACTIONS, screen).filter(
        (action) => action.scope === "career-global",
      );

      expect(bindable.length).toBeGreaterThan(0);
      for (const action of bindable) {
        // `available` is the predicate prefix completion would consult if it ever did; the tier
        // membership is what the spine binds on. They must not disagree.
        if (action.available(readyState)) expect(active.has(action.id)).toBe(true);
      }
    },
  );

  it("go-back is available on a club-scoped screen, so `g b` works by availability, not bypass", () => {
    const active = activeSet(ALL_ACTIONS, "clubStaff", readyState);
    expect(active.map((action) => action.id)).toContain("go-back");
  });

  it("offers a club-scoped screen exactly the career-globals a career screen gets", () => {
    // Not a hand-listed set: the club drill-down inherits whatever the career-global tier holds,
    // so an action added there later is covered without touching this spec.
    const idsOn = (screen: "clubStaff" | "league") =>
      activeSet(ALL_ACTIONS, screen, readyState)
        .filter((action) => action.scope === "career-global")
        .map((action) => action.id)
        .sort();

    expect(idsOn("clubStaff")).toEqual(idsOn("league"));
    expect(idsOn("clubStaff").length).toBeGreaterThan(0);
  });
});
