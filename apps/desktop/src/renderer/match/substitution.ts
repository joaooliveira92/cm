import type { SubstitutionStatusView } from "@cm-clone/contracts";

/**
 * Renderer-side validation for the match-day live substitution flow (match-day
 * keyboard note, AC-33). The caps are REPORTED by the server (`subsStatus` on
 * every poll) and authoritative — this is a UX guard only, never a permission
 * gate; the Match Decider still enforces the real rules. Its job is to turn a
 * would-be silent no-op (pressing Make substitution with an invalid pair) into
 * a visible reason, and to give the Enter/Escape panel-scoped bindings one
 * pure decision to read.
 */
export type SubstitutionError =
  | "no-out"
  | "no-in"
  | "same-player"
  | "cap-reached"
  | "no-subs-remaining"
  | "no-window-remaining";

export interface SubstitutionValidation {
  readonly ok: boolean;
  readonly error?: SubstitutionError;
}

/** Validate a live substitution draft against the two-step selection and the
 *  server-reported caps. Pure — unit-tested in isolation. */
export const validateLiveSubstitution = (
  subsStatus: SubstitutionStatusView,
  outPlayerId: string,
  inPlayerId: string,
): SubstitutionValidation => {
  if (outPlayerId === "") return { ok: false, error: "no-out" };
  if (inPlayerId === "") return { ok: false, error: "no-in" };
  if (outPlayerId === inPlayerId) return { ok: false, error: "same-player" };
  if (subsStatus.capReached) return { ok: false, error: "cap-reached" };
  if (subsStatus.remaining <= 0) return { ok: false, error: "no-subs-remaining" };
  if (subsStatus.windowsRemaining <= 0) return { ok: false, error: "no-window-remaining" };
  return { ok: true };
};

/** Plain-language reason for an invalid live substitution draft (never silent). */
export const substitutionErrorLabel = (error: SubstitutionError): string => {
  switch (error) {
    case "no-out":
      return "Choose the player coming off first.";
    case "no-in":
      return "Choose the player coming on.";
    case "same-player":
      return "The player coming on must be a different player from the one coming off.";
    case "cap-reached":
      return "The substitution cap is reached — no further changes live.";
    case "no-subs-remaining":
      return "All five substitutions have been used.";
    case "no-window-remaining":
      return "All three substitution windows have been used.";
  }
};