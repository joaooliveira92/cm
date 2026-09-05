/**
 * Presentation state for the shell's bottom bar — the creation flow's footer,
 * and any later shell that grows one.
 *
 * The bar had drifted: each step handed the shell a finished block of JSX, so
 * one step's Back sat in the trailing zone while another's sat next to Cancel,
 * a registered block laid itself out `w-full justify-between` inside a parent
 * that was already `justify-between`, and a blocked step grew the bar by a line
 * and shrank it again when it unblocked. Every one of those is a layout the
 * screen invented, which is exactly what a screen must not be able to do.
 *
 * So a screen now describes its bar and nothing else. Where a control sits is
 * this module's decision, expressed once:
 *
 * - leading zone — leaving (`cancel`), then stepping back (`back`);
 * - trailing zone — supporting verbs (`secondary`), then the one forward verb
 *   (`primary`);
 * - one reason line, always present in the layout, so the bar's height is the
 *   same on every screen and in every state.
 *
 * This is the header's `describeSecondaryRow` applied to the other end of the
 * shell, and for the same reason: the component renders a described bar rather
 * than deciding what a step's controls mean.
 */

/** One control in the bar. Always rendered; disabled when it cannot be pressed,
 *  never hidden, so the bar's shape does not change under the pointer. */
export interface BottomBarButton {
  readonly id: string;
  readonly label: string;
  readonly disabled: boolean;
  readonly onTrigger: () => void;
}

export interface BottomBarPlan {
  readonly cancel: BottomBarButton | null;
  readonly back: BottomBarButton | null;
  readonly secondary: readonly BottomBarButton[];
  readonly primary: BottomBarButton | null;
  /**
   * Why the primary cannot be pressed, or what it is doing. A greyed control
   * that does not say why is not acceptable, and `title` does not reach a
   * disabled button — so the reason is copy, in a row the bar always reserves.
   */
  readonly reason: string | null;
}

export const EMPTY_BOTTOM_BAR: BottomBarPlan = {
  cancel: null,
  back: null,
  secondary: [],
  primary: null,
  reason: null,
};

/**
 * A step's own plan, with the shell's control filled in where the step left it
 * empty. Leaving the flow belongs to the shell, not to whichever step happens
 * to be mounted — the old footer rendered Cancel outside the registered block
 * for exactly this reason, and a step that registered a plan without one would
 * otherwise strand the user on that step.
 */
export function withShellCancel(plan: BottomBarPlan, cancel: BottomBarButton): BottomBarPlan {
  return plan.cancel === null ? { ...plan, cancel } : plan;
}

/** The creation flow's steps, in order. */
export type CreationStep = "leagues" | "1" | "2" | "3";

export interface CreationBottomBarInput {
  readonly step: CreationStep;
  /** Why the world is not ready yet, from the generation state machine. */
  readonly generationBlockedReason: string | null;
  /** True once the Manager step's personal-details sub-panel has a save name. */
  readonly personalDetailsComplete: boolean;
  /** Which sub-panel of the Manager step is showing: 1 = personal details, 2 = manager identity. */
  readonly managerStep: 1 | 2;
  readonly managerStepComplete: boolean;
  readonly selectionReady: boolean;
  readonly clubPicked: boolean;
  readonly committing: boolean;
  readonly onCancel: () => void;
  readonly onBackToLeagues: () => void;
  readonly onNextManagerSubStep: () => void;
  readonly onGoToClubSelection: () => void;
  readonly onGoToReview: () => void;
  readonly onCreateCareer: () => void;
}

/**
 * The bar for the manager, club, and review steps. The leagues step describes
 * its own (see `describeLeagueSelectionBottomBar`) because its Continue is
 * gated on selection validity the shell does not hold — but it goes through the
 * same plan, so it cannot lay itself out differently.
 */
export function creationCancelButton(onCancel: () => void): BottomBarButton {
  return { id: "cancel", label: "Cancel", disabled: false, onTrigger: onCancel };
}

export function describeCreationBottomBar(input: CreationBottomBarInput): BottomBarPlan {
  const cancel: BottomBarButton = creationCancelButton(input.onCancel);

  switch (input.step) {
    case "leagues":
      return { ...EMPTY_BOTTOM_BAR, cancel };

    case "1":
      // The Manager step holds two panels behind one route. The bar's primary
      // verb drives the same progression the in-panel stepper does: while the
      // personal-details panel is showing it advances to the manager-identity
      // panel, and once there it hands over to the club step. One bar, one
      // forward verb, whose meaning depends on which panel is showing.
      return input.managerStep === 1
        ? {
          cancel,
          back: {
            id: "back-to-leagues",
            label: "Back: Leagues",
            disabled: false,
            onTrigger: input.onBackToLeagues,
          },
          secondary: [],
          primary: {
            id: "next-manager-identity",
            label: "Next: Manager Identity",
            disabled: !input.personalDetailsComplete,
            onTrigger: input.onNextManagerSubStep,
          },
          reason: input.personalDetailsComplete
            ? null
            : "Name your career to continue.",
        }
        : {
          cancel,
          back: {
            id: "back-to-leagues",
            label: "Back: Leagues",
            disabled: false,
            onTrigger: input.onBackToLeagues,
          },
          secondary: [],
          primary: {
            id: "next-club",
            label: "Next: Select Club",
            disabled: !input.managerStepComplete || !input.selectionReady,
            onTrigger: input.onGoToClubSelection,
          },
          // The world's own blocking reason speaks first (it clears itself when
          // generation lands); the manager step's own gap is only worth stating
          // once there is nothing else waiting.
          reason:
            input.generationBlockedReason ??
            (input.managerStepComplete ? null : "Name your career and spend all 12 pillar points."),
        };

    case "2":
      return {
        cancel,
        back: null,
        secondary: [],
        primary: {
          id: "next-review",
          label: "Next: Review",
          disabled: !input.selectionReady || !input.clubPicked,
          onTrigger: input.onGoToReview,
        },
        reason: input.clubPicked ? null : "Choose a club to continue.",
      };

    case "3":
      return {
        cancel,
        back: null,
        secondary: [],
        primary: {
          id: "create-career",
          label: "Create Career",
          disabled: input.committing,
          onTrigger: input.onCreateCareer,
        },
        reason: input.committing ? "Creating your career…" : null,
      };
  }
}

