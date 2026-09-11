import type { ClubColoursView, SaveId } from "@cm-clone/contracts";
import {
  assessContinueReadiness,
  describeContinueOutcome,
  type ContinueDestination,
  type ReadinessItem,
} from "@cm-clone/shared";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useLocation } from "@tanstack/react-router";
import { ACTION_REGISTRY } from "../actions/allActions.js";
import { registerActionHandler } from "../actions/dispatch.js";
import { clearScopeState, getScopeState, setScopeState, subscribeScopeState } from "../actions/scopeState.js";
import type { MatchReadout, ScreenName } from "../actions/types.js";
import { type NavigationIntent } from "../focus.js";
import {
  navigate,
  navigateWithFocus,
} from "../navigation/adapter.js";
import {
  advanceCalendarMutation,
  describeRpcError,
  leagueTableAtom,
  managerProfileAtom,
  newsInboxAtom,
  saveSummaryAtom,
  tacticsAtom,
  typedError,
  useAtom,
  useAtomValue,
} from "../rpc.js";
import type { HeaderCareer, HeaderStanding, SeasonReadoutInput } from "./header/career-header-state.js";
import { deriveContinueLabel } from "./header/continue-label.js";
import type { ContinueReport } from "./ContinueResult.js";

interface CareerState {
  readonly saveId: SaveId;
  readonly clubName: string | null;
  readonly clubColours: ClubColoursView | null;
  readonly season: SeasonReadoutInput | null;
  readonly saveName: string | null;
  readonly advancing: boolean;
  readonly continueDisabled: boolean;
  readonly continueLabel: string;
  readonly liveMatch: MatchReadout | undefined;
  readonly newsCounts: {
    readonly total: number;
    readonly unread: number;
    readonly actionRequired: number;
  } | null;
  readonly screenId: ScreenName | null;
  readonly standing: HeaderStanding | null;
  readonly outstanding: readonly ReadinessItem[];
  readonly career: HeaderCareer;
  readonly report: ContinueReport | null;
  readonly setReport: (report: ContinueReport | null) => void;
  readonly openDestination: (destination: ContinueDestination) => void;
  readonly onBackToSaves: (intent: NavigationIntent) => void;
  readonly runAdvance: ReturnType<typeof useAtom>[1];
}

const CareerStateCtx = createContext<CareerState | null>(null);

export const useCareerState = (): CareerState => {
  const ctx = useContext(CareerStateCtx);
  if (ctx === null) throw new Error("useCareerState must be used within CareerStateProvider");
  return ctx;
};

const standingFor = (
  standings: readonly { readonly clubName: string; readonly played: number; readonly points: number }[],
  clubName: string,
): HeaderStanding | null => {
  const index = standings.findIndex((row) => row.clubName === clubName);
  const row = standings[index];
  if (row === undefined) return null;
  return { position: index + 1, played: row.played, points: row.points };
};

export const continueUnavailableReason = (): string | undefined =>
  ACTION_REGISTRY.get("continue")?.unavailableReason;

export const CareerStateProvider = ({
  saveId,
  children,
}: {
  readonly saveId: SaveId;
  readonly children: ReactNode;
}) => {
  const profileResult = useAtomValue(managerProfileAtom(saveId));
  const tableResult = useAtomValue(leagueTableAtom(saveId));
  const saveResult = useAtomValue(saveSummaryAtom(saveId));
  const [advance, runAdvance] = useAtom(advanceCalendarMutation);
  const tacticsResult = useAtomValue(tacticsAtom(saveId));
  const newsResult = useAtomValue(newsInboxAtom(saveId));

  const clubName = profileResult._tag === "Success" ? profileResult.value.clubName : null;
  const clubColours = profileResult._tag === "Success" ? profileResult.value.clubColours : null;
  const season = tableResult._tag === "Success" ? tableResult.value.season : null;
  const saveName = saveResult._tag === "Success" ? saveResult.value.name : null;

  const advancing = advance.waiting;
  const seasonComplete = season?.phase === "season_complete";
  const liveMatch = useSyncExternalStore(
    subscribeScopeState,
    () => getScopeState().match,
    () => getScopeState().match,
  );
  const continueDisabled = season === null || advancing || seasonComplete || liveMatch !== undefined;

  const location = useLocation();
  const screenId: ScreenName | null = useMemo(() => {
    const segments = location.pathname.split("/").filter(Boolean);
    const screenSegment = segments[2];
    if (screenSegment === "club") return segments[3] as ScreenName;
    return (screenSegment ?? null) as ScreenName | null;
  }, [location.pathname]);

  const newsCounts = newsResult._tag === "Success" ? newsResult.value.counts : null;

  const continueLabel: string = deriveContinueLabel({
    season,
    continueDisabled,
    actionRequired: newsCounts?.actionRequired ?? null,
  });

  useEffect(() => {
    if (season === null) return undefined;
    setScopeState({ phase: season.phase, advancing });
    return () => clearScopeState("phase", "advancing");
  }, [advancing, season]);

  useEffect(() => {
    return registerActionHandler("continue", () => {
      if (continueDisabled) return;
      void runAdvance({ saveId });
    });
  }, [continueDisabled, runAdvance, saveId]);

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
      setReport({ kind: "failure", message: describeRpcError(advanceError) });
    }
  }, [advance, advanceError]);

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

  const standing: HeaderStanding | null =
    tableResult._tag === "Success" && clubName !== null
      ? standingFor(tableResult.value.standings, clubName)
      : null;

  const outstanding: readonly ReadinessItem[] =
    season === null
      ? []
      : assessContinueReadiness({
        phase: season.phase,
        hasTactic:
          tacticsResult._tag === "Success" ? tacticsResult.value.tactic !== null : true,
        matchInProgress: liveMatch !== undefined,
        advancing,
        pendingIncomingBids: newsCounts?.actionRequired ?? 0,
      }).items;

  const reason = continueUnavailableReason();
  const career: HeaderCareer = {
    clubName,
    saveName,
    season,
    standing,
    liveMatch: liveMatch ?? null,
    blockedReason: continueDisabled && season !== null ? (reason ?? null) : null,
  };

  const value = useMemo<CareerState>(
    () => ({
      saveId,
      clubName,
      clubColours,
      season,
      saveName,
      advancing,
      continueDisabled,
      continueLabel,
      liveMatch,
      newsCounts,
      screenId,
      standing,
      outstanding,
      career,
      report,
      setReport,
      openDestination,
      onBackToSaves,
      runAdvance,
    }),
    [
      saveId, clubName, clubColours, season, saveName, advancing,
      continueDisabled, continueLabel, liveMatch, newsCounts, screenId,
      standing, outstanding, career, report,
    ],
  );

  return <CareerStateCtx.Provider value={value}>{children}</CareerStateCtx.Provider>;
};