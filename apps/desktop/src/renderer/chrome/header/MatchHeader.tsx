/**
 * The career header while a match is on: from kickoff until the next Fixture is awaited, the whole
 * band — both rows — becomes the match scoreboard, reading `FT` and the final score once the result is
 * accepted. Search, Preferences, Save and Continue step aside (Continue is suspended mid-match anyway,
 * and the scoreboard itself leads back to Match day), and the season readout under it goes with them.
 * What stays is how the manager moves: the sidebar toggle and back/forward.
 *
 * It follows the match session rather than the Match day screen, so it holds on every screen the
 * manager visits mid-match — Tactics, Substitutions, anywhere — and, from the committed store, on
 * every post-match tab until a new Fixture is awaited.
 */
import { useSyncExternalStore, type ReactNode } from "react";
import type { SaveId } from "@cm-clone/contracts";
import {
  getActiveMatch,
  getAtHalfTime,
  getCommittedMatch,
  getRevealedMinute,
  getRevealedScore,
  subscribeActiveMatch,
  type ActiveMatchSession,
  type RevealedScore,
} from "../../match/session.js";
import { Scoreboard } from "../../match/Scoreboard.js";
import { navigate } from "../../navigation/adapter.js";
import { DRAG, NO_DRAG } from "./drag-region.js";
import { trafficLightInset } from "./platform.js";

export interface MatchScoreboardState {
  readonly session: ActiveMatchSession;
  readonly score: RevealedScore | null;
  readonly minute: number;
  readonly atHalfTime: boolean;
  /** True when this is the accepted match's scoreboard from the committed store, not a live session. */
  readonly committed: boolean;
}

/** The save's match in play, or the one just accepted, and what is known of it; null when neither. */
export const useMatchScoreboard = (saveId: SaveId): MatchScoreboardState | null => {
  const session = useSyncExternalStore(subscribeActiveMatch, () => getActiveMatch(saveId));
  const committed = useSyncExternalStore(subscribeActiveMatch, () => getCommittedMatch(saveId));
  const score = useSyncExternalStore(subscribeActiveMatch, () => getRevealedScore(saveId));
  const minute = useSyncExternalStore(subscribeActiveMatch, () => getRevealedMinute(saveId));
  const atHalfTime = useSyncExternalStore(subscribeActiveMatch, () => getAtHalfTime(saveId));
  if (session !== null) return { session, score, minute, atHalfTime, committed: false };
  if (committed !== null) {
    return {
      session: { saveId: committed.saveId, match: committed.match, phase: "committed" },
      score: committed.score,
      minute: 90,
      atHalfTime: false,
      committed: true,
    };
  }
  return null;
};

/** `FT` once every event is revealed, `HT` at the break, otherwise the revealed minute. */
export const matchClock = (state: Pick<MatchScoreboardState, "minute" | "atHalfTime"> & {
  readonly complete: boolean;
}): string => {
  if (state.complete) return "FT";
  if (state.atHalfTime) return "HT";
  return `${state.minute}'`;
};

export const MatchHeader = ({
  saveId,
  state,
  leading,
}: {
  readonly saveId: SaveId;
  readonly state: MatchScoreboardState;
  /** The sidebar toggle and back/forward, as the ordinary header renders them. */
  readonly leading: ReactNode;
}) => {
  const { match, phase } = state.session;
  return (
    <header
      className={`flex h-(--header-height) w-full shrink-0 items-stretch gap-3 border-b border-header-border bg-header-bg py-2 pr-3 text-header-fg select-none ${trafficLightInset()}`}
      style={DRAG}
    >
      {/* Aligned with the traffic lights, which sit in the top 44px of the window. */}
      <div className="-mt-2 flex h-11 shrink-0 items-center" style={NO_DRAG}>
        {leading}
      </div>
      <div className="flex min-w-0 flex-1" style={NO_DRAG}>
        <Scoreboard
          home={{ name: match.homeClubName, colours: match.homeClubColours, score: state.score?.homeScore ?? 0 }}
          away={{ name: match.awayClubName, colours: match.awayClubColours, score: state.score?.awayScore ?? 0 }}
          status={matchClock({ ...state, complete: phase === "complete" || phase === "committed" })}
          onOpen={() => navigate({ type: "match", saveId })}
        />
      </div>
    </header>
  );
};
