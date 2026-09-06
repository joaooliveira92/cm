/**
 * What one press of Continue did — the account the player reads afterwards.
 *
 * The Calendar advance already returns everything it changed, and for a long time the renderer threw
 * that value away and rendered only whether a request was in flight. The season readout moved and the
 * player was left to infer why. This module is the missing half: one press, one structured result.
 *
 * Two rules from the career-loop note shape it, and both are load-bearing.
 *
 * **The stop set is exactly the fields the advance reports.** Nothing here infers a consequence by
 * comparing before-and-after snapshots. If a fact is not on the result it does not appear, which is
 * also why the surface must never promise that Continue stops whenever something needs attention —
 * individual injuries, Condition changes, and squad movement all pass silently and stay visible on
 * the screens that own them.
 *
 * **Priority orders the display and never selects.** Several consequences arrive on one press at a
 * season's end, and the note fixes which one speaks first; every other one is still listed.
 *
 * Pure and fact-taking, like [continueReadiness](./continueReadiness.ts) beside it, so what the
 * player is told is testable without mounting a shell. The destination is a screen name the renderer
 * maps to a route: a consequence carries where its fix or detail lives, rather than a component
 * matching on copy to decide.
 */
import { formatCalendarDate } from "../season/calendar.js";

/** Where a consequence's detail lives. Mirrors the renderer's career destinations; restated because
 *  this package deliberately does not depend on the renderer or on contracts. */
export type ContinueDestination = "league" | "transfers" | "seasonSummary" | "manager" | "news";

/** One thing an advance did. `id` is the stable handle; the copy is display text, never matched on. */
export interface ContinueConsequence {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  /** The screen that owns this consequence, or `null` when routing there would offer an action the
   *  domain forbids — a closed Transfer Window being the case that forces the distinction. */
  readonly destination: ContinueDestination | null;
}

/** Everything the account reads. Each field is one the advance's result already carries.
 *
 * Deliberately no season number. The result's season is the one the Calendar now stands in, which
 * at a conclusion is the *next* one — the rollover runs in the same transaction — so naming a
 * number here would label the season that just ended with the number of the one that just began.
 * The copy says "the season" and stays true. */
export interface ContinueOutcomeFacts {
  /** The date the advance landed on, or `null` when it stopped at a Transfer Window's open. */
  readonly resolvedDate: string | null;
  readonly transferWindowClosed: string | null;
  readonly transferWindowOpened: string | null;
  readonly seasonConcluded: boolean;
  readonly boardObjectiveVerdict: string | null;
  readonly managerOutcome: string;
}

export interface ContinueOutcome {
  /** Why Continue stopped: the highest-priority consequence's title. */
  readonly headline: string;
  /** Priority-ordered, never filtered. Empty when the press reported nothing. */
  readonly consequences: readonly ContinueConsequence[];
}

const WINDOW_WORDS: Readonly<Record<string, string>> = {
  pre_season: "pre-season",
  mid_season: "mid-season",
};

const windowWord = (window: string): string => WINDOW_WORDS[window] ?? window;

const VERDICT_WORDS: Readonly<Record<string, string>> = {
  exceeded: "You beat the board's objective",
  met: "You met the board's objective",
  missed: "You missed the board's objective",
};

/**
 * In the note's priority order: manager outcome, board verdict, season conclusion, Matchday result,
 * Transfer Window transition. A rule that does not apply contributes nothing; one that does is
 * appended in this order, so the array's order *is* the priority.
 */
export const describeContinueOutcome = (facts: ContinueOutcomeFacts): ContinueOutcome => {
  const consequences: ContinueConsequence[] = [];

  // Highest priority: it can change whether the career continues in its current form.
  if (facts.managerOutcome === "sacked") {
    consequences.push({
      id: "manager-outcome",
      title: "You have been sacked",
      detail: "The board has ended your tenure. This career is closed.",
      destination: "manager",
    });
  } else if (facts.managerOutcome === "warned") {
    consequences.push({
      id: "manager-outcome",
      title: "The board has warned you",
      detail: "Another season short of the objective ends your tenure.",
      destination: "manager",
    });
  }

  // An authoritative judgment of the manager's performance, never a line tucked under something else.
  if (facts.boardObjectiveVerdict !== null) {
    consequences.push({
      id: "board-verdict",
      title: VERDICT_WORDS[facts.boardObjectiveVerdict] ?? "The board has judged your season",
      detail: "The summary has the objective, the band, and where you finished.",
      destination: "seasonSummary",
    });
  }

  if (facts.seasonConcluded) {
    consequences.push({
      id: "season-concluded",
      title: "The season is over",
      detail: "Every competition has finished. The summary has the final tables.",
      destination: "seasonSummary",
    });
  }

  if (facts.resolvedDate !== null) {
    consequences.push({
      id: "matchday-resolved",
      title: "The Matchday was played",
      detail: `Every fixture due on or before ${formatCalendarDate(facts.resolvedDate)} has been resolved.`,
      destination: "league",
    });
  }

  if (facts.transferWindowOpened !== null) {
    consequences.push({
      id: "transfer-window-opened",
      title: `The ${windowWord(facts.transferWindowOpened)} Transfer window is open`,
      detail: "You can bid for players and answer bids until it closes.",
      destination: "transfers",
    });
  }

  if (facts.transferWindowClosed !== null) {
    consequences.push({
      id: "transfer-window-closed",
      title: `The ${windowWord(facts.transferWindowClosed)} Transfer window has closed`,
      // No destination, deliberately: the domain rejects a transfer command now, and a link to
      // Transfers would imply the player can still act on whatever they left unfinished.
      detail: "Transfers are no longer legal until the next window opens.",
      destination: null,
    });
  }

  return {
    // "The Calendar advanced" is the honest floor. It is reachable — an advance that only crosses a
    // window's open on a save with nothing due reports no consequence at all — and saying nothing
    // would leave the player wondering whether the press registered.
    headline: consequences[0]?.title ?? "The Calendar advanced",
    consequences,
  };
};
