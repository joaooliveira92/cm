/**
 * Continue readiness — what the career loop has to say before the Calendar advances.
 *
 * The News Inbox is a career record rather than a work queue — nothing in it waits on the manager,
 * and it never interrupts the loop. So what changed still comes back on `AdvanceCalendarResult`, and
 * what is *pending* is still surfaced next to the control it concerns. This module is the second
 * half of that — the standing readiness check behind Continue. "An unread message exists" is
 * deliberately not a stop condition; see the news-inbox note.
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
  /** Bids from AI clubs for this club's players that the manager has not answered. The only
   *  decision in the game that waits on the manager, and the only readiness fact whose condition
   *  the advance itself resolves — by lapsing them. */
  readonly pendingIncomingBids: number;
}

export interface ContinueReadiness {
  readonly canAdvance: boolean;
  /** Blockers first, then advisories; stable order within each group. Empty means nothing to say. */
  readonly items: ReadonlyArray<ReadinessItem>;
}

interface ReadinessRule {
  readonly id: string;
  readonly applies: (facts: ContinueReadinessFacts) => boolean;
  readonly title: string;
  /** A function rather than a string because a rule may need to name a count. */
  readonly detail: (facts: ContinueReadinessFacts) => string;
}

const BLOCKING: ReadonlyArray<ReadinessRule> = [
  {
    id: "match-in-progress",
    applies: (facts) => facts.matchInProgress,
    title: "A match is in progress",
    // The sentence the career chrome already shows for this case — kept verbatim so adopting this
    // module changes what the player is told about a *new* condition only.
    detail: () => "The season cannot advance during a match.",
  },
  {
    // Acceptance criterion 6 — duplicate requests cannot advance twice. The disabled button is the
    // first line of defence; naming the condition here is what makes the refusal explainable.
    id: "advance-in-flight",
    applies: (facts) => facts.advancing,
    title: "Already advancing",
    detail: () => "The Calendar is still processing the previous advance.",
  },
  {
    id: "season-complete",
    applies: (facts) => facts.phase === "season_complete",
    title: "The season is complete",
    detail: () => "There are no further Matchdays to play in this season.",
  },
];

/**
 * Ordered by which one a single-slot surface should show: the career band renders only the first
 * advisory, so the one the advance itself *destroys* has to outrank the standing condition that
 * will still be true afterwards.
 */
const ADVISORY: ReadonlyArray<ReadinessRule> = [
  {
    // The first decision in this game that waits on the manager. Advisory rather than blocking:
    // letting a bid lapse is a legitimate answer, and blocking Continue on it would turn a
    // negotiation the player may not care about into a soft-lock.
    //
    // The detail names the consequence rather than just the count, because this is the one advisory
    // the advance itself *resolves* — pressing Continue lapses every bid named here, and an
    // advisory that did not say so would be a trap rather than a notice.
    id: "bids-awaiting-response",
    applies: (facts) => facts.pendingIncomingBids > 0,
    title: "Bids awaiting your response",
    detail: (facts) =>
      `${facts.pendingIncomingBids === 1 ? "A club has" : `${facts.pendingIncomingBids} clubs have`} bid for your players. Advancing lets ${facts.pendingIncomingBids === 1 ? "it" : "them"} lapse.`,
  },
  {
    // The sharpest unannounced gap in the career loop: every AI club is assigned a Tactic at season
    // start and the player's club is not, so `synthesizeDefaultTactic` quietly fills a 4-4-2 in and
    // the player's matches are played on a formation they never chose. Advisory rather than
    // blocking — the career is playable without a Tactic, so refusing to advance would punish a
    // player for a default the game picked for them.
    id: "no-tactic",
    applies: (facts) => !facts.hasTactic,
    title: "No Tactic set",
    detail: () => "Matches will be played with an automatic 4-4-2 until you set one.",
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
      detail: rule.detail(facts),
    })),
    ...advisories.map((rule) => ({
      id: rule.id,
      severity: "advisory" as const,
      title: rule.title,
      detail: rule.detail(facts),
    })),
  ];

  return { canAdvance: blockers.length === 0, items };
};
