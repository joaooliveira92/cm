import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MatchPitchView, MatchSummary, SaveId, SubstitutionStatusView } from "@cm-clone/contracts";
import { controlledOnPitchCount, controlledPitch, controlledSubs } from "../controlledClub.js";
import { recordClubSubs, recordRevealedScore, type RevealedScore } from "../session.js";
import type { ReadProjection, ReadView } from "../stream.js";

/** What the match reports when it has never reported a substitution count — a fresh panel is not
 *  "nothing used up yet", it is "not known yet", which is why `subsKnown` is a separate flag. */
const NO_SUBS: SubstitutionStatusView = {
  used: 0,
  remaining: 5,
  windowsUsed: 0,
  windowsRemaining: 3,
  capReached: false,
};

export interface ControlledClubState {
  readonly homeScore: number;
  readonly awayScore: number;
  readonly subs: SubstitutionStatusView;
  readonly subsKnown: boolean;
  readonly onPitchCount: number;
  readonly pitch: MatchPitchView | null;
}

export interface ControlledClubView {
  readonly state: ControlledClubState;
  /** Reads a response as the controlled club's view of the match at `stamp`. */
  readonly read: ReadProjection;
  /** The substitution cap as of the last applied count. An injury is stamped with it when revealed, so
   *  a decision the manager was shown keeps the cap it was shown under. */
  readonly capReached: () => boolean;
}

/**
 * The controlled club's view of the match: score, head-count, pitch and substitution counts, whichever
 * side it plays.
 *
 * Every response describes the match as of the *request's* revealed position, and reads arrive out of
 * order, so each carries the `stamp` it was sent with and a response older than the last applied one is
 * dropped. A response never rolls the score or the pitch backwards.
 */
export const useControlledClub = ({
  saveId,
  match,
  restoredScore,
  restoredSubs,
}: {
  readonly saveId: SaveId;
  readonly match: MatchSummary | null;
  readonly restoredScore: RevealedScore;
  readonly restoredSubs: SubstitutionStatusView | null;
}): ControlledClubView => {
  const [homeScore, setHomeScore] = useState(restoredScore.homeScore);
  const [awayScore, setAwayScore] = useState(restoredScore.awayScore);
  const [subs, setSubs] = useState<SubstitutionStatusView>(restoredSubs ?? NO_SUBS);
  const [subsKnown, setSubsKnown] = useState(restoredSubs !== null);
  const [onPitchCount, setOnPitchCount] = useState(11);
  const [pitch, setPitch] = useState<MatchPitchView | null>(null);
  const subsRef = useRef<SubstitutionStatusView>(restoredSubs ?? NO_SUBS);
  const capReachedRef = useRef(restoredSubs?.capReached ?? false);
  const appliedStampRef = useRef(0);

  // A read can land after this provider is gone. Recording it then would write the revealed position of
  // a match the manager has already left.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const applySubs = useCallback(
    (view: ReadView, neverLower: boolean): void => {
      if (match === null) return;
      const reported = controlledSubs(match, view);
      const next = neverLower && reported.used < subsRef.current.used ? subsRef.current : reported;
      subsRef.current = next;
      setSubs(next);
      setSubsKnown(true);
      if (mountedRef.current) recordClubSubs(saveId, match.matchId, next);
    },
    [saveId, match],
  );

  const applyScoreAndPitch = useCallback(
    (view: ReadView, stamp: number): void => {
      if (match === null || stamp < appliedStampRef.current) return;
      appliedStampRef.current = stamp;
      setHomeScore(view.homeScore);
      setAwayScore(view.awayScore);
      setOnPitchCount(controlledOnPitchCount(match, view));
      setPitch(controlledPitch(match, view));
      if (mountedRef.current) {
        recordRevealedScore(saveId, match.matchId, { homeScore: view.homeScore, awayScore: view.awayScore });
      }
    },
    [saveId, match],
  );

  useEffect(() => {
    capReachedRef.current = subs.capReached;
  }, [subs.capReached]);

  const polled = useCallback(
    (view: ReadView, stamp: number): void => {
      applySubs(view, true);
      applyScoreAndPitch(view, stamp);
    },
    [applySubs, applyScoreAndPitch],
  );

  const commanded = useCallback(
    (view: ReadView, stamp: number): void => {
      applySubs(view, false);
      applyScoreAndPitch(view, stamp);
    },
    [applySubs, applyScoreAndPitch],
  );

  // Stable identities: the feed's re-read effect depends on `read`, so an object minted per render
  // would re-read the match on every render for ever.
  const read = useMemo((): ReadProjection => ({ polled, commanded }), [polled, commanded]);
  const capReached = useMemo(() => (): boolean => capReachedRef.current, []);

  return useMemo(
    (): ControlledClubView => ({
      state: { homeScore, awayScore, subs, subsKnown, onPitchCount, pitch },
      read,
      capReached,
    }),
    [homeScore, awayScore, subs, subsKnown, onPitchCount, pitch, read, capReached],
  );
};
