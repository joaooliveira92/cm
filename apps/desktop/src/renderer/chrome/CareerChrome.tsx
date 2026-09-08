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
import { ArrowRight } from "lucide-react";
import type { SaveId } from "@cm-clone/contracts";
import {
  assessContinueReadiness,
  describeContinueOutcome,
  type ContinueDestination,
} from "@cm-clone/shared";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ACTION_REGISTRY } from "../actions/allActions.js";
import { dispatchAction, registerActionHandler } from "../actions/dispatch.js";
import { clearScopeState, getScopeState, setScopeState, subscribeScopeState } from "../actions/scopeState.js";
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
  describeRpcError,
  typedError,
  leagueTableAtom,
  managerProfileAtom,
  saveSummaryAtom,
  tacticsAtom,
  useAtom,
  newsInboxAtom,
  useAtomValue,
} from "../rpc.js";
import { BTN_HEADER_PRIMARY } from "../theme.js";
import { ContinueOutstandingBand } from "./ContinueOutstanding.js";
import { ContinueResultBand, type ContinueReport } from "./ContinueResult.js";
import { Header } from "./header/index.js";
import type { HeaderCareer, HeaderStanding } from "./header/career-header-state.js";
import { Button } from "../components/ui/button.js";

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
  matchReadout,
  seasonReadout,
  type SeasonReadoutInput,
} from "./header/career-header-state.js";

/**
 * Continue, rendered from the `continue` Action record.
 *
 * The record is the single source of truth for the label, the binding badge,
 * and the disabled reason. `primary: true` on that record drives the
 * club-adaptive primary treatment — presentation only, never automatic
 * dispatch. This control lives on the club-coloured title band, so its
 * treatment is `BTN_HEADER_PRIMARY` (the `--color-header-*` pair inverted),
 * not the neutral `BTN_PRIMARY`. A later screen that marks its own primary
 * must reach this same treatment, or "primary verb" degrades into a special
 * case for Continue.
 */
const ContinueControl = ({
  disabled,
  busy,
}: {
  readonly disabled: boolean;
  readonly busy: boolean;
}) => {
  const action = ACTION_REGISTRY.get("continue");
  if (action === undefined) return null;

  const treatment = action.primary === true ? BTN_HEADER_PRIMARY : "";

  return (
    <button
      type="button"
      data-action-id={action.id}
      disabled={disabled}
      title={disabled ? action.unavailableReason : undefined}
      className={`flex items-center gap-1.5 text-sm ${treatment} ${FOCUS_RING.join(" ")}`}
      onClick={() => void dispatchAction(action.id)}
    >
      {busy ? "Advancing…" : action.label}
      {!busy && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
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
  const tacticsResult = useAtomValue(tacticsAtom(saveId));
  // One query serves two things: the unread badge on the News destination, and the count of open
  // decisions behind the readiness advisory. Reading `getTransfersScreen` for the latter would be
  // far heavier — it loads every player's economics — for a number the inbox already computes.
  const newsResult = useAtomValue(newsInboxAtom(saveId));

  const clubName =
    profileResult._tag === "Success" ? profileResult.value.clubName : null;
  // The club's scheme rides the same read as its name, so the header paints and titles in one pass
  // rather than settling into colour a frame after the name appears.
  const clubColours =
    profileResult._tag === "Success" ? profileResult.value.clubColours : null;
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

  // What the last press did. Held in state rather than derived on every render
  // so that dismissing it sticks: the mutation atom keeps its last result for
  // as long as the chrome is mounted, and a purely derived band would reappear
  // on the next unrelated re-render.
  const [report, setReport] = useState<ContinueReport | null>(null);
  const advanceError = typedError(advance);
  useEffect(() => {
    if (advance.waiting) return;
    if (advance._tag === "Success") {
      setReport({
        kind: "outcome",
        outcome: describeContinueOutcome({
          resolvedDate: advance.value.resolvedDate,
          transferWindowClosed: advance.value.transferWindowClosed,
          transferWindowOpened: advance.value.transferWindowOpened,
          seasonConcluded: advance.value.seasonConcluded,
          boardObjectiveVerdict: advance.value.boardObjectiveVerdict,
          managerOutcome: advance.value.managerOutcome,
        }),
      });
    } else if (advanceError !== null) {
      // The career is exactly where it was — a refused advance changes nothing
      // — so the band is the whole report, and nothing else needs unwinding.
      setReport({ kind: "failure", message: describeRpcError(advanceError) });
    }
  }, [advance, advanceError]);

  /** Following a link out of either band closes the per-press report: the player
   *  has acted on it. The outstanding band is not closed here — it is derived,
   *  and it clears itself when its condition does. */
  const openDestination = (destination: ContinueDestination): void => {
    navigate({ type: destination, saveId });
    setReport(null);
  };

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

  // The standing readiness check behind Continue. The project ships no notification centre, so a
  // pending condition is surfaced next to the control it concerns — every one of them, in the
  // outstanding band below, each with the screen that owns its fix. The header's warning slot keeps
  // the narrower job of explaining the *control*: why the button is greyed, which is not the same
  // question as what is outstanding.
  //
  // `hasTactic` defaults true unless the query has actually come back saying otherwise, so neither
  // a load in flight nor a failed read flashes a warning about state we have not read.
  const newsCounts = newsResult._tag === "Success" ? newsResult.value.counts : null;

  const outstanding =
    season === null
      ? []
      : assessContinueReadiness({
        phase: season.phase,
        hasTactic:
          tacticsResult._tag === "Success" ? tacticsResult.value.tactic !== null : true,
        matchInProgress: liveMatch !== undefined,
        advancing,
        // Zero until the read comes back, on the same reasoning as `hasTactic` above: a load in
        // flight must not flash a warning about state we have not read.
        pendingIncomingBids: newsCounts?.actionRequired ?? 0,
      }).items;

  // Everything the band reports, described in one place. A blocked career loop
  // is stated here rather than left to a `title` no disabled control delivers.
  const career: HeaderCareer = {
    clubName,
    saveName,
    season,
    standing,
    liveMatch: liveMatch ?? null,
    // Why the *control* is greyed, which is a narrower question than what is
    // outstanding: the specific blocker, and the screen that clears it, is a row
    // in the outstanding band. Restating the blocker here printed the same
    // sentence twice on screen during a live match.
    blockedReason:
      continueDisabled && season !== null ? (continueUnavailableReason() ?? null) : null,
  };

  return (
    <>
      <Navbar
        // Unread news is the one ambient signal the career loop has. Without it the inbox is only
        // seen by a player who thinks to look, which is the same failure as having no inbox.
        badges={
          newsCounts === null || newsCounts.unread === 0
            ? undefined
            : {
              news: {
                count: newsCounts.unread,
                label: newsCounts.actionRequired > 0 ? "unread, some awaiting an answer" : "unread",
              },
            }
        }
        saveId={saveId}
        clubName={clubName}
        clubColours={clubColours}
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
            <Button
              variant="secondary"
              className={`rounded-control border border-border-subtle px-3 py-1 text-text-secondary hover:text-text-primary ${FOCUS_RING.join(" ")}`}
              onClick={(event) =>
                onBackToSaves(event.detail > 0 ? "pointer" : "keyboard")
              }
            >
              Back to saves
            </Button>
            <ContinueControl disabled={continueDisabled} busy={advancing} />
          </>
        }
      />
      <ContinueOutstandingBand items={outstanding} onOpen={openDestination} />
      {report !== null && (
        <ContinueResultBand
          report={report}
          onOpen={openDestination}
          onDismiss={() => setReport(null)}
        />
      )}
    </>
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
