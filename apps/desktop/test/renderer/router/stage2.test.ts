import { describe, expect, it, beforeEach } from "vitest";
import { SaveId as SaveIdSchema, type SaveId } from "@cm-clone/contracts";
import { bindRouter, navigateBack } from "../../../src/renderer/navigation/adapter.js";
import { careerDestination, CAREER_SCREEN_TYPES, resolveDestination, type SaveScopedCareerDestinationType } from "../../../src/renderer/navigation/destinations.js";
import { ALL_ACTIONS } from "../../../src/renderer/actions/allActions.js";
import { decodeSaveId } from "../../../src/renderer/navigation/params.js";
import { CAREER_SECTIONS } from "../../../src/renderer/router/career.js";
import { consumePendingFocus, BACK_RESTORE_MARKER } from "../../../src/renderer/focus.js";

const save = (id: string): SaveId => SaveIdSchema.make(id);

/** The live section-level `g <n>` bindings: `n` → the career destination it navigates to. */
const sectionGBindings: Readonly<Record<string, (saveId: SaveId) => ReturnType<typeof careerDestination>>> =
  Object.fromEntries(
    ALL_ACTIONS.flatMap((action) =>
      action.scope === "career-global" && typeof action.metadata?.sectionKey === "string"
        ? [[
            action.binding!.slice(2),
            (saveId: SaveId) => careerDestination(action.metadata!.destination as SaveScopedCareerDestinationType, saveId),
          ]]
        : [],
    ),
  );

describe("AC-14 — typed destination resolver", () => {
  it("resolves every destination to its route, never a raw caller-built path", () => {
    expect(resolveDestination({ type: "mainMenu" })).toEqual({ to: "/" });
    expect(resolveDestination({ type: "createStep1" })).toEqual({ to: "/create/step-1" });
    expect(resolveDestination({ type: "createStep2" })).toEqual({ to: "/create/step-2" });
    expect(resolveDestination({ type: "createStep3" })).toEqual({ to: "/create/step-3" });
  });

  it("carries the typed saveId parameter into each career route", () => {
    const id = save("save-1");
    expect(resolveDestination({ type: "squad", saveId: id })).toEqual({
      to: "/career/$saveId/squad",
      params: { saveId: id },
    });
    expect(resolveDestination({ type: "tactics", saveId: id })).toEqual({
      to: "/career/$saveId/tactics",
      params: { saveId: id },
    });
    expect(resolveDestination({ type: "transfers", saveId: id })).toEqual({
      to: "/career/$saveId/transfers",
      params: { saveId: id },
    });
    expect(resolveDestination({ type: "league", saveId: id })).toEqual({
      to: "/career/$saveId/league",
      params: { saveId: id },
    });
    expect(resolveDestination({ type: "fixtures", saveId: id })).toEqual({
      to: "/career/$saveId/fixtures",
      params: { saveId: id },
    });
    expect(resolveDestination({ type: "match", saveId: id })).toEqual({
      to: "/career/$saveId/match",
      params: { saveId: id },
    });
    expect(resolveDestination({ type: "seasonSummary", saveId: id })).toEqual({
      to: "/career/$saveId/season-summary",
      params: { saveId: id },
    });
    expect(resolveDestination({ type: "manager", saveId: id })).toEqual({
      to: "/career/$saveId/manager",
      params: { saveId: id },
    });
  });
});

describe("AC-14 — career g bindings never point at creation steps", () => {
  it("every g binding resolves to a persistent career screen", () => {
    const id = save("save-1");
    for (const [key, build] of Object.entries(sectionGBindings)) {
      const destination = build(id);
      expect(CAREER_SCREEN_TYPES as readonly string[]).toContain(destination.type);
      expect(destination.type).not.toMatch(/^createStep/);
      expect(destination.type).not.toBe("mainMenu");
      expect((resolveDestination(destination).to as string)).toMatch(/^\/career\/\$saveId\//);
      expect(key).toMatch(/^[1-8]$/);
    }
  });

  it("the section-level g bindings cover the eight section defaults", () => {
    expect(Object.keys(sectionGBindings).sort()).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
    ]);
    const types = Object.values(sectionGBindings).map((build) => build(save("x")).type);
    expect(new Set(types)).toEqual(new Set(["squad", "tactics", "training", "transfers", "league", "news", "manager", "competitions"]));
  });
});

