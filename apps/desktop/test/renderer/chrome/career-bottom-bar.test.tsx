import { act, cleanup, screen, within } from "@testing-library/react";
import { useMemo } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetBindingOverrides } from "../../../src/renderer/actions/bindingState.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";
import {
  clearScreenBottomBarActions,
  describeCareerBottomBar,
  useScreenBottomBarActions,
  type CareerBottomBarInput,
} from "../../../src/renderer/chrome/bottom-bar/index.js";
import { counters, mountCareer, mountRoutedCareer, preload, resetCareerHarness } from "./career-harness.js";

const noop = (): void => undefined;

const input = (over: Partial<CareerBottomBarInput> = {}): CareerBottomBarInput => ({
  continueLabel: "Continue",
  continueDisabled: false,
  advancing: false,
  continueUnavailableReason: null,
  matchInProgress: false,
  screen: null,
  status: [],
  onContinue: noop,
  ...over,
});

const screenButton = { id: "confirm-lineup", label: "Confirm Lineup", disabled: false, onTrigger: noop };

describe("describeCareerBottomBar", () => {
  it("gives the primary zone to Continue, under its current label", () => {
    const plan = describeCareerBottomBar(input({ continueLabel: "Go to Match" }));
    expect(plan.primary).toMatchObject({ id: "continue", label: "Go to Match", disabled: false });
    expect(plan.reason).toBeNull();
  });

  it("says why Continue cannot be pressed, falling back when the registry has no reason", () => {
    expect(
      describeCareerBottomBar(input({ continueDisabled: true, continueUnavailableReason: "Pick a Tactic first." })).reason,
    ).toBe("Pick a Tactic first.");
    expect(describeCareerBottomBar(input({ continueDisabled: true })).reason).toBe(
      "The Calendar cannot advance right now.",
    );
  });

  it("reads as advancing while the Calendar moves", () => {
    const plan = describeCareerBottomBar(input({ advancing: true, continueDisabled: true }));
    expect(plan.primary?.label).toBe("Advancing…");
    expect(plan.reason).toBe("Advancing the Calendar…");
  });

  it("puts a screen's verbs beside Continue, never in its place", () => {
    const plan = describeCareerBottomBar(input({ screen: { buttons: [screenButton], reason: "Two slots empty." } }));
    expect(plan.secondary).toEqual([screenButton]);
    expect(plan.primary?.id).toBe("continue");
    expect(plan.reason).toBe("Two slots empty.");
  });

  it("lets Continue's reason speak before the screen's", () => {
    const plan = describeCareerBottomBar(
      input({ continueDisabled: true, continueUnavailableReason: "Blocked.", screen: { buttons: [], reason: "Screen." } }),
    );
    expect(plan.reason).toBe("Blocked.");
  });

  it("drops Continue while a match is on, keeping the screen's verbs", () => {
    const plan = describeCareerBottomBar(input({ matchInProgress: true, screen: { buttons: [screenButton] } }));
    expect(plan.primary).toBeNull();
    expect(plan.secondary).toEqual([screenButton]);
  });
});

beforeEach(resetCareerHarness);

afterEach(() => {
  cleanup();
  clearScreenBottomBarActions();
  resetScopeState();
  resetBindingOverrides();
});

describe("the career bottom bar", () => {
  it("carries Continue on every career screen, outside the header", async () => {
    await mountCareer("in_season", "fixtures");
    const bar = within(screen.getByRole("contentinfo"));
    act(() => bar.getByRole("button", { name: "Continue" }).click());
    expect(counters.advanceCalls).toBe(1);
    expect(within(screen.getByRole("banner")).queryByRole("button", { name: /Continue/ })).toBeNull();
  });

  it("shows the verbs the mounted screen registers, and drops them when it unmounts", async () => {
    let pressed = 0;
    const Registers = () => {
      const actions = useMemo(
        () => ({ buttons: [{ ...screenButton, onTrigger: () => (pressed += 1) }] }),
        [],
      );
      useScreenBottomBarActions(actions);
      return null;
    };
    preload("in_season");
    await mountRoutedCareer("league", Registers);
    const bar = within(screen.getByRole("contentinfo"));
    act(() => bar.getByRole("button", { name: "Confirm Lineup" }).click());
    expect(pressed).toBe(1);

    cleanup();
    expect(screen.queryByRole("button", { name: "Confirm Lineup" })).toBeNull();
  });
});
