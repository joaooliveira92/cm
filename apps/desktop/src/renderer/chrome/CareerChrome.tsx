/**
 * The career chrome — the persistent two-row shell every career route shares.
 *
 * Row 1 is the chrome-blue gradient title bar: the club's name on the left (the
 * career's root context, so it lives here rather than being repeated in every
 * screen heading) and the temporal cluster on the right — the season readout
 * and Continue.
 *
 * Row 2 is the tab strip, restyled as chrome. The active tab inverts to the
 * primary gradient so the current section reads as the framed locus; "Back to
 * saves" is a subdued chrome control because leaving the career is not a career
 * section. Every tab stays in the DOM regardless of visibility — hiding one
 * behind a "More" menu would re-create exactly the keyboard-only screen the
 * `CAREER_TABS` invariant exists to prevent.
 *
 * The chrome owns the career loop. Continue renders from the `continue` Action
 * record — never a second hardcoded definition — so the button, the palette,
 * the help overlay, and the key badges are four views of one record and cannot
 * drift. The chrome also publishes the `phase`/`advancing` read model the
 * registry's availability predicate evaluates, which is why `Space` and the
 * button work from every career screen rather than only from the League table.
 *
 * What this file does NOT do: change any keyboard behaviour. Bindings, focus,
 * and dispatch are the shipped spine's; this is how they look.
 */
import type { SaveId } from "@cm-clone/contracts";
import { useLocation } from "@tanstack/react-router";
import { type MouseEvent, useEffect, useSyncExternalStore } from "react";
import { ACTION_REGISTRY } from "../actions/allActions.js";
import {
  getBindingOverrides,
  subscribeBindingOverrides,
} from "../actions/bindingState.js";
import { dispatchAction, registerActionHandler } from "../actions/dispatch.js";
import { effectiveBinding } from "../actions/overrides.js";
import type { MatchReadout } from "../actions/types.js";
import { clearScopeState, getScopeState, setScopeState, subscribeScopeState } from "../actions/scopeState.js";
import { ActionKeyBadge } from "../discoverability/ActionKeyBadge.js";
import { FOCUS_RING } from "../focus.js";
import type { NavigationIntent } from "../focus.js";
import {
  navigate,
  navigateCareer,
  navigateWithFocus,
} from "../navigation/adapter.js";
import type { CareerDestination } from "../navigation/destinations.js";
import {
  advanceCalendarMutation,
  leagueTableAtom,
  managerProfileAtom,
  saveSummaryAtom,
  useAtom,
  useAtomValue,
} from "../rpc.js";
import { BTN_PRIMARY } from "../theme.js";

export interface CareerTab {
  readonly label: string;
  readonly childPath: string;
  readonly destination: CareerDestination["type"];
}

/**
 * The career tab strip, in display order. Exported so the tab set can be checked against
 * `CAREER_SCREEN_TYPES`: a career screen with a route and a `g` binding but no tab is reachable
 * only by keyboard, which is the drift this list is easy to acquire.
 */
export const CAREER_TABS: ReadonlyArray<CareerTab> = [
  { label: "squad", childPath: "squad", destination: "squad" },
  { label: "tactics", childPath: "tactics", destination: "tactics" },
  { label: "transfers", childPath: "transfers", destination: "transfers" },
  { label: "league table", childPath: "league", destination: "league" },
  { label: "fixtures", childPath: "fixtures", destination: "fixtures" },
  { label: "match day", childPath: "match", destination: "match" },
  {
    label: "season summary",
    childPath: "season-summary",
    destination: "seasonSummary",
  },
  { label: "manager", childPath: "manager", destination: "manager" },
];

/** The number of matchdays in a season — the readout's denominator. */
const MATCHDAYS_PER_SEASON = 38;

/**
 * The phase word that replaces the matchday segment outside the in-season
 * phase. `in_season` has no word: that is when the matchday is the orientation.
 */
