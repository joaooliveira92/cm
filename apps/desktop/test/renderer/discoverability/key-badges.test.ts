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
    const advanceCalendar = ACTION_REGISTRY.get("advance-calendar")!;
    expect(actionBadgeBinding(focusBid, "transfers")).toBe("b");
    expect(actionBadgeBinding(advanceCalendar, "league")).toBe("c");
  });

  it("no badge on an opted-out screen, on a foreign scope, or for an unbound action", () => {
    const focusBid = ACTION_REGISTRY.get("focus-bid")!;
    const advanceCalendar = ACTION_REGISTRY.get("advance-calendar")!;
    // A screen that opted out shows no badge even for its own bound action.
    expect(actionBadgeBinding(advanceCalendar, "squad")).toBeNull();
    // The screens' other registered actions carry no binding at all.
    const placeBid = ACTION_REGISTRY.get("place-bid")!;
    expect(actionBadgeBinding(placeBid, "transfers")).toBeNull();
    // A bound action never badged on a screen it does not belong to.
    expect(actionBadgeBinding(focusBid, "league")).toBeNull();
  });
});