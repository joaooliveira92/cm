import { cleanup, render, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ShellBottomBar } from "../../../src/renderer/chrome/bottom-bar/ShellBottomBar.js";
import {
  describeCreationBottomBar,
  describeLeagueSelectionBottomBar,
  type BottomBarPlan,
  type CreationBottomBarInput,
} from "../../../src/renderer/chrome/bottom-bar/shell-bottom-bar-state.js";

/**
 * The bar renders a described plan, so these assert on what reaches the screen.
 *
 * `shell-bottom-bar-state.test.ts` covers the plan; that the component *shows*
 * the plan is a separate claim, and it was the one that broke — the reason was
 * described, tested, and then dropped on the floor by the bar, so a greyed
 * Continue shipped with nothing on screen to say why.
 */

const noop = (): void => undefined;

const creationInput = (over: Partial<CreationBottomBarInput> = {}): CreationBottomBarInput => ({
  step: "1",
  generationBlockedReason: null,
  personalDetailsComplete: true,
  pillarsComplete: true,
  managerStyleComplete: true,
  managerStep: 3,
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

const bar = (plan: BottomBarPlan): HTMLElement => {
  const { container, unmount } = render(<ShellBottomBar plan={plan} />);
  const footer = container.querySelector("footer");
  if (footer === null) {
    unmount();
    throw new Error("the bar renders no footer");
  }
  return footer;
};

afterEach(cleanup);

describe("the bar shows why the forward verb cannot be pressed", () => {
  it("states the reason beside a disabled Continue on the leagues step", () => {
    const footer = bar(
      describeLeagueSelectionBottomBar({
        canContinue: false,
        submitting: false,
        stale: false,
        blockingCount: 0,
        noPlayableNations: false,
        onBack: noop,
        onContinue: noop,
        onClearSelection: noop,
      }),
    );

    const continueButton = within(footer).getByRole("button", { name: "Continue" });
    expect((continueButton as HTMLButtonElement).disabled).toBe(true);
    expect(within(footer).getByText("Select at least one playable league to continue.")).toBeTruthy();
  });

  it("states the reason beside a disabled Next: Manager Identity", () => {
    const footer = bar(
      describeCreationBottomBar(creationInput({ managerStep: 1, personalDetailsComplete: false })),
    );

    const next = within(footer).getByRole("button", { name: "Next: Manager Identity" });
    expect((next as HTMLButtonElement).disabled).toBe(true);
    expect(within(footer).getByText("Complete your personal details to continue.")).toBeTruthy();
  });

  it("keeps the reason row in the layout when there is nothing to say, so the bar never resizes", () => {
    const withReason = bar(
      describeCreationBottomBar(creationInput({ managerStep: 1, personalDetailsComplete: false })),
    );
    const withoutReason = bar(describeCreationBottomBar(creationInput({ managerStep: 1 })));

    const reasonRow = (footer: HTMLElement): Element | null => footer.querySelector("footer p");

    expect(reasonRow(withReason)).not.toBeNull();
    expect(reasonRow(withoutReason)).not.toBeNull();
    expect(reasonRow(withoutReason)?.textContent).toBe("");
  });
});