const PHASE_WORDS: Readonly<Record<string, string>> = {
  pre_season: "Pre-season",
  mid_window_open: "Transfer window open",
  season_complete: "Season complete",
};

export interface SeasonReadoutInput {
  readonly seasonNumber: number;
  readonly currentMatchday: number;
  readonly phase: string;
}

/**
 * `Season 3 · Matchday 12/38`, or the phase word in place of the matchday.
 *
 * The unit is always the Matchday. The Calendar has no day-by-day clock, so no
 * copy here may express time in days or dates — a date would claim a state the
 * domain does not model.
 */
export const seasonReadout = (season: SeasonReadoutInput): string => {
  const phaseWord = PHASE_WORDS[season.phase];
  const tail =
    phaseWord ?? `Matchday ${season.currentMatchday}/${MATCHDAYS_PER_SEASON}`;
  return `Season ${season.seasonNumber} · ${tail}`;
};

/** Match-only verb: the live-match readout. The unit is minutes (a clock would
 *  claim a state the domain does not model). The chrome shows this in place of
 *  the season readout while a match is in flight. */
export const matchReadout = (match: MatchReadout): string =>
  `${match.currentMinute}' · ${match.homeClubName} ${match.homeScore}–${match.awayScore} ${match.awayClubName}`;

/**
 * Continue, rendered from the `continue` Action record.
 *
 * The record is the single source of truth for the label, the binding badge,
 * and the disabled reason. `primary: true` on that record drives the
 * gradient-primary treatment — presentation only, never automatic dispatch. A
 * later screen that marks its own primary must reach this same treatment, or
 * "primary verb" degrades into a special case for Continue.
 */
const ContinueControl = ({
  disabled,
  busy,
}: {
  readonly disabled: boolean;
  readonly busy: boolean;
}) => {
  const overrides = useSyncExternalStore(
    subscribeBindingOverrides,
    getBindingOverrides,
    getBindingOverrides,
  );
  const action = ACTION_REGISTRY.get("continue");
  if (action === undefined) return null;

  const binding = effectiveBinding(action, overrides);
  const treatment = action.primary === true ? BTN_PRIMARY : "";

  return (
    <button
      type="button"
      data-action-id={action.id}
      disabled={disabled}
      title={disabled ? action.unavailableReason : undefined}
      className={`flex items-center gap-1.5 text-sm ${treatment} ${FOCUS_RING.join(" ")}`}
      onClick={() => void dispatchAction(action.id)}
    >
      {binding !== undefined && <ActionKeyBadge binding={binding} />}
      {busy ? "Advancing…" : action.label}
    </button>
  );
};

/**
 * The reason Continue is unavailable, from the Action record. A disabled button
 * with no explanation is unacceptable: `title` alone does not reach a disabled
 * control, so the cluster renders this as visible copy.
 */
export const continueUnavailableReason = (): string | undefined =>
  ACTION_REGISTRY.get("continue")?.unavailableReason;

