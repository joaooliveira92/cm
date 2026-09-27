import type { CreationSession } from "../router/createSessionContext.js";

/** The personal-details sub-panel's required fields: the one predicate the in-panel stepper, the
 *  bottom bar, and the commit all gate on, so they cannot disagree about what "complete" means.
 *  The favorite team is deliberately absent — a manager need not support a club. */
export const personalDetailsComplete = (
  session: Pick<
    CreationSession,
    "saveName" | "firstName" | "lastName" | "nationalityId" | "dateOfBirth"
  >,
): boolean =>
  session.saveName.trim().length > 0 &&
  session.firstName.trim().length > 0 &&
  session.lastName.trim().length > 0 &&
  session.nationalityId !== null &&
  session.dateOfBirth.length > 0;
