/**
 * What the career navbar names in its identity slot when a screen is about something other than
 * the manager's club. A player screen sets the player here, so the navbar reads "Florian David
 * (Benfica)" with the position / nationality / age line beneath, in place of the club name, and
 * the band below it reports the player's facts in place of the calendar and standing.
 *
 * Module-level for the same reason as `screenToolbarControls`: the navbar sits above the route
 * outlet, so a screen cannot hand it props.
 *
 * One publisher serves all three noun kinds the identity slot can hold. A player screen sets the
 * player variant, which also replaces the career band with the player's metrics. A club-scoped
 * screen sets the club variant when it is showing a club that is not the manager's own, painting
 * that club's badge and colours in place of the manager's crest while the band keeps the manager's
 * own calendar and standing. A competition screen sets the competition variant, showing the
 * competition name and a qualifier line (kind · nation · season) in the identity slot.
 */
import type { ClubColoursView } from "@cm-clone/contracts";
import { useEffect } from "react";
import type { HeaderCompetition, HeaderPlayer } from "./chrome/header/career-header-state.js";

export type ScreenIdentity = PlayerScreenIdentity | ClubScreenIdentity | CompetitionScreenIdentity;

/** A player in the identity slot: name, club and the facts line beneath, plus the band's player
 *  metrics in the secondary row. */
export interface PlayerScreenIdentity {
  readonly kind: "player";
  readonly name: string;
  readonly qualifier: string;
  readonly facts: string;
  readonly player: HeaderPlayer;
}

/** A club that is not the manager's own, named by a club-scoped screen: the name, the marker, and
 *  the colours the badge and name paint. The career band keeps the manager's own readout. */
export interface ClubScreenIdentity {
  readonly kind: "club";
  readonly name: string;
  readonly qualifier: string;
  readonly colours: ClubColoursView;
}

/** A competition in the identity slot: the competition name shown in place of the club name
 *  while on a competition screen, with the competition's fixture progress (clubs, played,
 *  remaining) replacing the calendar and standing metrics in the secondary row. */
export interface CompetitionScreenIdentity {
  readonly kind: "competition";
  readonly name: string;
  readonly competition: HeaderCompetition;
}

type Listener = () => void;

let identity: ScreenIdentity | null = null;
const listeners = new Set<Listener>();

export const getScreenIdentity = (): ScreenIdentity | null => identity;

export const subscribeScreenIdentity = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const setScreenIdentity = (next: ScreenIdentity | null): void => {
  identity = next;
  for (const listener of listeners) listener();
};

/** The slice of a club view every club-scoped screen carries — enough to name the club in the
 *  navbar, and nothing a screen-specific read would add. */
export interface ClubIdentityView {
  readonly club: { readonly name: string };
  readonly clubColours: ClubColoursView;
  readonly isUserClub: boolean;
}

/**
 * Publish the competition name in the identity slot while a competition screen is mounted,
 * so the navbar reads that competition's name in place of the club's until the screen unmounts.
 */
export const useCompetitionIdentity = (
  competitionName: string | null,
  competitionMetrics: HeaderCompetition | null,
): void => {
  useEffect(() => {
    if (competitionName === null || competitionMetrics === null) return;
    setScreenIdentity({
      kind: "competition",
      name: competitionName,
      competition: competitionMetrics,
    });
    return () => setScreenIdentity(null);
  }, [competitionName, competitionMetrics]);
};

/**
 * Publish the club a club-scoped screen is showing when it is not the manager's own, so the navbar
 * reads that club in place of the manager's until the screen moves to the manager's own club or
 * unmounts. The manager's own club publishes nothing: the identity slot already says it.
 */
export const useClubIdentity = (view: ClubIdentityView | null): void => {
  useEffect(() => {
    if (view === null || view.isUserClub) return;
    setScreenIdentity({
      kind: "club",
      name: view.club.name,
      qualifier: "Not your club",
      colours: view.clubColours,
    });
    return () => setScreenIdentity(null);
  }, [view]);
};