/** The career chrome: the persistent shell every career route shares (AC-11). */
export const CareerChrome = ({ saveId }: { readonly saveId: SaveId }) => {
  const { pathname } = useLocation();
  const activeChild = pathname.split("/").at(-1) ?? "";

  const profileResult = useAtomValue(managerProfileAtom(saveId));
  const tableResult = useAtomValue(leagueTableAtom(saveId));
  const saveResult = useAtomValue(saveSummaryAtom(saveId));
  const [advance, runAdvance] = useAtom(advanceCalendarMutation);

  const clubName =
    profileResult._tag === "Success" ? profileResult.value.clubName : null;
  const season = tableResult._tag === "Success" ? tableResult.value.season : null;
  const saveName = saveResult._tag === "Success" ? saveResult.value.name : null;

  const advancing = advance.waiting;
  const seasonComplete = season?.phase === "season_complete";
  const liveMatch = useSyncExternalStore(
    subscribeScopeState,
    () => getScopeState().match,
    () => getScopeState().match,
  );
  const continueDisabled =
    season === null || advancing || seasonComplete || liveMatch !== undefined;

  // Publish the availability read model the registry's `continueAvailable`
  // predicate evaluates. The chrome owns this because the phase and the
  // in-flight advance are career-global facts, not one screen's: when the
  // League screen owned them, navigating away cleared them and `Space` stopped
  // working everywhere else.
  useEffect(() => {
    if (season === null) return undefined;
    setScopeState({ phase: season.phase, advancing });
    return () => clearScopeState("phase", "advancing");
  }, [advancing, season]);

  // The career-loop handler. It lives here, not on the League table, so the
  // `Space` binding and the chrome's button dispatch the same advance from
  // every career screen.
  useEffect(() => {
    return registerActionHandler("continue", () => {
      if (continueDisabled) return;
      runAdvance({ saveId });
    });
  }, [continueDisabled, runAdvance, saveId]);

  const onTabClick = (
    event: MouseEvent,
    destination: CareerDestination["type"],
  ): void => {
    // event.detail === 0 marks keyboard (Enter/Space) activation of the native
    // button; pointer clicks always report a non-zero detail. Navigation intent
    // decides whether the destination requests semantic focus.
    const intent: NavigationIntent = event.detail > 0 ? "pointer" : "keyboard";
    navigateCareer({ type: destination, saveId }, intent);
  };

  const onBackToSaves = (event: MouseEvent): void => {
    const intent: NavigationIntent = event.detail > 0 ? "pointer" : "keyboard";
    if (intent === "keyboard") {
      navigateWithFocus({ type: "saveList" }, { screen: "saveList" });
    } else {
      navigate({ type: "saveList" });
    }
  };

  return (
    <header className="text-text-primary">
      <div className="chrome-gradient flex items-center justify-between border-b border-panel-border-dark px-3 py-2 shadow-chrome">
        <h2 className="truncate text-lg font-bold">{clubName ?? " "}</h2>
        <div className="flex items-center gap-3">
          <span className="flex flex-col items-end leading-tight">
            <span className="text-xs">
              {liveMatch !== undefined
                ? matchReadout(liveMatch)
                : season === null
                  ? ""
                  : seasonReadout(season)}
            </span>
            {continueDisabled && season !== null ? (
              <span className="text-2xs text-text-warning">
                {liveMatch !== undefined
                  ? "The season cannot advance during a match."
                  : continueUnavailableReason()}
              </span>
            ) : (
              saveName !== null && (
                <span className="text-2xs text-text-secondary">{saveName}</span>
              )
            )}
          </span>
          <ContinueControl disabled={continueDisabled} busy={advancing} />
        </div>
      </div>

      {/*
        The strip scrolls horizontally once the tabs outgrow it. Every tab stays
        in the DOM and focus-reachable when scrolled out of view, so visibility
        and reachability never diverge — `overflow-x-auto`, never a discloser.
      */}
      <nav className="flex items-center justify-between gap-2 border-b border-border-subtle bg-bg-raised px-2 py-1 text-sm">
        <div className="flex gap-1 overflow-x-auto">
          {CAREER_TABS.map((tab) => (
            <button
              key={tab.childPath}
              type="button"
              aria-current={tab.childPath === activeChild ? "page" : undefined}
              className={`shrink-0 rounded-control px-3 py-1 whitespace-nowrap capitalize ${FOCUS_RING.join(" ")} ${
                tab.childPath === activeChild
                  ? "chrome-gradient-inverted border border-panel-border-dark font-semibold"
                  : "bg-surface hover:bg-surface-raised"
              }`}
              onClick={(event) => onTabClick(event, tab.destination)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`shrink-0 rounded-control border border-border-subtle px-3 py-1 text-text-secondary hover:text-text-primary ${FOCUS_RING.join(" ")}`}
          onClick={onBackToSaves}
        >
          Back to saves
        </button>
      </nav>
    </header>
  );
};
