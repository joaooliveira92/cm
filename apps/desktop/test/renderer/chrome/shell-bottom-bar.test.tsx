import { cleanup, render, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShellBottomBar } from "../../../src/renderer/chrome/bottom-bar/ShellBottomBar.js";
import { MARQUEE_PX_PER_SECOND } from "../../../src/renderer/chrome/bottom-bar/StatusMarquee.js";
import {
  describeCreationBottomBar,
  EMPTY_BOTTOM_BAR,
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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

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

describe("the bar ties the reason to the control it explains", () => {
  it("describes a disabled primary by the reason line", () => {
    const footer = bar(
      describeCreationBottomBar(creationInput({ managerStep: 1, personalDetailsComplete: false })),
    );

    const next = within(footer).getByRole("button", { name: "Next: Manager Identity" });
    const describedBy = next.getAttribute("aria-describedby");
    expect(describedBy).not.toBeNull();
    expect(footer.querySelector(`[id="${describedBy}"]`)?.textContent).toBe(
      "Complete your personal details to continue.",
    );
  });

  it("leaves an enabled primary undescribed, since the line is not about it", () => {
    const footer = bar(describeCreationBottomBar(creationInput({ managerStep: 1 })));

    const next = within(footer).getByRole("button", { name: "Next: Manager Identity" });
    expect(next.hasAttribute("aria-describedby")).toBe(false);
  });
});

describe("the status marquee", () => {
  const statusBar = (status: readonly string[]): HTMLElement => bar({ ...EMPTY_BOTTOM_BAR, status });

  it("names its list once for assistive tech and hides the loop's second copy", () => {
    const footer = statusBar(["Version 1.0.0", "Mods: none"]);

    const list = within(footer).getByRole("list", { name: "Status" });
    expect(within(list).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Version 1.0.0",
      "Mods: none",
    ]);
    expect(footer.querySelectorAll('ul[aria-hidden="true"]')).toHaveLength(1);
  });

  it("renders two items with the same text as two items", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const footer = statusBar(["Mods: none", "Mods: none"]);

    expect(within(footer).getAllByRole("listitem")).toHaveLength(2);
    expect(errors).not.toHaveBeenCalled();
  });

  it("times a cycle from the copy's measured width, so the speed does not depend on the window", () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      width: MARQUEE_PX_PER_SECOND * 25,
    } as DOMRect);

    const footer = statusBar(["Version 1.0.0"]);

    const track = footer.querySelector<HTMLElement>("[data-marquee-track]");
    expect(track?.style.animationDuration).toBe("25s");
  });
});
