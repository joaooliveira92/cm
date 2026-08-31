import type {
  LeagueSetupIndexView,
  NationRow,
  NationSelectionIntentPayload,
  ResolvedSelectionView,
  SelectionIssueRow,
} from "@cm-clone/contracts";
import {
  matchesStatusFilter,
  nationSelectionState,
  nationTriState,
  searchIndex,
  type NationSelectionState,
  type SimulationMode,
  type StatusFilter,
  type TriState,
} from "@cm-clone/shared";

/**
 * The League and Nation Selection screen's view model (Screen 3, §19–§21).
 *
 * A pure reducer over the §21.1 command vocabulary. Everything asynchronous — resolving,
 * estimating, submitting, persisting — happens outside and re-enters as a command, which is what
 * makes the two behaviours that are hardest to get right testable without a renderer: the
 * staleness guard on estimates (§11.5) and the invalidation of a warning acknowledgement when the
 * selection moves underneath it (§17.1).
 *
 * The reducer deliberately does *not* resolve dependencies or compute estimates. Those live in
 * the trusted main-process layer; this model holds intents and displays what came back.
 */

export type EstimateStatus = "idle" | "updating" | "ready" | "failed";

export interface LeagueSelectionState {
  readonly databaseFingerprint: string;
  readonly searchQuery: string;
  readonly regionFilterId: string | null;
  readonly statusFilter: StatusFilter;
  readonly expandedRegionIds: readonly string[];
  readonly expandedNationIds: readonly string[];
  readonly intents: readonly NationSelectionIntentPayload[];
  /** §9.5. Playable depths kept across a trip through Background, so returning to Playable
   *  restores the user's depth instead of resetting it. */
  readonly rememberedScopes: Readonly<Record<string, string>>;
  /** The last answer that arrived. Held while a newer one is in flight so the summary keeps
   *  showing the previous figures rather than blanking (§11.5). */
  readonly resolved: ResolvedSelectionView | null;
  readonly estimateStatus: EstimateStatus;
  /** Monotonic. Every selection change bumps it; only an answer carrying the current value may
   *  update the display. */
  readonly selectionRevision: number;
  readonly submitting: boolean;
  /** The revision whose warnings the user acknowledged. Any later change makes it stale, so the
   *  confirmation is re-asked rather than carried over to a selection nobody confirmed. */
  readonly acknowledgedRevision: number | null;
  /** A transient message: a preset that dropped entries, a draft that could not be saved. */
  readonly notice: string | null;
}

export const initialState = (databaseFingerprint: string): LeagueSelectionState => ({
  databaseFingerprint,
  searchQuery: "",
  regionFilterId: null,
  statusFilter: "all",
  expandedRegionIds: [],
  expandedNationIds: [],
  intents: [],
  rememberedScopes: {},
  resolved: null,
  estimateStatus: "idle",
  selectionRevision: 0,
  submitting: false,
  acknowledgedRevision: null,
  notice: null,
});

/** §21.1 plus the three replies the async edges send back in. */
export type LeagueSelectionCommand =
  | { readonly type: "SET_SEARCH_QUERY"; readonly query: string }
  | { readonly type: "SET_REGION_FILTER"; readonly regionId: string | null }
  | { readonly type: "SET_STATUS_FILTER"; readonly filter: StatusFilter }
  | { readonly type: "TOGGLE_REGION"; readonly regionId: string }
  | { readonly type: "TOGGLE_NATION"; readonly nationId: string }
  | { readonly type: "EXPAND_ALL"; readonly regionIds: readonly string[] }
  | { readonly type: "COLLAPSE_ALL" }
  | {
      readonly type: "SET_NATION_MODE";
      readonly nationId: string;
      readonly mode: SimulationMode;
      readonly fallbackScopeOptionId: string | null;
    }
  | { readonly type: "SET_NATION_SCOPE"; readonly nationId: string; readonly scopeOptionId: string }
  | {
      readonly type: "APPLY_INTENTS";
      readonly intents: readonly NationSelectionIntentPayload[];
      readonly notice: string | null;
    }
  | { readonly type: "CLEAR_SELECTION" }
  | { readonly type: "ACKNOWLEDGE_WARNINGS" }
  | { readonly type: "DISMISS_NOTICE" }
  | { readonly type: "ESTIMATE_STARTED" }
  | { readonly type: "ESTIMATE_UPDATED"; readonly resolved: ResolvedSelectionView }
  | { readonly type: "ESTIMATE_FAILED"; readonly revision: number }
  | { readonly type: "SUBMISSION_STARTED" }
  | { readonly type: "SUBMISSION_SETTLED"; readonly notice: string | null };

