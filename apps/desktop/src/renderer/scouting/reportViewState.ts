import type { TeamScoutReportView } from "@cm-clone/contracts";

/**
 * The Team Scout Report's distinct view states, and the pure rule that keeps the screen honest
 * against an asynchronous read of a club the manager may already have navigated away from.
 *
 * Every state traces to a real, distinguishable cause rather than to a shade of the same one —
 * spec §10 asks the screen to tell "no data" apart from "unavailable entity" apart from
 * "permission denied", and on this screen those are three different answers a manager acts on
 * differently:
 *
 * - `loading` — nothing read yet.
 * - `ready` — a report is on screen.
 * - `refreshing` — a report is on screen and a re-read is in flight. Distinct from `loading`
 *   because the previous reading stays readable throughout (spec §10's "preserve the last valid
 *   view during recoverable refresh failures").
 * - `empty` — the club exists and nobody has scouted it. "Go and look", not "they have no
 *   strengths"; this is `ClubNotScoutedError`, which is a failure on the wire precisely so it
 *   cannot be confused with a report full of empty lists.
 * - `permission-limited` — the Archived Save's read-only refusal, the same guard the Tactics
 *   overview uses. Not a new concept.
 * - `unavailable` — no such club in this save (`ClubNotFoundError`). The entity, not the
 *   knowledge, is missing.
 * - `error` — anything else: a transport failure, a contract decode failure, a missing save.
 *
 * **`filtered_empty` is deliberately absent.** Spec §7 lists it, but this first pass has no
 * filters, so no arrangement of the screen can produce "no rows match". Modelling it anyway would
 * add a state no test could reach and no manager could ever see, which is worse than naming its
 * absence here. It arrives with the filters, not before.
 */
export type ReportViewState =
  | "loading"
  | "ready"
  | "refreshing"
  | "empty"
  | "permission-limited"
  | "unavailable"
  | "error";

/** The outcome of deciding whether an arriving report may replace the one on screen. */
export interface ReportAdmission {
  /** The report the screen should now render. */
  readonly rendered: TeamScoutReportView | null;
  /** `false` when the arriving response was for a different club and was discarded untouched. */
  readonly admitted: boolean;
}

/**
 * Admit an arriving report only if it describes the club the screen is currently aimed at.
 *
 * The report carries no revision to order responses by, so the club it names *is* the
 * discriminator — and it is the one that matters here, because the stale response this screen can
 * actually produce is a slow read for the club the manager just navigated away from. Rendering it
 * would put one club's name above another club's findings, which is worse than showing nothing:
 * the manager has no way to tell it happened.
 *
 * A response for the right club always wins, even if an older one is already shown. There is no
 * "conflicted" state to hold it behind: two reports for the same club at different calendar dates
 * are not in conflict, they are simply the newer reading, and the screen has no unsaved work a
 * silent replacement could destroy.
 */
export const admitReport = (
  rendered: TeamScoutReportView | null,
  incoming: TeamScoutReportView,
  requestedClubId: string,
): ReportAdmission => {
  if (incoming.targetClubId !== requestedClubId) return { rendered, admitted: false };
  return { rendered: incoming, admitted: true };
};

/** Everything `reportViewState` needs; the screen already holds all of it. */
export interface ReportViewStateInput {
  /** The report currently rendered (the last admitted response). */
  readonly rendered: TeamScoutReportView | null;
  /** Whether a read is in flight. */
  readonly waiting: boolean;
  /** The `_tag` of the RPC's typed failure, when the read failed. */
  readonly failureTag: string | null;
  /** Whether the save is an Archived Save, from the saved-state guard. */
  readonly archived: boolean;
}

/**
 * Pick the state, in a fixed precedence.
 *
 * A failure that arrives while a report is already on screen does NOT blank it: `refreshing` wins
 * over a recoverable failure, which is spec §10's rule. Only a failure with nothing to fall back
 * on becomes one of the three failure states.
 */
export const reportViewState = (input: ReportViewStateInput): ReportViewState => {
  if (input.rendered === null) {
    if (input.failureTag === "ClubNotScoutedError") return "empty";
    if (input.failureTag === "ClubNotFoundError") return "unavailable";
    if (input.failureTag !== null) return "error";
    return "loading";
  }
  if (input.archived) return "permission-limited";
  return input.waiting ? "refreshing" : "ready";
};
