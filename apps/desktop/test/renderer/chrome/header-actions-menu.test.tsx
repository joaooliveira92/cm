// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetBindingOverrides } from "../../../src/renderer/actions/bindingState.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";
import { continueUnavailableReason } from "../../../src/renderer/chrome/CareerStateProvider.js";
import { mountCareer, resetCareerHarness } from "./career-harness.js";

beforeEach(resetCareerHarness);

afterEach(() => {
  cleanup();
  resetScopeState();
  resetBindingOverrides();
});

describe("Continue button", () => {
  it('shows "Continue" label by default in the in-season phase', async () => {
    await mountCareer("in_season", "league");
    expect(await screen.findByRole("button", { name: /Continue/i })).toBeTruthy();
  });

  it("is disabled when the season is complete", async () => {
    await mountCareer("season_complete", "league");
    const btn = await screen.findByRole("button", { name: /Continue/i });
    expect(btn.hasAttribute("disabled")).toBeTruthy();
  });

  it("has an unavailable reason via the action registry", () => {
    const reason = continueUnavailableReason();
    expect(reason).toBeDefined();
  });
});