const toggle = (values: readonly string[], value: string): readonly string[] =>
  values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];

/**
 * Bump the revision and drop any stale acknowledgement.
 *
 * Every path that changes what would be submitted goes through here. Warnings acknowledged
 * against revision 4 say nothing about revision 5, and §17.1 requires the confirmation to be
 * re-asked rather than silently reused — clearing it here means no caller can forget to.
 *
 * `estimateStatus` becomes `updating` rather than `idle`: the previous estimate stays on screen
 * and is marked stale, which is the §11.5 behaviour ("display the last valid estimate while a new
 * one is calculated").
 */
const selectionChanged = (state: LeagueSelectionState): LeagueSelectionState => ({
  ...state,
  selectionRevision: state.selectionRevision + 1,
  acknowledgedRevision: null,
  estimateStatus: "updating",
});

export const reduce = (
  state: LeagueSelectionState,
  command: LeagueSelectionCommand,
): LeagueSelectionState => {
  switch (command.type) {
    // Filters are display-only. They never touch `intents`, which is the whole of AC-8: a
    // selection hidden by a filter is still selected, and the browser says so separately.
    case "SET_SEARCH_QUERY":
      return { ...state, searchQuery: command.query };
    case "SET_REGION_FILTER":
      return { ...state, regionFilterId: command.regionId };
    case "SET_STATUS_FILTER":
      return { ...state, statusFilter: command.filter };
    case "TOGGLE_REGION":
      return { ...state, expandedRegionIds: toggle(state.expandedRegionIds, command.regionId) };
    case "TOGGLE_NATION":
      return { ...state, expandedNationIds: toggle(state.expandedNationIds, command.nationId) };
    case "EXPAND_ALL":
      return { ...state, expandedRegionIds: command.regionIds };
    case "COLLAPSE_ALL":
      return { ...state, expandedRegionIds: [], expandedNationIds: [] };

    case "SET_NATION_MODE": {
      const previous = state.intents.find((intent) => intent.nationId === command.nationId);
      const remembered =
        previous?.mode === "playable" && previous.scopeOptionId !== undefined
          ? { ...state.rememberedScopes, [command.nationId]: previous.scopeOptionId as string }
          : state.rememberedScopes;
      const without = state.intents.filter((intent) => intent.nationId !== command.nationId);

      if (command.mode === "not_loaded") {
        return selectionChanged({ ...state, intents: without, rememberedScopes: remembered });
      }
      if (command.mode === "playable") {
        const scopeOptionId = remembered[command.nationId] ?? command.fallbackScopeOptionId;
        return selectionChanged({
          ...state,
          rememberedScopes: remembered,
          intents: [
            ...without,
            {
              nationId: command.nationId,
              mode: "playable",
              ...(scopeOptionId === null || scopeOptionId === undefined
                ? {}
                : { scopeOptionId }),
              source: "user",
            } as NationSelectionIntentPayload,
          ],
        });
      }
      return selectionChanged({
        ...state,
        rememberedScopes: remembered,
        intents: [
          ...without,
          { nationId: command.nationId, mode: command.mode, source: "user" } as NationSelectionIntentPayload,
        ],
      });
    }

    case "SET_NATION_SCOPE":
      return selectionChanged({
        ...state,
        intents: [
          ...state.intents.filter((intent) => intent.nationId !== command.nationId),
          {
            nationId: command.nationId,
            mode: "playable",
            scopeOptionId: command.scopeOptionId,
            source: "user",
          } as NationSelectionIntentPayload,
        ],
      });

    case "APPLY_INTENTS":
      return selectionChanged({ ...state, intents: command.intents, notice: command.notice });

    case "CLEAR_SELECTION":
      // Remembered depths survive a clear: re-selecting a Nation the user just cleared should
      // come back at the depth they had chosen, not at the database default.
      return selectionChanged({ ...state, intents: [] });

    case "ACKNOWLEDGE_WARNINGS":
      return { ...state, acknowledgedRevision: state.selectionRevision };

    case "DISMISS_NOTICE":
      return { ...state, notice: null };

    case "ESTIMATE_STARTED":
      return { ...state, estimateStatus: "updating" };

    case "ESTIMATE_UPDATED":
      // AC-11. A slow answer for an older selection is discarded, never rendered: the display
      // keeps whatever matches the current revision. This is the only place `resolved` is set.
      return command.resolved.selectionRevision !== state.selectionRevision
        ? state
        : { ...state, resolved: command.resolved, estimateStatus: "ready" };

    case "ESTIMATE_FAILED":
      // §20: an estimate failure must not corrupt the selection, so only the status moves.
      return command.revision !== state.selectionRevision
        ? state
        : { ...state, estimateStatus: "failed" };

    case "SUBMISSION_STARTED":
      // AC-13. The guard is here rather than on the button: a second Enter, a double click, and a
      // dispatched Action all arrive as this command, and only the first may start a submission.
      return state.submitting ? state : { ...state, submitting: true };

    case "SUBMISSION_SETTLED":
      return { ...state, submitting: false, notice: command.notice };
  }
};

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** The issues attached to one Nation, plus the global ones, at or above a level. */
export const issuesForNation = (
  resolved: ResolvedSelectionView | null,
  nationId: string,
): readonly SelectionIssueRow[] =>
  resolved === null ? [] : resolved.issues.filter((entry) => entry.nationId === nationId);

