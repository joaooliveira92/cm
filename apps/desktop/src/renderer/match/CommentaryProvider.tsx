import {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from "react";
import { clearScopeState, setScopeState } from "../actions/scopeState.js";
import { useMatchContext } from "./MatchProvider.js";
import {
  useCommentaryFeed,
  type CommentaryContextValue,
  type CommentaryState,
  type CommentaryActions,
  type CommentaryMeta,
} from "./hooks/useCommentaryFeed.js";

export type { CommentaryContextValue, CommentaryState, CommentaryActions, CommentaryMeta };
export type { RevealedInjury } from "./session.js";

export const CommentaryContext = createContext<CommentaryContextValue | null>(null);

export const CommentaryProvider = ({ children }: { readonly children: ReactNode }) => {
  const { state: matchState } = useMatchContext();
  const feed = useCommentaryFeed(matchState.saveId);

  const { state } = feed;

  const liveMatch = matchState.match;
  const inPlay = liveMatch !== null && matchState.phase !== "complete" && matchState.phase !== "committed";
  const homeClubName = liveMatch?.homeClubName;
  const awayClubName = liveMatch?.awayClubName;
  useEffect(() => {
    if (!inPlay || homeClubName === undefined || awayClubName === undefined) {
      clearScopeState("match");
      return;
    }
    setScopeState({ match: { homeClubName, awayClubName, homeScore: state.homeScore, awayScore: state.awayScore, currentMinute: state.currentMinute } });
  }, [inPlay, homeClubName, awayClubName, state.homeScore, state.awayScore, state.currentMinute]);
  useEffect(() => () => clearScopeState("match"), []);

  return <CommentaryContext.Provider value={feed}>{children}</CommentaryContext.Provider>;
};

export const useCommentaryContext = (): CommentaryContextValue => {
  const ctx = useContext(CommentaryContext);
  if (ctx === null) {
    throw new Error("useCommentaryContext must be used within a CommentaryProvider");
  }
  return ctx;
};