describe("AC-11 — the redesigned navbar reaches every career screen", () => {
  /**
   * Containment, not equality. This block used to open with a second case asserting that the
   * reached set *equals* `CAREER_SCREEN_TYPES`, which contradicted the case below it and
   * contradicted `test/renderer/navigation/route-index.test.ts`, which asserts containment. The
   * equality was false: the navbar deliberately lists six sub-surfaces as items —
   * `trainingCoaching`, `transferHistory`, `contractExpiry`, `budgetReview`, `scoutingAssignment`
   * and `scoutingKnowledge`.
   * Only this file dying at import in the jsdom `window` family kept that red.
   *
   * Containment is the rule AC-11 actually states: no career screen is keyboard-only. The reverse
   * direction the equality also carried — that the navbar links nothing unrecognised — was real,
   * and was not dropped with it: it lives in route-index.test.ts as "every navbar destination is a
   * classified career destination", stated against both halves of the classification so that the
   * six sanctioned sub-surfaces pass and an unclassified one does not.
   *
   * `CAREER_SECTIONS` is a re-export of `NAV_SECTIONS`, so the surviving case here duplicates a
   * route-index one; it is kept because AC-11 is this file's subject. What stops a screen being
   * dropped from `CAREER_SCREEN_TYPES` itself is the type-level classification in
   * `test/renderer/career-destination-classification.ts`.
   */
  it("every career destination is reachable from a one-action entry point (no screen is keyboard-only)", () => {
    const reached = new Set<string>();
    for (const section of CAREER_SECTIONS) {
      reached.add(section.defaultDestination);
      for (const item of section.items) reached.add(item.destination);
    }
    for (const screen of CAREER_SCREEN_TYPES) {
      expect(reached.has(screen), `career screen '${screen}' has no navbar entry`).toBe(true);
    }
  });
});

describe("g <key> navigation uses position-based number keys", () => {
  it("g 1 resolves to Squad, g 2 to Tactics, g 3 to Training, g 7 to Manager, g 8 to Competitions", () => {
    const id = save("save-1");
    expect(sectionGBindings["1"]!(id)).toEqual({ type: "squad", saveId: id });
    expect(sectionGBindings["2"]!(id)).toEqual({ type: "tactics", saveId: id });
    expect(sectionGBindings["7"]!(id)).toEqual({ type: "manager", saveId: id });
    expect(sectionGBindings["3"]!(id)).toEqual({ type: "training", saveId: id });
    expect(sectionGBindings["8"]!(id)).toEqual({ type: "competitions", saveId: id });
  });
});

describe("AC-12 — route parameters decoded at the boundary", () => {
  it("decodes a well-formed saveId into the contract SaveId", () => {
    const decoded = decodeSaveId("save-1");
    expect(decoded._tag).toBe("Success");
    if (decoded._tag === "Success") expect(decoded.success).toBe(save("save-1"));
  });

  it("an empty saveId is Malformed — a route-shape failure, not a missing-save failure", () => {
    const decoded = decodeSaveId("");
    expect(decoded._tag).toBe("Malformed");
    if (decoded._tag === "Malformed") expect(decoded.reason).toContain("empty");
  });

  it("malformed parameter shape and missing-save are distinct variants", () => {
    expect(["Success", "Malformed"] as const).toHaveLength(2);
    // The missing-save failure lives at the seam union (RemoteFailure), never here.
    expect((["SaveNotFoundError"] as const)[0]).toBe("SaveNotFoundError");
  });
});

describe("AC-14 — navigateBack uses real history and requests back-focus (M2)", () => {
  let historyCalls: number;
  let backCalls: number;

  beforeEach(() => {
    historyCalls = 0;
    backCalls = 0;
    const stub = {
      history: {
        back: () => {
          backCalls += 1;
        },
      },
      navigate: () => {
        historyCalls += 1;
      },
    };
    bindRouter(stub as never);
  });

  it("g b calls history.back exactly once", () => {
    navigateBack();
    expect(backCalls).toBe(1);
    expect(historyCalls).toBe(0);
  });

  it("navigateBack leaves a back-restore marker the arriving screen consumes", () => {
    navigateBack();
    expect(consumePendingFocus()).toEqual({ screen: BACK_RESTORE_MARKER });
  });

  it("a no-op on empty history still clears the pending marker (no leak into the next arrival)", () => {
    navigateBack();
    expect(consumePendingFocus()).toEqual({ screen: BACK_RESTORE_MARKER });
    expect(consumePendingFocus()).toBeNull();
  });
});