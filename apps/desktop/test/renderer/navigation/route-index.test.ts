import { describe, expect, it } from "vitest";
import { SaveId } from "@cm-clone/contracts";
import { ALL_ACTIONS } from "../../../src/renderer/actions/allActions.js";
import { navKeyByDestinationOf } from "../../../src/renderer/actions/overrides.js";
import {
  CAREER_SCREEN_TYPES,
  careerDestination,
  resolveDestination,
  type SaveScopedCareerDestinationType,
} from "../../../src/renderer/navigation/destinations.js";
import { NAV_SECTIONS } from "../../../src/renderer/navigation/nav-config.js";
import {
  itemCarriesHint,
  sectionCarriesHint,
  sectionIdForDestination,
} from "../../../src/renderer/navigation/nav-route-index.js";
import { router as appRouter } from "../../../src/renderer/router/index.js";

/** Every destination the navbar can reach: each section's default plus every item it lists. */
const reachableFromNavbar = (): ReadonlySet<SaveScopedCareerDestinationType> => {
  const reached = new Set<SaveScopedCareerDestinationType>();
  for (const section of NAV_SECTIONS) {
    reached.add(section.defaultDestination);
    for (const item of section.items) reached.add(item.destination);
  }
  return reached;
};

describe("nav route index (spec §6 rule 1 & §8)", () => {
  it("maps every career destination to its owning section", () => {
    expect(sectionIdForDestination("squad")).toBe("squad");
    expect(sectionIdForDestination("tactics")).toBe("tactics");
    expect(sectionIdForDestination("transfers")).toBe("recruitment");
    expect(sectionIdForDestination("league")).toBe("analysis");
    expect(sectionIdForDestination("fixtures")).toBe("analysis");
    expect(sectionIdForDestination("match")).toBe("analysis");
    expect(sectionIdForDestination("seasonSummary")).toBe("analysis");
    expect(sectionIdForDestination("manager")).toBe("club");
    expect(sectionIdForDestination("news")).toBe("news");
  });

  /**
   * Two directions of "the navbar covers the career screens", each derived from the code that
   * defines its side. This case used to compare the reached set against a frozen literal, which
   * meant every new screen turned it red whether it had been wired correctly or not — three
   * changes in a row shipped past it.
   *
   * What is enforced, precisely: a screen listed in `CAREER_SCREEN_TYPES` must have a navbar home,
   * and a navbar entry must resolve to a path the router registers. Adding a destination needs no
   * edit here.
   *
   * What is **not** enforced here: that a new top-level screen was added to `CAREER_SCREEN_TYPES`
   * at all. Omit it and this case passes vacuously, because the array it filters is the thing that
   * shrank. That gap is closed one layer up, at the type level, by the exhaustive classification in
   * `test/renderer/career-destination-classification.ts` — a new `CareerDestination` member must be
   * listed there as a sub-surface or in `CAREER_SCREEN_TYPES`, or `pnpm -r typecheck` fails.
   *
   * The reverse direction — every registered career route appears in the navbar — is false by
   * design and deliberately absent: the save route registers sub-surfaces (the `match-*`
   * screens) at the same depth as top-level screens, so router
   * shape cannot tell them apart. Containment is the whole rule, and
   * `test/renderer/router/stage2.test.ts` now agrees; it used to assert the stronger equality,
   * which the navbar's six sub-surface items make false.
   */
  it("every persistent career screen has a home in some navbar section", () => {
    const reached = reachableFromNavbar();
    const unreachable = CAREER_SCREEN_TYPES.filter((type) => !reached.has(type));
    expect(unreachable).toEqual([]);
  });

  /**
   * The direction `stage2.test.ts` used to carry as an equality against `CAREER_SCREEN_TYPES`:
   * the navbar links nothing unexpected. The equality itself was false — the navbar deliberately
   * lists six sub-surfaces as items — so it is restated here as "top-level screens, plus exactly
   * these six, and nothing else".
   *
   * The six are named rather than derived on purpose. Asserting only "is classified somewhere"
   * would be vacuous: the classification is total by construction, so every destination satisfies
   * it and the case could never fail. Naming them means a *seventh* navbar sub-surface has to be
   * added here deliberately, which is the edit that should be hard. `contractExpiry` and
   * `budgetReview` were that edit, made by group-j ticket 08 to match `transferHistory`.
   *
   * This list is expected to empty out rather than grow. Whether these six are really sub-surfaces
   * at all is
   * `.scratch/desktop-suite-red/decision-request-01-what-makes-a-career-destination-top-level.md`;
   * under its recommended answer they become top-level and this exception set goes away.
   */
  const NAVBAR_SUB_SURFACES: ReadonlySet<string> = new Set([
    "transferHistory",
    "contractExpiry",
    "budgetReview",
    "scoutingAssignment",
    "scoutingKnowledge",
    "trainingCoaching",
  ]);

  it("the navbar links top-level screens, plus only the six sanctioned sub-surfaces", () => {
    const topLevel: ReadonlyArray<string> = CAREER_SCREEN_TYPES;
    const unexpected = [...reachableFromNavbar()].filter(
      (type) => !topLevel.includes(type) && !NAVBAR_SUB_SURFACES.has(type),
    );
    expect(unexpected).toEqual([]);
    // Every exception is real: an entry here that the navbar stopped linking is dead weight.
    expect(
      [...NAVBAR_SUB_SURFACES].filter((type) => !reachableFromNavbar().has(type as never)),
    ).toEqual([]);
  });

  it("every navbar destination points at a route the app router registers", () => {
    const registered = new Set(Object.keys(appRouter.routesByPath));
    const saveId = SaveId.make("s1");
    const dead = [...reachableFromNavbar()].filter(
      (type) => !registered.has(resolveDestination(careerDestination(type, saveId)).to),
    );
    expect(dead).toEqual([]);
  });

  it("every section has a stable unique id", () => {
    const ids = NAV_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every item id is unique across all sections", () => {
    const ids = NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  /**
   * Every g-destination's hint appears on every navbar control that routes to it.
   * The ShortcutHint component handles duplicate keys gracefully (same key, same action),
   * and this makes the shortcut plan predictable: every navigable item shows its key.
   */
  it("every g-destination appears on at least one navbar control", () => {
    const hinted: Array<string> = [];
    for (const section of NAV_SECTIONS) {
      if (sectionCarriesHint(section)) hinted.push(section.defaultDestination);
      for (const item of section.items) {
        if (itemCarriesHint(section, item)) hinted.push(item.destination);
      }
    }
    const withKeys = hinted.filter((destination) => navKeyByDestinationOf(ALL_ACTIONS).has(destination));
    expect([...new Set(withKeys)].sort()).toEqual([...navKeyByDestinationOf(ALL_ACTIONS).keys()].sort());
  });
});
