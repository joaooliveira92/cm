/**
 * What the career navbar names in its identity slot when a screen is about something other than
 * the manager's club. A player screen sets the player here, so the navbar reads "Florian David
 * (Benfica)" with the position / nationality / age line beneath, in place of the club name, and
 * the band below it reports the player's facts in place of the calendar and standing.
 *
 * Module-level for the same reason as `screenToolbarControls`: the navbar sits above the route
 * outlet, so a screen cannot hand it props.
 */
import type { HeaderPlayer } from "./chrome/header/career-header-state.js";

export interface ScreenIdentity {
  readonly name: string;
  readonly qualifier: string;
  readonly facts: string;
  readonly player: HeaderPlayer;
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
