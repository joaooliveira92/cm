import type { ClubId, CompetitionId, MatchId, PlayerId, SaveId } from "@cm-clone/contracts";
import { Outlet, useLocation, useParams } from "@tanstack/react-router";
import { type ComponentType, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import {
  navigateCareer,
} from "../navigation/adapter.js";
import type { CareerDestination } from "../navigation/destinations.js";
import type { EntityType } from "../navigation/entity-nav-config.js";
import type { MatchContext } from "../navigation/match-nav-config.js";
import { SecondaryNav } from "../navigation/components/SecondaryNav.js";
import type { SpecSectionId } from "../navigation/spec-nav-config.js";
import { decodeClubId, decodeCompetitionId, decodeMatchId, decodePlayerId, decodeSaveId } from "../navigation/params.js";
import { CareerChrome } from "../chrome/CareerChrome.js";
import { Alert } from "../components/ui/alert.js";
import { RegistryProvider } from "../rpc.js";
import { resetTableSessions } from "../table/tableState.js";
import { PANEL } from "../theme.js";
import { RouteView } from "./RouteView.js";

// The chrome moved to `chrome/CareerChrome.tsx` when it grew a title bar, a
// season readout, and the career-loop handler. Re-exported here because the
// reachable-screen set is checked against `CAREER_SCREEN_TYPES` from this
// module's path.
export { CAREER_SECTIONS, CareerChrome } from "../chrome/CareerChrome.js";

/** A malformed route is a structural failure: the danger alert panel grammar
 *  with no Retry, because there is nothing to retry on a bad address. The panel
 *  name is not restated — the alert panel plus the danger tone carry the
 *  severity (text-led, per the empty/error grammar). */
export const RouteParamErrorScreen = ({
  reason,
}: {
  readonly reason: string;
}) => (
  <main className={`min-h-screen bg-background p-8 text-foreground ${PANEL}`}>
    <Alert variant="destructive">
      <span className="font-semibold">Invalid career address</span>
      <p className="mt-1">{reason}</p>
    </Alert>
  </main>
);

/**
 * The career parent route (`/career/$saveId`). Owns the persistent shell and
 * the save-scoped Atom registry, relocated whole from `App.tsx`'s career
 * branch — `key={saveId}` keeps a fresh registry per save, so switching saves
 * can never serve stale atoms from a previous career.
 *
 * Table session state (sort/filters/focus/scroll for the table screens) is
 * module-level in `tableState.ts`, so a NEW save mounting here must clear it
 * BEFORE the child screens' mount initializers seed from it. The guard runs in
 * the render body (a mount effect would run after the children captured the
 * previous save's session) keyed on the save — intra-save screen navigation
 * keeps the session (the note's "Screen navigation survives" row), a save
 * switch and a post-reload remount clear it (the note's "Save reload" row).
 */
let activeCareerSaveKey: string | null = null;

export const CareerShell = () => {
  const params = useParams({ strict: false });
  const decoded = decodeSaveId(params.saveId ?? "");
  if (decoded._tag === "Malformed") {
    return <RouteParamErrorScreen reason={decoded.reason} />;
  }
  const saveId = decoded.success;
  const saveKey = String(saveId);
  if (activeCareerSaveKey !== saveKey) {
    activeCareerSaveKey = saveKey;
    resetTableSessions();
  }

  /**
   * Map a tab selection to a career navigation destination. The
   * `onChangeTab` contract from SecondaryNav passes a nav id (section,
   * entity type, or match context) and a tab id; this resolves both to a
   * typed CareerDestination and navigates there.
   */
  const handleTabChange = useCallback(
    (navId: SpecSectionId | EntityType | MatchContext, tabId: string) => {
      const dest = tabToDestination(navId, tabId, saveId);
      if (dest !== null) {
        navigateCareer(dest, "pointer");
      }
    },
    [saveId],
  );

  // The career shell owns its scroll region: the shell is viewport-fixed and
  // only the outlet scrolls, so the navbar is a stationary band that scrolling
  // can never hide. A route change starts the new screen at the top of that
  // region (the router's page-level scroll reset no longer applies — the page
  // itself does not scroll).
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pathname = useLocation().pathname;
  useLayoutEffect(() => {
    if (scrollRef.current !== null) scrollRef.current.scrollTop = 0;
  }, [pathname]);

  return (
    <RegistryProvider key={saveId}>
      <div className="flex h-screen flex-col overflow-hidden bg-background">
        <CareerChrome saveId={saveId} />
        <SecondaryNav onChangeTab={handleTabChange} />
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </RegistryProvider>
  );
};

interface CareerScreenProps {
  readonly saveId: SaveId;
}

type CareerScreenComponent = ComponentType<CareerScreenProps>;

/** One career child route surface: boundary-decode the `saveId`, then render
 *  the screen inside its semantic RouteView (keyboard/palette arrival focuses
 *  the screen's main region by identity; pointer arrival does not). */
export const CareerChildView = ({
  screenId,
  Screen,
  fullHeight = false,
}: {
  readonly screenId: string;
  readonly Screen: CareerScreenComponent;
  /** See `RouteView`'s `fullHeight`. */
  readonly fullHeight?: boolean;
}) => {
  const params = useParams({ strict: false });
  const decoded = decodeSaveId(params.saveId ?? "");
  return decoded._tag === "Success" ? (
    <RouteView screenId={screenId} fullHeight={fullHeight}>
      <Screen saveId={decoded.success} />
    </RouteView>
  ) : (
    <RouteParamErrorScreen reason={decoded.reason} />
  );
};

interface ClubScreenProps {
  readonly saveId: SaveId;
  readonly clubId: ClubId;
}

/**
 * One club-scoped child route surface (`/career/$saveId/club/$clubId/...`). The same boundary
 * decode as `CareerChildView`, for both parameters.
 *
 * The `screenId` is fixed per surface and deliberately does NOT include the club: focus
 * restoration resolves a screen by identity, so keying it on the club would make every target a
 * distinct focus scope and leave a back-navigation to a different club unable to restore anything.
 * Which club is being read is route state, not focus identity.
 *
 * A well-formed `clubId` naming no club in the save reaches the screen, which renders the RPC's
 * club-not-found failure. Only a structurally undecodable parameter is an address error.
 */
export const CareerClubChildView = ({
  screenId,
  Screen,
}: {
  readonly screenId: string;
  readonly Screen: ComponentType<ClubScreenProps>;
}) => {
  const params = useParams({ strict: false });
  const save = decodeSaveId(params.saveId ?? "");
  const club = decodeClubId(params.clubId ?? "");
  if (save._tag === "Malformed") return <RouteParamErrorScreen reason={save.reason} />;
  if (club._tag === "Malformed") return <RouteParamErrorScreen reason={club.reason} />;
  return (
    <RouteView screenId={screenId}>
      <Screen saveId={save.success} clubId={club.success} />
    </RouteView>
  );
};

interface PlayerScreenProps {
  readonly saveId: SaveId;
  readonly playerId: PlayerId;
}

/**
 * One player-scoped child route surface (`/career/$saveId/player/$playerId/...`). Same
 * boundary decode pattern as `CareerClubChildView`, but for a player target.
 */
export const CareerPlayerChildView = ({
  screenId,
  Screen,
}: {
  readonly screenId: string;
  readonly Screen: ComponentType<PlayerScreenProps>;
}) => {
  const params = useParams({ strict: false });
  const save = decodeSaveId(params.saveId ?? "");
  const player = decodePlayerId(params.playerId ?? "");
  if (save._tag === "Malformed") return <RouteParamErrorScreen reason={save.reason} />;
  if (player._tag === "Malformed") return <RouteParamErrorScreen reason={player.reason} />;
  return (
    <RouteView screenId={screenId}>
      <Screen saveId={save.success} playerId={player.success} />
    </RouteView>
  );
};

interface MatchScreenProps {
  readonly saveId: SaveId;
  readonly matchId: MatchId;
}

/** One match-scoped child route surface (`/career/$saveId/match-report/$matchId`). Same boundary
 *  decode as the club and player surfaces; the `screenId` stays fixed per surface. */
export const CareerMatchChildView = ({
  screenId,
  Screen,
}: {
  readonly screenId: string;
  readonly Screen: ComponentType<MatchScreenProps>;
}) => {
  const params = useParams({ strict: false });
  const save = decodeSaveId(params.saveId ?? "");
  const match = decodeMatchId(params.matchId ?? "");
  if (save._tag === "Malformed") return <RouteParamErrorScreen reason={save.reason} />;
  if (match._tag === "Malformed") return <RouteParamErrorScreen reason={match.reason} />;
  return (
    <RouteView screenId={screenId}>
      <Screen saveId={save.success} matchId={match.success} />
    </RouteView>
  );
};

interface CompetitionScreenProps {
  readonly saveId: SaveId;
  readonly competitionId: CompetitionId;
}

export const CareerCompetitionChildView = ({
  screenId,
  Screen,
}: {
  readonly screenId: string;
  readonly Screen: ComponentType<CompetitionScreenProps>;
}) => {
  const params = useParams({ strict: false });
  const save = decodeSaveId(params.saveId ?? "");
  const competition = decodeCompetitionId(params.competitionId ?? "");
  if (save._tag === "Malformed") return <RouteParamErrorScreen reason={save.reason} />;
  if (competition._tag === "Malformed") return <RouteParamErrorScreen reason={competition.reason} />;
  return (
    <RouteView screenId={screenId}>
      <Screen saveId={save.success} competitionId={competition.success} />
    </RouteView>
  );
};

/**
 * Map a nav id + tab id pair to a CareerDestination.
 *
 * For match contexts (live-match / post-match / pre-match), each tab id
 * resolves to the appropriate sub-screen or the main match screen. For
 * standard sections, the tab id maps to a section destination (or falls
 * back to the section default). Returns null when no mapping exists.
 */
const tabToDestination = (
  navId: SpecSectionId | EntityType | MatchContext,
  tabId: string,
  saveId: SaveId,
): CareerDestination | null => {
  // Match context tab routing
  const matchTabMap: Record<string, CareerDestination> = {
    // Shared across all match contexts
    "match": { type: "match", saveId },
    "commentary": { type: "matchCommentary", saveId },
    "statistics": { type: "matchStats", saveId },
    "player-ratings": { type: "matchRatings", saveId },
    "tactics": { type: "matchMatchTactics", saveId },
    // Live-match specific
    "substitutions": { type: "matchSubstitutions", saveId },
    "opposition": { type: "match", saveId },
    "live-table": { type: "matchLiveTable", saveId },
    // Post-match specific
    "summary": { type: "match", saveId },
    "other-results": { type: "matchLatestScores", saveId },
    "table": { type: "matchLiveTable", saveId },
    // Pre-match specific
    "overview": { type: "match", saveId },
    "team-selection": { type: "match", saveId },
    "past-meetings": { type: "match", saveId },
    "conditions": { type: "match", saveId },
  };

  if (navId === "live-match" || navId === "post-match" || navId === "pre-match") {
    return matchTabMap[tabId] ?? null;
  }

  // Section tab routing — map section tab ids to their CareerDestination
  const sectionTabMap: Record<string, CareerDestination> = {
    "squad": { type: "squad", saveId },
    "tactics": { type: "tactics", saveId },
    "training": { type: "training", saveId },
    "transfers": { type: "transfers", saveId },
    "league": { type: "league", saveId },
    "fixtures": { type: "fixtures", saveId },
    "match": { type: "match", saveId },
    "seasonSummary": { type: "seasonSummary", saveId },
    "manager": { type: "manager", saveId },
    "news": { type: "news", saveId },
    "clubInfo": { type: "clubInfo", saveId },
    "boardConfidence": { type: "boardConfidence", saveId },
    "finances": { type: "finances", saveId },
    "staffOverview": { type: "staffOverview", saveId },
    "shortlist": { type: "shortlist", saveId },
    "scouting": { type: "scouting", saveId },
    "playerSearch": { type: "playerSearch", saveId },
    "staffSearch": { type: "staffSearch", saveId },
    "competitions": { type: "competitions", saveId },
    "nations": { type: "nations", saveId },
    "clubs": { type: "clubs", saveId },
  };

  // For sections, the tab id often matches the destination type directly
  if (sectionTabMap[tabId] !== undefined) return sectionTabMap[tabId];

  // For entity tabs, try the navId as a destination too
  if (sectionTabMap[navId] !== undefined) return sectionTabMap[navId];

  return null;
};

/** The index of `/career/$saveId`: no child route → redirect to Squad. */
export const CareerIndexRedirect = () => {
  const params = useParams({ strict: false });
  const saveId = params.saveId ?? "";
  const decoded = decodeSaveId(saveId);
  useEffect(() => {
    if (decoded._tag === "Success") {
      navigateCareer({ type: "squad", saveId: decoded.success }, "pointer");
    }
  }, [saveId]);
  return decoded._tag === "Malformed" ? (
    <RouteParamErrorScreen reason={decoded.reason} />
  ) : null;
};
