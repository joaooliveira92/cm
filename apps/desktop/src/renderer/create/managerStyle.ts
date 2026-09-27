import type { CreationSession } from "../router/createSessionContext.js";

/** The Style & Appearance panel's required fields: a formation and a style. They start unset, so
 *  this is the gate that makes choosing them a real step rather than a pre-filled default. The
 *  avatar is deliberately absent — a manager need not pick a portrait, and the colour scheme always
 *  has a value. */
export const managerStyleComplete = (
  session: Pick<CreationSession, "preferredFormation" | "preferredStyleId">,
): boolean => session.preferredFormation !== null && session.preferredStyleId !== null;
