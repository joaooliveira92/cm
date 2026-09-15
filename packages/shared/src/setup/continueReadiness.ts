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
import type { ContinueDestination } from "./continueOutcome.js";

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

/** One thing worth saying before Continue. `id` is the stable handle; the copy is display text and
 * is never matched on.
 *
 * `destination` is the screen that owns the fix, carried by the item rather than derived by whatever
 * renders it. An item that says what is outstanding and leaves finding it to the player is a notice,
 * not an affordance — and a component that mapped copy to a route would break the moment the copy
 * was reworded. `null` means there is nothing to open: the condition clears itself. */
export interface ReadinessItem {
  readonly id: string;
  readonly severity: ReadinessSeverity;
  readonly title: string;
  readonly detail: string;
  readonly destination: ContinueDestination | null;
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
  readonly destination: ContinueDestination | null;
}

const BLOCKING: ReadonlyArray<ReadinessRule> = [
  {
    id: "match-in-progress",
    applies: (facts) => facts.matchInProgress,
    title: "A match is in progress",
    // The sentence the career chrome already shows for this case — kept verbatim so adopting this
    // module changes what the player is told about a *new* condition only.
    detail: () => "The season cannot advance during a match.",
    destination: "match",
  },
  {
    // Acceptance criterion 6 — duplicate requests cannot advance twice. The disabled button is the
    // first line of defence; naming the condition here is what makes the refusal explainable.
    id: "advance-in-flight",
    applies: (facts) => facts.advancing,
    title: "Already advancing",
    detail: () => "The Calendar is still processing the previous advance.",
    // Nothing to open: this clears itself when the advance returns.
    destination: null,
  },
  {
    id: "season-complete",
    applies: (facts) => facts.phase === "season_complete",
    title: "The season is complete",
    detail: () => "There are no further Matchdays to play in this season.",
    destination: "seasonSummary",
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
    destination: "transfers",
  },
  {
    // Advisory *here* and blocking at the match boundary, which is the whole of the boundary-aware
    // rule: a career several Matchdays from its first kickoff must not be gated on a Tactic, and
    // the Fixture itself must not be crossable without one. See `assessMatchReadiness` below.
    //
    // The copy no longer promises an automatic 4-4-2. It used to be true — `synthesizeDefaultTactic`
    // quietly filled one in — and that silent substitution is exactly what this effort deleted.
    id: "no-tactic",
    applies: (facts) => !facts.hasTactic,
    title: "No Tactic set",
    detail: () => "You will not be able to play your next Fixture until you set one.",
    destination: "tactics",
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
      destination: rule.destination,
    })),
    ...advisories.map((rule) => ({
      id: rule.id,
      severity: "advisory" as const,
      title: rule.title,
      detail: rule.detail(facts),
      destination: rule.destination,
    })),
  ];

  return { canAdvance: blockers.length === 0, items };
};

// ---------------------------------------------------------------------------
// Match readiness — the gate at the pre-match boundary
// ---------------------------------------------------------------------------

/**
 * What blocks *crossing into* the human's Fixture, as opposed to what blocks the Calendar in
 * general. The two are deliberately different questions: incomplete preparation must not gate a
 * career several Matchdays before its first kickoff, but it must not be crossable either.
 *
 * These rules are evaluated twice — advisorily when the boundary is read, and authoritatively when
 * Play or Quick result is requested. The second evaluation is the integrity boundary; the first is
 * a courtesy, because the player may repair a blocker a moment after reading it.
 */
export interface MatchReadinessFacts {
  /** Whether the human club has a persisted Tactic. A new career starts without one. */
  readonly hasTactic: boolean;
  /** Slots naming players who are no longer in the squad — a Tactic outlived by a transfer. */
  readonly missingSlotPlayers: number;
}

export interface MatchReadiness {
  readonly canPlay: boolean;
  readonly blockers: ReadonlyArray<ReadinessItem>;
}

/**
 * The line this draws is between strategic failure and accidental failure. A weak formation, an
 * unbalanced selection, a tired but legally selectable player are all valid preparation and are not
 * listed here — their consequences are the player's to own. Only structurally absent or invalid
 * required state blocks, because a match resolved on state the player never chose teaches nothing.
 */
const MATCH_BLOCKING: ReadonlyArray<{
  readonly id: string;
  readonly applies: (facts: MatchReadinessFacts) => boolean;
  readonly title: string;
  readonly detail: (facts: MatchReadinessFacts) => string;
  readonly destination: ContinueDestination | null;
}> = [
  {
    id: "no-tactic",
    applies: (facts) => !facts.hasTactic,
    title: "No Tactic set",
    detail: () => "Your club has no Tactic. Set one before this Fixture can be played.",
    destination: "tactics",
  },
  {
    // A Tactic is eleven slots by construction, so a slot whose player has left is the only way the
    // human club can arrive at kickoff unable to field a legal eleven. Checking the slots is
    // therefore also the minimum-squad check, without inventing a squad-size rule the domain does
    // not have.
    id: "tactic-names-departed-players",
    applies: (facts) => facts.missingSlotPlayers > 0,
    title: "Your Tactic names players who have left",
    detail: (facts) =>
      `${facts.missingSlotPlayers === 1 ? "One slot names a player" : `${facts.missingSlotPlayers} slots name players`} no longer in your squad. Fill ${facts.missingSlotPlayers === 1 ? "it" : "them"} before kickoff.`,
    destination: "tactics",
  },
];

/** Classifies whether the human's pending Fixture may be resolved, and why not when it may not. */
export const assessMatchReadiness = (facts: MatchReadinessFacts): MatchReadiness => {
  const blockers = MATCH_BLOCKING.filter((rule) => rule.applies(facts)).map((rule) => ({
    id: rule.id,
    severity: "blocking" as const,
    title: rule.title,
    detail: rule.detail(facts),
    destination: rule.destination,
  }));
  return { canPlay: blockers.length === 0, blockers };
};
