import type { CreationSession } from "../router/createSessionContext.js";

/** The Style & Appearance panel's required field: a formation. It starts unset, so this is the
 *  gate that makes choosing it a real step rather than a pre-filled default. The
 *  avatar is deliberately absent — a manager need not pick a portrait, and the colour scheme always
 *  has a value. */
export const managerStyleComplete = (
  session: Pick<CreationSession, "preferredFormation">,
): boolean => session.preferredFormation !== null;