export const blockingIssueRows = (
  resolved: ResolvedSelectionView | null,
): readonly SelectionIssueRow[] =>
  resolved === null ? [] : resolved.issues.filter((entry) => entry.level === "blocking");

export const warningIssueRows = (
  resolved: ResolvedSelectionView | null,
): readonly SelectionIssueRow[] =>
  resolved === null ? [] : resolved.issues.filter((entry) => entry.level === "warning");

/**
 * §5.5, §17. `Continue` is live only when a *current* answer says nothing blocks.
 *
 * A selection whose resolution is still in flight cannot continue: submitting against figures
 * from an older revision is exactly the race §17 exists to prevent. Warnings do not disable the
 * control — they gate on the acknowledgement, which the screen collects in a dialog.
 */
export const canContinueNow = (state: LeagueSelectionState): boolean =>
  state.resolved !== null &&
  state.resolved.selectionRevision === state.selectionRevision &&
  state.estimateStatus === "ready" &&
  !state.submitting &&
  blockingIssueRows(state.resolved).length === 0;

/** True when Continue must first collect an acknowledgement for the current revision (§17.1). */
export const needsWarningAcknowledgement = (state: LeagueSelectionState): boolean =>
  warningIssueRows(state.resolved).length > 0 &&
  state.acknowledgedRevision !== state.selectionRevision;

export interface NationRowView {
  readonly nation: NationRow;
  readonly state: NationSelectionState;
  readonly triState: TriState;
  readonly mode: SimulationMode;
  readonly scopeOptionId: string | null;
  readonly activeCompetitionIds: readonly string[];
  readonly dependencyCompetitionIds: readonly string[];
  readonly issues: readonly SelectionIssueRow[];
  /** True when this Nation matched the current search, so the browser can highlight it. */
  readonly matchesSearch: boolean;
}

export interface RegionGroupView {
  readonly regionId: string;
  readonly regionName: string;
  readonly nations: readonly NationRowView[];
  readonly expanded: boolean;
}

export interface BrowserView {
  readonly regions: readonly RegionGroupView[];
  /** §10.5. Selected Nations the current filters are hiding. Rendered as a persistent notice so
   *  the user never concludes their configuration was cleared. */
  readonly hiddenSelectedCount: number;
  readonly totalMatchCount: number;
}

/**
 * Build the browser's tree for the current filters.
 *
 * The resolved selection is passed in rather than recomputed: Nation state is derived from the
 * *effective* selection, so a Nation active only through another Nation's dependency shows as
 * such (§7.1) even though nothing in `intents` mentions it.
 */
