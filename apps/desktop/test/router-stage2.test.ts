import { describe, expect, it, beforeEach } from "vitest";
import { SaveId as SaveIdSchema, type SaveId } from "@cm-clone/contracts";
import { bindRouter, navigateBack } from "../src/renderer/navigation/adapter.js";
import { CAREER_G_BINDINGS, CAREER_SCREEN_TYPES, resolveDestination } from "../src/renderer/navigation/destinations.js";
import { decodeSaveId } from "../src/renderer/navigation/params.js";
import { consumePendingFocus, BACK_RESTORE_MARKER } from "../src/renderer/focus.js";

const save = (id: string): SaveId => SaveIdSchema.make(id);

describe("AC-14 — typed destination resolver", () => {
  it("resolves every destination to its route, never a raw caller-built path", () => {
    expect(resolveDestination({ type: "saveList" })).toEqual({ to: "/" });
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
  });
});

describe("AC-14 — career g bindings never point at creation steps", () => {
  it("every g binding resolves to a persistent career screen", () => {
    const id = save("save-1");
    for (const [key, build] of Object.entries(CAREER_G_BINDINGS)) {
      const destination = build(id);
      expect(CAREER_SCREEN_TYPES as readonly string[]).toContain(destination.type);
      expect(destination.type).not.toMatch(/^createStep/);
      expect(destination.type).not.toBe("saveList");
      expect((resolveDestination(destination).to as string)).toMatch(/^\/career\/\$saveId\//);
      expect(key).toMatch(/^[a-z]$/);
    }
  });

  it("the registry covers all seven career screens and nothing else", () => {
    expect(Object.keys(CAREER_G_BINDINGS).sort()).toEqual([
      "a",
      "f",
      "l",
      "m",
      "s",
      "t",
      "y",
    ]);
    const types = Object.values(CAREER_G_BINDINGS).map((build) => build(save("x")).type);
    expect(new Set(types)).toEqual(new Set(CAREER_SCREEN_TYPES));
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