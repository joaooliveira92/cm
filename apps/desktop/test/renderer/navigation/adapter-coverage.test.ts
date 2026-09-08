import { describe, expect, it, vi } from "vitest";
import {
  ClubId as ClubIdSchema,
  SaveId as SaveIdSchema,
  type ClubId,
  type SaveId,
} from "@cm-clone/contracts";
import { bindRouter, navigate } from "../../../src/renderer/navigation/adapter.js";
import {
  CAREER_SCREEN_TYPES,
  careerDestination,
  resolveDestination,
  type NavigationDestination,
} from "../../../src/renderer/navigation/destinations.js";

const save = (id: string): SaveId => SaveIdSchema.make(id);
const club = (id: string): ClubId => ClubIdSchema.make(id);

/** A router stand-in that records what the adapter asked for. */
const spyRouter = () => {
  const navigateSpy = vi.fn();
  bindRouter({
    navigate: navigateSpy,
    history: { back: () => undefined, forward: () => undefined, canGoBack: () => false },
  } as never);
  return navigateSpy;
};

/**
 * Every destination the app can build, so the sweep below is over the real set rather than a
 * hand-kept copy of it. The two club-scoped drill-downs need a target club; everything else is
 * reachable from a bare type plus the save.
 */
const ALL_DESTINATIONS: ReadonlyArray<NavigationDestination> = [
  { type: "mainMenu" },
  { type: "loadCareer" },
  { type: "createLeagues" },
  { type: "createStep1" },
  { type: "createStep2" },
  { type: "createStep3" },
  ...CAREER_SCREEN_TYPES.map((type) => careerDestination(type, save("save-1"))),
  careerDestination("tacticsEditor", save("save-1")),
  { type: "teamScoutReport", saveId: save("save-1"), clubId: club("club-7") },
  { type: "clubStaff", saveId: save("save-1"), clubId: club("club-7") },
];

describe("the navigation adapter reaches the router for every destination", () => {
  /**
   * The News Inbox regression. `resolveDestination` mapped news to its route all along; the
   * adapter's switch had no arm for that route and no `default`, so the call fell through and
   * returned silently. Clicking Inbox left the previous screen on screen with no error anywhere.
   */
  it("navigates to the News Inbox", () => {
    const navigateSpy = spyRouter();
    navigate({ type: "news", saveId: save("save-1") });
    expect(navigateSpy).toHaveBeenCalledWith({
      to: "/career/$saveId/news",
      params: { saveId: save("save-1") },
    });
  });

  /**
   * The bug's class, not just its instance. A silent fall-through is invisible per-route: the arm
   * for news went missing exactly the way the next one will, and only a sweep over the whole
   * destination set catches that. Asserting against `resolveDestination` keeps the two switches
   * honest to each other rather than to a third list that can drift from both.
   */
  it.each(ALL_DESTINATIONS.map((d) => [d.type, d] as const))(
    "reaches the router for %s",
    (_type, destination) => {
      const navigateSpy = spyRouter();
      navigate(destination);
      const resolved = resolveDestination(destination);
      expect(navigateSpy).toHaveBeenCalledTimes(1);
      expect(navigateSpy.mock.calls[0]?.[0]).toMatchObject({ to: resolved.to });
    },
  );
});
