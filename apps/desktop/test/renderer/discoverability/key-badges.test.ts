// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  ACTION_REGISTRY,
  keyBadgesEnabledFor,
  SCREEN_METADATA,
} from "../../../src/renderer/actions/allActions.js";
import { publishBindingOverrides, resetBindingOverrides } from "../../../src/renderer/actions/bindingState.js";
import { EMPTY_OVERRIDES } from "../../../src/renderer/actions/overrides.js";
import {
  actionBadgeBinding,
  useActionBadgeBinding,
} from "../../../src/renderer/discoverability/ActionKeyBadge.js";

afterEach(() => {
  cleanup();
  resetBindingOverrides();
});

describe("AC-25 — inline key badges are toggleable per screen via registry metadata", () => {
  it("the registry's per-screen metadata opts action-heavy screens in and dense/sparse ones out", () => {
    expect(SCREEN_METADATA.transfers.showKeyBadges).toBe(true);
    expect(SCREEN_METADATA.league.showKeyBadges).toBe(true);
    expect(SCREEN_METADATA.squad.showKeyBadges).toBe(false);
    expect(SCREEN_METADATA.tactics.showKeyBadges).toBe(false);
    expect(SCREEN_METADATA.fixtures.showKeyBadges).toBe(false);
    expect(SCREEN_METADATA.match.showKeyBadges).toBe(false);
    expect(SCREEN_METADATA.seasonSummary.showKeyBadges).toBe(false);
  });

  it("keyBadgesEnabledFor reads the metadata faithfully", () => {
    expect(keyBadgesEnabledFor("transfers")).toBe(true);
    expect(keyBadgesEnabledFor("league")).toBe(true);
    expect(keyBadgesEnabledFor("squad")).toBe(false);
  });

  it("the badge binding is shown only for the screen's own bound actions on an opted-in screen", () => {
    const focusBid = ACTION_REGISTRY.get("focus-bid")!;
    expect(actionBadgeBinding(focusBid, "transfers", EMPTY_OVERRIDES)).toBe("b");
  });

  it("no badge on an opted-out screen, on a foreign scope, or for an unbound action", () => {
    const focusBid = ACTION_REGISTRY.get("focus-bid")!;
    // A screen that opted out shows no badge even for a bound action.
    expect(actionBadgeBinding(focusBid, "squad", EMPTY_OVERRIDES)).toBeNull();
    // The screens' other registered actions carry no binding at all.
    const placeBid = ACTION_REGISTRY.get("place-bid")!;
    expect(actionBadgeBinding(placeBid, "transfers", EMPTY_OVERRIDES)).toBeNull();
    // A bound action never badged on a screen it does not belong to.
    expect(actionBadgeBinding(focusBid, "league", EMPTY_OVERRIDES)).toBeNull();
  });

  it("the badge shows the effective binding, so a rebind never leaves it advertising a dead key", () => {
    const focusBid = ACTION_REGISTRY.get("focus-bid")!;
    expect(actionBadgeBinding(focusBid, "transfers", { "focus-bid": "v" })).toBe("v");
    // An override does not smuggle a badge onto a screen that opted out.
    expect(actionBadgeBinding(focusBid, "squad", { "focus-bid": "v" })).toBeNull();
  });

  it("the hook re-badges the moment a rebind is adopted", () => {
    const { result } = renderHook(() => useActionBadgeBinding("focus-bid", "transfers"));
    expect(result.current).toBe("b");
    act(() => publishBindingOverrides({ "focus-bid": "v" }));
    expect(result.current).toBe("v");
  });

  it("the hook yields no badge for an action id the registry does not own", () => {
    const { result } = renderHook(() => useActionBadgeBinding("no-such-action", "transfers"));
    expect(result.current).toBeNull();
  });

  it("the league scope owns no action to badge: time advances from the chrome alone", () => {
    // The screen stays opted in — that is a statement about its density, not
    // about how many Actions it happens to own — but nothing is left to badge,
    // and a second advance control here is what this asserts cannot come back.
    expect(ACTION_REGISTRY.all.filter((a) => a.scope === "league")).toEqual([]);
  });
});