export interface LeagueSelectionBottomBarInput {
  readonly canContinue: boolean;
  readonly submitting: boolean;
  readonly stale: boolean;
  readonly blockingCount: number;
  /** True once the index has loaded and reports nothing playable: the step can
   *  only be left, so the bar carries Back and nothing else. */
  readonly noPlayableNations: boolean;
  readonly onBack: () => void;
  readonly onContinue: () => void;
  readonly onClearSelection: () => void;
}

/** The leagues step's bar. Back leads, Clear Selection supports, Continue is the
 *  one forward verb — the same three zones every other step fills. */
export function describeLeagueSelectionBottomBar(
  input: LeagueSelectionBottomBarInput,
): BottomBarPlan {
  const back: BottomBarButton = {
    id: "back",
    label: "Back",
    disabled: false,
    onTrigger: input.onBack,
  };

  if (input.noPlayableNations) return { ...EMPTY_BOTTOM_BAR, back };

  return {
    cancel: null,
    back,
    secondary: [
      {
        id: "clear-selection",
        label: "Clear Selection",
        disabled: false,
        onTrigger: input.onClearSelection,
      },
    ],
    primary: {
      id: "continue",
      label: input.submitting ? "Continuing…" : "Continue",
      disabled: !input.canContinue,
      onTrigger: input.onContinue,
    },
    reason: input.canContinue ? null : leagueSelectionReason(input),
  };
}

function leagueSelectionReason(input: LeagueSelectionBottomBarInput): string {
  if (input.submitting) return "Creating your selection…";
  if (input.stale) return "Checking this selection…";
  if (input.blockingCount > 0) return "Resolve the problems listed above to continue.";
  return "Select at least one playable league to continue.";
}

export interface ActiveLeaguesBottomBarInput {
  readonly canContinue: boolean;
  /** True while the selection is being recorded. */
  readonly submitting: boolean;
  /** True while a newer resolve is in flight, so the figures on screen are the previous answer. */
  readonly stale: boolean;
  readonly hasActiveLeagues: boolean;
  /** Blocking validation messages, in the order the sidebar lists them. */
  readonly blockingMessages: readonly string[];
  readonly onCancel: () => void;
  readonly onContinue: () => void;
}

/**
 * The Active Leagues setup step's bar: leaving on the left, the one forward verb on the right.
 *
 * It carries no Back — this is the flow's first step, so leaving it *is* cancelling — and no
 * supporting verb, because the setup preset and Manage leagues are workspace actions that must
 * stay visibly subordinate to the commitment point. The primary is labelled for the step it
 * reaches, not for the operation it runs.
 */
export function describeActiveLeaguesBottomBar(
  input: ActiveLeaguesBottomBarInput,
): BottomBarPlan {
  return {
    cancel: creationCancelButton(input.onCancel),
    back: null,
    secondary: [],
    primary: {
      id: "continue",
      label: input.submitting ? "Continuing…" : "Continue",
      // The disabled state is the *visible* guard; the model refuses a second submission
      // outright, so a keyboard repeat that outruns a re-render still cannot start two.
      disabled: !input.canContinue || input.submitting,
      onTrigger: input.onContinue,
    },
    reason: activeLeaguesReason(input),
  };
}

function activeLeaguesReason(input: ActiveLeaguesBottomBarInput): string | null {
  if (input.submitting) return "Recording your selection…";
  if (input.canContinue) return null;
  if (!input.hasActiveLeagues) return "Add at least one active league to continue.";
  const first = input.blockingMessages[0];
  if (first !== undefined) return first;
  if (input.stale) return "Checking this setup…";
  return "This setup cannot be used yet.";
}

export interface ManageLeaguesBottomBarInput {
  readonly onCancel: () => void;
  readonly onApply: (() => void);
  readonly onClearSelection: () => void;
}

/**
 * The bar for the tree opened as **Manage leagues** from the Active Leagues setup screen.
 *
 * The tree is a working copy here, so its forward verb applies the edit back to the setup rather
 * than continuing the flow, and its leading control closes the presentation rather than leaving
 * the career. Same three zones as every other step: nothing about this mode gets to lay itself
 * out differently.
 */
export function describeManageLeaguesBottomBar(
  input: ManageLeaguesBottomBarInput,
): BottomBarPlan {
  return {
    cancel: {
      id: "cancel-manage",
      label: "Cancel",
      disabled: false,
      onTrigger: input.onCancel,
    },
    back: null,
    secondary: [
      {
        id: "clear-selection",
        label: "Clear Selection",
        disabled: false,
        onTrigger: input.onClearSelection,
      },
    ],
    primary: {
      id: "apply-leagues",
      label: "Apply changes",
      disabled: false,
      onTrigger: input.onApply,
    },
    reason: null,
  };
}
