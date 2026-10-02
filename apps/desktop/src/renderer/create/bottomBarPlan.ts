import type { CreationSession } from "../router/createSessionContext.js";
import type { BottomBarPlan, BottomBarButton, CreationBottomBarInput, StatusItem } from "../chrome/bottom-bar/shell-bottom-bar-state.js";
import { EMPTY_BOTTOM_BAR, CreationStep, creationCancelButton, describeCreationBottomBar, withShellCancel } from "../chrome/bottom-bar/shell-bottom-bar-state.js";
import { personalDetailsComplete, pillarsComplete } from "./stepGuards.js";
import { managerStyleComplete } from "./managerStyle.js";
import { selectedClubOf } from "./clubSelection.js";
import { isSelectionReady, blockedReason } from "./generation.js";
import type { PillarDistribution } from "@cm-clone/shared";

const sumPillars = (pillars: PillarDistribution): number =>
  Object.values(pillars).reduce((total, value) => total + value, 0);

const getManagerStepComplete = (session: CreationSession): boolean => {
  return personalDetailsComplete(session) && pillarsComplete(session) && managerStyleComplete(session);
};

export interface BuildBottomBarPlanInput {
  readonly step: CreationStep;
  readonly session: CreationSession;
  readonly registeredBar: BottomBarPlan | null;
  readonly onCancel: () => void;
  readonly onBackToLeagues: () => void;
  readonly onNextManagerSubStep: () => void;
  readonly onGoToClubSelection: () => void;
  readonly onGoToReview: () => void;
  readonly onCreateCareer: () => void;
}

/**
 * Constructs the bottom-bar plan for the creation flow.
 *
 * If a step has registered its own bar (via `registerBottomBar`), that bar
 * is used with the shell's Cancel appended — the step's own plan always wins
 * over the generic creation plan. Otherwise the plan is built from the current
 * session state and the provided navigation callbacks.
 */
export function buildBottomBarPlan(input: BuildBottomBarPlanInput): BottomBarPlan {
  if (input.registeredBar !== null) {
    return withShellCancel(input.registeredBar, creationCancelButton(input.onCancel));
  }

  const session = input.session;

  const planInput: CreationBottomBarInput = {
    step: input.step,
    generationBlockedReason: blockedReason(session.generation),
    personalDetailsComplete: personalDetailsComplete(session),
    pillarsComplete: sumPillars(session.pillars) === 12,
    managerStyleComplete: managerStyleComplete(session),
    managerStep: session.managerStep,
    managerStepComplete: getManagerStepComplete(session),
    selectionReady: isSelectionReady(session.generation),
    clubPicked: selectedClubOf(session) !== null,
    committing: session.commit === "committing",
    onCancel: input.onCancel,
    onBackToLeagues: input.onBackToLeagues,
    onNextManagerSubStep: input.onNextManagerSubStep,
    onGoToClubSelection: input.onGoToClubSelection,
    onGoToReview: input.onGoToReview,
    onCreateCareer: input.onCreateCareer,
  };

  return describeCreationBottomBar(planInput);
}