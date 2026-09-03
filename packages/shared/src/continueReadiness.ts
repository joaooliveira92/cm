/**
 * Continue readiness — what the career loop has to say before the Calendar advances.
 *
 * The project ships no news feed or notification centre (see CONTEXT.md's Transfer Inbox entry):
 * what changed comes back on `AdvanceCalendarResult`, and what is *pending* is surfaced next to the
 * control it concerns. This module is the second half of that — the standing readiness check behind
 * Continue.
 *
 * It is pure and takes facts rather than fetching them, so the same rules can be unit-tested here
 * and evaluated in the renderer from atoms it already holds. No new RPC method exists for it.
 */

/** The Calendar's phases. Mirrors `SEASON_PHASES` in `@cm-clone/contracts`, restated because this
 * package deliberately does not depend on contracts (see `bestXi.ts` for the same posture). */
export type ReadinessSeasonPhase =
  | "pre_season"
  | "in_season"
  | "mid_window_open"
  | "season_complete";

/**
 * `blocking` stops the advance; `advisory` is a standing condition the player should know about but
 * which must not strand them. The distinction is deliberate: an advisory the player ignores has to
 * stay ignorable, or the affordance becomes a soft-lock.
 */
export type ReadinessSeverity = "blocking" | "advisory";

/** One thing worth saying before Continue. `id` is the stable handle the renderer maps to a route
 * or action — the copy is display text and is never matched on. */
export interface ReadinessItem {
  readonly id: string;
  readonly severity: ReadinessSeverity;
  readonly title: string;
  readonly detail: string;
}

/** Everything the assessment reads. Each field is a fact some caller already holds, so nothing here
 * requires a query built for this check. */
export interface ContinueReadinessFacts {
  readonly phase: ReadinessSeasonPhase;
  /** Whether the player's club has a persisted Tactic. `loadPersistedTactic` returns `null` for a
   * club that has never set one, which is every new career's starting state. */
  readonly hasTactic: boolean;
  /** A live match owns the loop until it finishes. */
  readonly matchInProgress: boolean;
  /** An advance is already in flight. */
  readonly advancing: boolean;
}

export interface ContinueReadiness {
  readonly canAdvance: boolean;
  /** Blockers first, then advisories; stable order within each group. Empty means nothing to say. */
  readonly items: ReadonlyArray<ReadinessItem>;
}

const BLOCKING: ReadonlyArray<{
  readonly id: string;
  readonly applies: (facts: ContinueReadinessFacts) => boolean;
  readonly title: string;
  readonly detail: string;
}> = [
  {
    id: "match-in-progress",
    applies: (facts) => facts.matchInProgress,
    title: "A match is in progress",
    // The sentence the career chrome already shows for this case — kept verbatim so adopting this
    // module changes what the player is told about a *new* condition only.
    detail: "The season cannot advance during a match.",
  },
  {
    // Acceptance criterion 6 — duplicate requests cannot advance twice. The disabled button is the
    // first line of defence; naming the condition here is what makes the refusal explainable.
    id: "advance-in-flight",
    applies: (facts) => facts.advancing,
    title: "Already advancing",
    detail: "The Calendar is still processing the previous advance.",
  },
  {
    id: "season-complete",
    applies: (facts) => facts.phase === "season_complete",
    title: "The season is complete",
    detail: "There are no further Matchdays to play in this season.",
  },
];

const ADVISORY: ReadonlyArray<{
  readonly id: string;
  readonly applies: (facts: ContinueReadinessFacts) => boolean;
  readonly title: string;
  readonly detail: string;
}> = [
  {
    // The sharpest unannounced gap in the career loop: every AI club is assigned a Tactic at season
    // start and the player's club is not, so `synthesizeDefaultTactic` quietly fills a 4-4-2 in and
    // the player's matches are played on a formation they never chose. Advisory rather than
    // blocking — the career is playable without a Tactic, so refusing to advance would punish a
    // player for a default the game picked for them.
    id: "no-tactic",
    applies: (facts) => !facts.hasTactic,
    title: "No Tactic set",
    detail: "Matches will be played with an automatic 4-4-2 until you set one.",
  },
];

/**
 * Classifies a career's readiness to advance. Blockers and advisories are both reported: a blocked
 * career still lists what else is outstanding, so resolving the blocker does not reveal a second
 * surprise.
 */
export const assessContinueReadiness = (
  facts: ContinueReadinessFacts,
): ContinueReadiness => {
  const blockers = BLOCKING.filter((rule) => rule.applies(facts));
  const advisories = ADVISORY.filter((rule) => rule.applies(facts));

  const items: ReadonlyArray<ReadinessItem> = [
    ...blockers.map((rule) => ({
      id: rule.id,
      severity: "blocking" as const,
      title: rule.title,
      detail: rule.detail,
    })),
    ...advisories.map((rule) => ({
      id: rule.id,
      severity: "advisory" as const,
      title: rule.title,
      detail: rule.detail,
    })),
  ];

  return { canAdvance: blockers.length === 0, items };
};
