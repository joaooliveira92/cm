// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { seasonReadout } from "../../../src/renderer/chrome/CareerChrome.js";
import { resetBindingOverrides } from "../../../src/renderer/actions/bindingState.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";
import { mountCareer, resetCareerHarness } from "./career-harness.js";

beforeEach(resetCareerHarness);

afterEach(() => {
  cleanup();
  resetScopeState();
  resetBindingOverrides();
});

describe("season readout", () => {
  it("stands on the calendar date the season has reached", () => {
    expect(seasonReadout({ seasonNumber: 3, currentDate: "2026-10-17", phase: "in_season" })).toBe(
      "Season 3 · 17 Oct 2026",
    );
  });

  it("replaces the date with a phase word outside the in-season phase", () => {
    const at = (phase: string) =>
      seasonReadout({ seasonNumber: 3, currentDate: "2026-10-17", phase });
    expect(at("pre_season")).toBe("Season 3 · Pre-season");
    expect(at("mid_window_open")).toBe("Season 3 · Transfer window open");
    expect(at("season_complete")).toBe("Season 3 · Season complete");
  });
});

describe("the career chrome", () => {
  it("carries club identity and the temporal cluster on every career screen", async () => {
    await mountCareer("in_season", "fixtures");
    expect(await screen.findByText("Northport Rovers")).toBeTruthy();
    expect(screen.getByText("Season 3 · 17 Oct 2026")).toBeTruthy();
    expect(screen.getByText("My Save")).toBeTruthy();
  });

  it("never renders day-or-date copy", async () => {
    await mountCareer("in_season", "league");
    const chrome = screen.getByRole("banner");
    for (const forbidden of [/\bday\b/i, /\bdate\b/i, /\d{4}-\d{2}-\d{2}/]) {
      expect(chrome.textContent ?? "").not.toMatch(forbidden);
    }
  });

  it("marks the active item and keeps every primary section present", async () => {
    await mountCareer("in_season", "fixtures");
    // The active destination's item lives in the Analysis context strip and
    // carries aria-current; another section's item does not.
    expect(screen.getByRole("button", { name: "Fixtures" }).getAttribute("aria-current")).toBe("page");
    // The context strip shows the active section's items.
    expect(screen.getByRole("button", { name: "League Table" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Match Day" })).toBeTruthy();
    // Every primary section plus Back to saves is present in the primary row.
    for (const label of [
      "Squad",
      "Tactics",
      "Training",
      "Recruitment",
      "Analysis",
      "Club",
      "Back to saves",
    ]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
  });
});
