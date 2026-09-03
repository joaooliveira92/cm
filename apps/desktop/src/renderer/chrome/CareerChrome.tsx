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
import { clearScopeState, getScopeState, setScopeState, subscribeScopeState } from "../actions/scopeState.js";
import { ActionKeyBadge } from "../discoverability/ActionKeyBadge.js";
import { FOCUS_RING, type NavigationIntent } from "../focus.js";
import {
  canNavigateBack,
  navigate,
  navigateBack,
  navigateForward,
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
import { Header } from "./header/index.js";
import type { HeaderCareer, HeaderStanding } from "./header/career-header-state.js";

/**
 * The set of section groups making up the primary row. Exported so the reachability
 * invariant — that the union of every section's default plus item destinations covers
 * every career screen (no screen is left keyboard-only) — can be asserted in tests.
 *
 * Re-exported from `router/career.tsx`, which is where the tab set used to be
 * checked against `CAREER_SCREEN_TYPES`.
 */
export { NAV_SECTIONS as CAREER_SECTIONS } from "../navigation/nav-config.js";

/**
 * The season/match readouts and the header's row description live in
 * `header/career-header-state.ts` — a pure module, so what the band reports is
 * testable without mounting the shell. Re-exported here because this is the
 * path callers and tests already know them by.
 */
export {
  MATCHDAYS_PER_SEASON,
  matchReadout,
  seasonReadout,
  type SeasonReadoutInput,
} from "./header/career-header-state.js";

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

  // The player club's line in the League Table, matched by name — the table view
  // carries no "this is you" flag, and the profile's club name is the only
  // identity the chrome is given. Absent (table still loading, or the club not
  // in this table) means the band shows placeholders, never a fabricated row.
  const standing: HeaderStanding | null =
    tableResult._tag === "Success" && clubName !== null
      ? standingFor(tableResult.value.standings, clubName)
      : null;

  // Everything the band reports, described in one place. A blocked career loop
  // is stated here rather than left to a `title` no disabled control delivers.
  const career: HeaderCareer = {
    clubName,
    saveName,
    season,
    standing,
    liveMatch: liveMatch ?? null,
    blockedReason:
      liveMatch !== undefined
        ? "The season cannot advance during a match."
        : continueDisabled && season !== null
          ? (continueUnavailableReason() ?? null)
          : null,
  };

  return (
    <Navbar
      saveId={saveId}
      clubName={clubName}
      leading={
        // The router's history reports whether a back step exists but has no
        // forward counterpart, so forward stays enabled and is a no-op at the
        // end of the stack — the same contract a browser's forward button has.
        <Header.Nav
          back={{ disabled: !canNavigateBack(), onTrigger: navigateBack }}
          forward={{ disabled: false, onTrigger: navigateForward }}
        />
      }
      secondary={<Header.SecondaryRow state={{ view: "career", career }} />}
      actions={
        <>
          <Header.Search />
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

/** The club's League Table line, or null when the table does not contain it. */
const standingFor = (
  standings: readonly { readonly clubName: string; readonly played: number; readonly points: number }[],
  clubName: string,
): HeaderStanding | null => {
  const index = standings.findIndex((row) => row.clubName === clubName);
  const row = standings[index];
  if (row === undefined) return null;
  return { position: index + 1, played: row.played, points: row.points };
};
