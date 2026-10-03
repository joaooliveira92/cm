import type { CreationSession, ManagerSubStep } from "../router/createSessionContext.js";

/**
 * Step guard and navigation logic for the creation flow.
 *
 * These functions encapsulate the logic that decides whether a step transition is valid
 * and how to handle the transition. They are extracted from the main `useCreateSession`
 * hook to improve locality and separation of concerns.
 */

/**
 * Determines whether a manager sub-step is reachable from the current session state.
 *
 * Sub-panel 1 (personal details) is always reachable.
 * Sub-panel 2 requires complete personal details.
 * Sub-panel 3 requires complete personal details and all 12 pillar points spent.
 */
export const canReachManagerStep = (
  current: Pick<CreationSession, "managerStep" | "firstName" | "lastName" | "nationalityId" | "dateOfBirth" | "pillars">,
  next: ManagerSubStep,
): boolean => {
  if (next === 1) return true;
  if (next === 2) return personalDetailsComplete(current);
  return personalDetailsComplete(current) && pillarsComplete(current);
};

/**
 * Advances to the next manager sub-step.
 *
 * Validates the transition using `canReachManagerStep` before calling `update`.
 */
export const advanceManagerStep = (
  session: CreationSession,
  update: (patch: Partial<CreationSession>) => void,
): void => {
  const current = session;
  const next = (current.managerStep + 1) as ManagerSubStep;
  if (next > 3 || !canReachManagerStep(current, next)) return;
  update({ managerStep: next });
};

/**
 * Updates the manager step in the session.
 *
 * Validates the transition using `canReachManagerStep` before allowing the update.
 */
export const setManagerStep = (
  session: CreationSession,
  next: ManagerSubStep,
  update: (patch: Partial<CreationSession>) => void,
): void => {
  if (!canReachManagerStep(session, next)) return;
  update({ managerStep: next });
};

/**
 * Checks whether the personal-details sub-panel has a save name.
 */
export const personalDetailsComplete = (
  session: Pick<CreationSession, "firstName" | "lastName" | "nationalityId" | "dateOfBirth">,
): boolean => {
  return session.firstName.trim().length > 0 &&
         session.lastName.trim().length > 0 &&
         session.nationalityId !== null &&
         session.dateOfBirth.length > 0;
};

/**
 * Checks whether the pillar budget has been fully spent.
 */
export const pillarsComplete = (
  session: Pick<CreationSession, "pillars">,
): boolean => {
  return Object.values(session.pillars).reduce((total, value) => total + value, 0) === 12;
};