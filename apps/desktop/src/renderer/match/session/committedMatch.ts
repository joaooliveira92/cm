import type { MatchId, MatchSummary, SaveId } from "@cm-clone/contracts";
import { notify } from "./activeMatch.js";
import type { CommittedMatch, RevealedScore } from "./types.js";

/**
 * The match a save has just had accepted, kept after `clearActiveMatch` takes the live session away.
 *
 * Accept result ends the live session by design: the scoreboard header keys off it, and the mid-match
 * commands and the suspended Continue do too. But the match screens stay open on the result, and their
 * tab bar, the scoreboard, the Possession bar and the post-match Summary still name that match. This is
 * the single-slot store that carries it — and its final score, which `MatchSummary` does not hold —
 * from the commit until the next kickoff, the way `activeMatch` carries the live one. In memory only,
 * like the session it outlives. It shares the session's notification bus (`notify` /
 * `subscribeActiveMatch`), so a write here re-renders every active-match subscriber too.
 */
let committed: CommittedMatch | null = null;

export const setCommittedMatch = (saveId: SaveId, match: MatchSummary, score: RevealedScore): void => {
  committed = { saveId, match, score };
  notify();
};

export const getCommittedMatch = (saveId: SaveId): CommittedMatch | null =>
  committed !== null && committed.saveId === saveId ? committed : null;

export const clearCommittedMatch = (saveId: SaveId): void => {
  if (committed !== null && committed.saveId === saveId) {
    committed = null;
    notify();
  }
};

/**
 * Whether the Fixture now awaiting a kickoff supersedes the committed match. The season read keeps
 * naming the just-accepted Fixture while its post-commit refresh is in flight, so only a genuinely
 * different Fixture ends the context: a different match id, or an unstarted one whose id is not yet
 * set. No awaiting Fixture at all is the post-match state itself and supersedes nothing.
 */
export const supersededByAwaiting = (
  committed: CommittedMatch,
  awaiting: { readonly matchId: MatchId | null } | null,
): boolean => awaiting !== null && awaiting.matchId !== committed.match.matchId;
