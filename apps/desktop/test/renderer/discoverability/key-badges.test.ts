import { describe, expect, it } from "vitest";
import {
  ACTION_REGISTRY,
  keyBadgesEnabledFor,
  SCREEN_METADATA,
} from "../../../src/renderer/actions/allActions.js";
import { actionBadgeBinding } from "../../../src/renderer/discoverability/ActionKeyBadge.js";

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
    expect(actionBadgeBinding(focusBid, "transfers")).toBe("b");
  });

  it("no badge on an opted-out screen, on a foreign scope, or for an unbound action", () => {
    const focusBid = ACTION_REGISTRY.get("focus-bid")!;
    // A screen that opted out shows no badge even for a bound action.
    expect(actionBadgeBinding(focusBid, "squad")).toBeNull();
    // The screens' other registered actions carry no binding at all.
    const placeBid = ACTION_REGISTRY.get("place-bid")!;
    expect(actionBadgeBinding(placeBid, "transfers")).toBeNull();
    // A bound action never badged on a screen it does not belong to.
    expect(actionBadgeBinding(focusBid, "league")).toBeNull();
  });

  it("the league scope owns no action to badge: time advances from the chrome alone", () => {
    // The screen stays opted in — that is a statement about its density, not
    // about how many Actions it happens to own — but nothing is left to badge,
    // and a second advance control here is what this asserts cannot come back.
    expect(ACTION_REGISTRY.all.filter((a) => a.scope === "league")).toEqual([]);
  });
});