export const browserView = (
  index: LeagueSetupIndexView,
  state: LeagueSelectionState,
  resolved: ResolvedSelectionView | null,
): BrowserView => {
  const hits = state.searchQuery.trim() === "" ? null : searchIndex(toDomainIndex(index), state.searchQuery);
  const matchedNationIds = hits === null ? null : new Set(hits.map((hit) => hit.nationId));

  const selectionByNation = new Map(
    (resolved?.selections ?? []).map((selection) => [selection.nationId as string, selection]),
  );

  let hiddenSelectedCount = 0;
  let totalMatchCount = 0;

  const regions = index.regions.map((region): RegionGroupView => {
    const nations = index.nations
      .filter((nation) => nation.regionId === region.id)
      .map((nation): NationRowView => {
        const selection = selectionByNation.get(nation.id as string);
        const derived = nationSelectionState(toDomainNation(nation), {
          selections: resolved === null ? [] : resolved.selections.map((entry) => toDomainSelection(entry)),
          dependencies: [],
          issues: [],
        });
        const issues = issuesForNation(resolved, nation.id as string);
        return {
          nation,
          state: derived,
          triState: nationTriState(derived),
          mode: selection?.mode ?? "not_loaded",
          scopeOptionId: (selection?.scopeOptionId as string | undefined) ?? null,
          activeCompetitionIds: [
            ...(selection?.playableCompetitionIds ?? []),
            ...(selection?.backgroundCompetitionIds ?? []),
            ...(selection?.viewOnlyCompetitionIds ?? []),
          ] as readonly string[],
          dependencyCompetitionIds: (selection?.dependencyCompetitionIds ?? []) as readonly string[],
          issues,
          matchesSearch: matchedNationIds === null ? false : matchedNationIds.has(nation.id as string),
        };
      });

    const visible = nations.filter((row) => {
      const passesRegion = state.regionFilterId === null || state.regionFilterId === region.id;
      const passesSearch = matchedNationIds === null || matchedNationIds.has(row.nation.id as string);
      const passesStatus = matchesStatusFilter(
        state.statusFilter,
        row.state,
        row.issues.some((entry) => entry.level !== "info"),
      );
      const shown = passesRegion && passesSearch && passesStatus;
      if (!shown && row.state !== "not_selected" && row.state !== "unavailable") {
        hiddenSelectedCount += 1;
      }
      if (shown) totalMatchCount += 1;
      return shown;
    });

    return {
      regionId: region.id as string,
      regionName: region.name,
      nations: visible,
      expanded: state.expandedRegionIds.includes(region.id as string),
    };
  });

  return {
    regions: regions.filter((region) => region.nations.length > 0),
    hiddenSelectedCount,
    totalMatchCount,
  };
};

// The read model and the domain model carry the same shapes with branded ids on one side. These
// three adapters strip the brands for the pure helpers, which validate against the catalogue
// rather than trusting the type.
const toDomainIndex = (index: LeagueSetupIndexView) => ({
  fingerprint: index.fingerprint,
  databaseName: index.databaseName,
  databaseVersion: index.databaseVersion,
  regions: index.regions.map((region) => ({ id: region.id as string, name: region.name })),
  nations: index.nations.map((nation) => toDomainNation(nation)),
});

const toDomainNation = (nation: NationRow) => ({
  id: nation.id as string,
  regionId: nation.regionId as string,
  name: nation.name,
  alternativeNames: nation.alternativeNames,
  available: nation.available,
  playableSupported: nation.playableSupported,
  recommendedScopeOptionId: (nation.recommendedScopeOptionId as string | null) ?? null,
  scopeOptions: nation.scopeOptions.map((option) => ({
    id: option.id as string,
    nationId: option.nationId as string,
    displayName: option.displayName,
    playableCompetitionIds: option.playableCompetitionIds as readonly string[],
    backgroundCompetitionIds: option.backgroundCompetitionIds as readonly string[],
  })),
  competitions: nation.competitions.map((competition) => ({
    id: competition.id as string,
    nationId: competition.nationId as string,
    name: competition.name,
    kind: competition.kind,
    tier: competition.tier,
    requires: competition.requires as readonly string[],
    clubCount: competition.clubCount,
    annualMatches: 0,
    playableSupported: competition.playableSupported,
    estimatesVerified: true,
  })),
});

const toDomainSelection = (selection: ResolvedSelectionView["selections"][number]) => ({
  nationId: selection.nationId as string,
  mode: selection.mode,
  ...(selection.scopeOptionId === undefined
    ? {}
    : { scopeOptionId: selection.scopeOptionId as string }),
  playableCompetitionIds: selection.playableCompetitionIds as readonly string[],
  backgroundCompetitionIds: selection.backgroundCompetitionIds as readonly string[],
  viewOnlyCompetitionIds: selection.viewOnlyCompetitionIds as readonly string[],
  dependencyCompetitionIds: selection.dependencyCompetitionIds as readonly string[],
});

// ---------------------------------------------------------------------------
// Presentation helpers (§11.2, §11.4)
// ---------------------------------------------------------------------------

export const SPEED_LABELS: Readonly<Record<string, string>> = {
  very_fast: "Very fast",
  fast: "Fast",
  medium: "Medium",
  slow: "Slow",
  very_slow: "Very slow",
  unsupported: "Not supported on this computer",
};

/** §11.4. Rounded to a scale a reader can act on. Precision beyond this would be a claim the
 *  model cannot support. */
export const formatBytes = (bytes: number): string => {
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${Math.round(bytes / 1024 ** 2)} MB`;
};

export const formatCount = (value: number): string => value.toLocaleString("en-GB");
