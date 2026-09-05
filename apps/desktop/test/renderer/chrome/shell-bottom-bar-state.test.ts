import { describe, expect, it } from "vitest";
import {
  creationCancelButton,
  describeCreationBottomBar,
  describeLeagueSelectionBottomBar,
  withShellCancel,
  type BottomBarPlan,
  type CreationBottomBarInput,
} from "../../../src/renderer/chrome/bottom-bar/shell-bottom-bar-state.js";

const noop = (): void => undefined;

const creationInput = (over: Partial<CreationBottomBarInput> = {}): CreationBottomBarInput => ({
  step: "1",
  generationBlockedReason: null,
  personalDetailsComplete: true,
  managerStep: 2,
  managerStepComplete: true,
  selectionReady: true,
  clubPicked: false,
  committing: false,
  onCancel: noop,
  onBackToLeagues: noop,
  onNextManagerSubStep: noop,
  onGoToClubSelection: noop,
  onGoToReview: noop,
  onCreateCareer: noop,
  ...over,
});

const leagueInput = (over = {}) => ({
  canContinue: true,
  submitting: false,
  stale: false,
  blockingCount: 0,
  noPlayableNations: false,
  onBack: noop,
  onContinue: noop,
  onClearSelection: noop,
  ...over,
});

/** Where a control sits is the bar's decision, so that is what these assert. */
const zones = (plan: BottomBarPlan) => ({
  leading: [plan.cancel, plan.back].filter((button) => button !== null).map((button) => button.id),
  trailing: [...plan.secondary.map((button) => button.id), plan.primary?.id].filter(
    (id) => id !== undefined,
  ),
});

describe("describeCreationBottomBar", () => {
  it("keeps leaving and stepping back in the leading zone on every step", () => {
    expect(zones(describeCreationBottomBar(creationInput({ step: "leagues" }))).leading).toEqual([
      "cancel",
    ]);
    expect(zones(describeCreationBottomBar(creationInput({ step: "1" }))).leading).toEqual([
      "cancel",
      "back-to-leagues",
    ]);
    expect(zones(describeCreationBottomBar(creationInput({ step: "2" }))).leading).toEqual([
      "cancel",
    ]);
    expect(zones(describeCreationBottomBar(creationInput({ step: "3" }))).leading).toEqual([
      "cancel",
    ]);
  });

  it("keeps the one forward verb last in the trailing zone", () => {
    expect(zones(describeCreationBottomBar(creationInput({ step: "1" }))).trailing).toEqual([
      "next-club",
    ]);
    expect(zones(describeCreationBottomBar(creationInput({ step: "2" }))).trailing).toEqual([
      "next-review",
    ]);
    expect(zones(describeCreationBottomBar(creationInput({ step: "3" }))).trailing).toEqual([
      "create-career",
    ]);
  });

  it("never disables the forward verb without saying why", () => {
    const steps: readonly CreationBottomBarInput[] = [
      creationInput({ step: "1", managerStepComplete: false }),
      creationInput({
        step: "1",
        selectionReady: false,
        generationBlockedReason: "Building the league first…",
      }),
      creationInput({ step: "2", clubPicked: false }),
      creationInput({ step: "3", committing: true }),
    ];

    for (const input of steps) {
      const plan = describeCreationBottomBar(input);
      expect(plan.primary?.disabled).toBe(true);
      expect(plan.reason).not.toBeNull();
    }
  });

  it("lets the world's own blocking reason speak before the manager step's gap", () => {
    const plan = describeCreationBottomBar(
      creationInput({
        step: "1",
        managerStep: 2,
        managerStepComplete: false,
        selectionReady: false,
        generationBlockedReason: "Building the league first…",
      }),
    );

    expect(plan.reason).toBe("Building the league first…");
  });

  it("says nothing once the forward verb is pressable", () => {
    const plan = describeCreationBottomBar(creationInput({ step: "2", clubPicked: true }));

    expect(plan.primary?.disabled).toBe(false);
    expect(plan.reason).toBeNull();
  });

  it("advances to the manager-identity panel while personal details are showing", () => {
    const next = { called: 0 };
    let pressed: (() => void) | null = null;
    const plan = describeCreationBottomBar(
      creationInput({
        managerStep: 1,
        personalDetailsComplete: true,
        onNextManagerSubStep: () => {
          next.called += 1;
        },
      }),
    );

    expect(plan.primary?.id).toBe("next-manager-identity");
    expect(plan.primary?.label).toBe("Next: Manager Identity");
    expect(plan.primary?.disabled).toBe(false);
    expect(plan.reason).toBeNull();
    pressed = plan.primary?.onTrigger ?? null;
    pressed?.();
    expect(next.called).toBe(1);
  });

  it("blocks the jump to manager identity until a save name is present", () => {
    const plan = describeCreationBottomBar(
      creationInput({ managerStep: 1, personalDetailsComplete: false }),
    );

    expect(plan.primary?.id).toBe("next-manager-identity");
    expect(plan.primary?.disabled).toBe(true);
    expect(plan.reason).toBe("Name your career to continue.");
  });
});

describe("describeLeagueSelectionBottomBar", () => {
  it("fills the same three zones as every other step", () => {
    const plan = describeLeagueSelectionBottomBar(leagueInput());

    expect(zones(plan)).toEqual({ leading: ["back"], trailing: ["clear-selection", "continue"] });
  });

  it("reduces to Back alone when the database has nothing playable", () => {
    const plan = describeLeagueSelectionBottomBar(leagueInput({ noPlayableNations: true }));

    expect(zones(plan)).toEqual({ leading: ["back"], trailing: [] });
  });

  it("states the most specific blocking reason it has", () => {
    const reasonFor = (over: object) =>
      describeLeagueSelectionBottomBar(leagueInput({ canContinue: false, ...over })).reason;

    expect(reasonFor({ submitting: true })).toBe("Creating your selection…");
    expect(reasonFor({ stale: true })).toBe("Checking this selection…");
    expect(reasonFor({ blockingCount: 2 })).toBe(
      "Resolve the problems listed above to continue.",
    );
    expect(reasonFor({})).toBe("Select at least one playable league to continue.");
  });
});

describe("withShellCancel", () => {
  it("gives a step's own plan the shell's way out", () => {
    const plan = withShellCancel(
      describeLeagueSelectionBottomBar(leagueInput()),
      creationCancelButton(noop),
    );

    expect(zones(plan).leading).toEqual(["cancel", "back"]);
  });

  it("leaves a plan that already has one alone", () => {
    const own = creationCancelButton(noop);
    const plan = withShellCancel(describeCreationBottomBar(creationInput({ step: "3" })), own);

    expect(plan.cancel?.id).toBe("cancel");
  });
});
