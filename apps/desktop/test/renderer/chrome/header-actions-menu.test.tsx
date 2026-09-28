import { cleanup, fireEvent, screen } from "@testing-library/react";
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

  it("is not dead-disabled when the season is complete", async () => {
    await mountCareer("season_complete", "league");
    const btn = await screen.findByRole("button", { name: /Continue/i });
    // The season-rollover decision removed the dead season_complete disable: the
    // phase never reaches the renderer under normal play.
    expect(btn.hasAttribute("disabled")).toBeFalsy();
  });

  it("has an unavailable reason via the action registry", () => {
    const reason = continueUnavailableReason();
    expect(reason).toBeDefined();
  });
});
describe("Actions menu", () => {
  it("offers a career screen's ready-gated actions, not only the always-available ones", async () => {
    await mountCareer("in_season", "squad");
    fireEvent.click(await screen.findByRole("button", { name: "Actions" }));
    const pick = await screen.findByRole("button", { name: "Assistant manager picks the team" });
    expect(pick.hasAttribute("disabled")).toBeFalsy();
  });

  it("lists only the actions that opt into the menu", async () => {
    await mountCareer("in_season", "squad");
    fireEvent.click(await screen.findByRole("button", { name: "Actions" }));
    await screen.findByRole("button", { name: "Assistant manager picks the team" });
    // Registered on Squad, but reached through the keyboard and the palette, not the menu.
    expect(screen.queryByRole("button", { name: "Restore Squad column defaults" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Retry loading the Squad" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Go to Transfer Market" })).toBeNull();
  });

  it("is absent on a screen with no menu actions", async () => {
    await mountCareer("in_season", "league");
    await screen.findByRole("button", { name: /Continue/i });
    expect(screen.queryByRole("button", { name: "Actions" })).toBeNull();
  });
});
