/**
 * The career chrome — the redesigned horizontal navbar every career route shares.
 *
 * The three-zone model (spec §3) replaces the old flat eight-tab strip:
 *
 * - Left zone: the club's identity (the career's root context) and the temporal
 *   readout — the season, or the live-match readout while a match is in flight.
 * - Center zone: the seven primary sections, each of which reveals a context
 *   submenu strip for its items (spec §2/§4).
 * - Right zone: Back to saves plus Continue.
 *
 * Continue renders from the `continue` Action record — never a second
 * hardcoded definition — so the button, the palette, the help overlay, and the
 * key badges are four views of one record and cannot drift. The chrome also
 * publishes the `phase`/`advancing` read model the registry's availability
 * predicate evaluates, which is why `Space` and the button work from every
 * career screen rather than only from the League table.
 *
 * What this file does NOT do: change any keyboard behaviour. Bindings, focus,
 * and dispatch are the shipped spine's; this is how they look.
 */
import type { SaveId } from "@cm-clone/contracts";
import { useEffect, useSyncExternalStore } from "react";
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
import { FOCUS_RING, type NavigationIntent } from "../focus.js";
import {
  navigate,
  navigateWithFocus,
} from "../navigation/adapter.js";
import { Navbar } from "../navigation/components/Navbar.js";
import {
  advanceCalendarMutation,
  leagueTableAtom,
  managerProfileAtom,
  saveSummaryAtom,
  useAtom,
  useAtomValue,
} from "../rpc.js";
import { BTN_PRIMARY } from "../theme.js";

/**
 * The set of section groups making up the primary row. Exported so the reachability
 * invariant — that the union of every section's default plus item destinations covers
 * every career screen (no screen is left keyboard-only) — can be asserted in tests.
 *
 * Re-exported from `router/career.tsx`, which is where the tab set used to be
 * checked against `CAREER_SCREEN_TYPES`.
 */
export { NAV_SECTIONS as CAREER_SECTIONS } from "../navigation/nav-config.js";

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

/** The career chrome: the redesigned navbar shell every career route shares. */
export const CareerChrome = ({ saveId }: { readonly saveId: SaveId }) => {
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
      void runAdvance({ saveId });
    });
  }, [continueDisabled, runAdvance, saveId]);

  const onBackToSaves = (intent: NavigationIntent): void => {
    if (intent === "keyboard") {
      navigateWithFocus({ type: "mainMenu" }, { screen: "mainMenu" });
    } else {
      navigate({ type: "mainMenu" });
    }
  };

  const readout = liveMatch !== undefined
    ? matchReadout(liveMatch)
    : season === null
      ? ""
      : seasonReadout(season);

  return (
    <Navbar
      saveId={saveId}
      clubName={clubName}
      readout={readout === "" ? undefined : (
        <span className="flex flex-col items-end leading-tight">
          <span>{readout}</span>
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
      )}
      actions={
        <>
          <button
            type="button"
            className={`rounded-control border border-border-subtle px-3 py-1 text-text-secondary hover:text-text-primary ${FOCUS_RING.join(" ")}`}
            onClick={(event) =>
              onBackToSaves(event.detail > 0 ? "pointer" : "keyboard")
            }
          >
            Back to saves
          </button>
          <ContinueControl disabled={continueDisabled} busy={advancing} />
        </>
      }
    />
  );
};
