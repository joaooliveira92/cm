import type { LeagueSetupIndexView, ResolvedSelectionView } from "@cm-clone/contracts";
import {
  estimateActiveLeaguesConsequences,
  catalogueName,
  projectActiveLeagues,
  validateAdvancedOptions,
  type ActiveLeaguesEntityEstimate,
  type ActiveLeaguesProjection,
  type LeagueRecommendation,
  type ProcessingCostReading,
  type RecommendationReason,
  type AdvancedOptionsState,
} from "@cm-clone/shared";
import { Atom } from "../rpc.js";
import { toDomainIndex, toDomainIntents, toDomainResolved } from "./adapters.js";
import type { ActiveLeaguesSetupState, ResolvedSlot } from "./types.js";

/**
 * The Active Leagues derived atoms (spec "One authoritative setup state; everything else is
 * derived").
 *
 * The authoritative state and the resolved slot are the only two writable values; every figure
 * the screen renders is a pure reader over them:
 *
 * - the row model (`ActiveLeaguesProjection` from ticket 01),
 * - the entity count, the processing-cost reading, and the per-league recommendation reasons
 *   (the ticket-02 consequence layer),
 * - the validation status and whether Continue is allowed.
 *
 * None of these is ever written into authoritative state, and no `useEffect` copies a calculated
 * number anywhere — the atoms recompute from their inputs, so a summary can never go stale.
 *
 * The derived figures all consume the *same* resolved answer the resolver returned, so the rows,
 * the consequences, and the validation can never disagree with one another.
 */

/** One renderable row: the projection's stable row joined with its recommendation reason. */
export interface GridRowView {
  readonly leagueId: string;
  readonly leagueName: string;
  readonly nationId: string;
  readonly nationName: string;
  /** The row's nation code (ISO 3166-1 alpha-3) for the emblem badge. */
  readonly nationCode: string;
  readonly scopeDescription: string;
  readonly depth: ActiveLeaguesProjection["rows"][number]["depth"];
  readonly isDependency: boolean;
  /** Present for rows the grid can re-depth; absent (dependency) rows are read-only. */
  readonly editableDepth: ActiveLeaguesProjection["rows"][number]["editableDepth"];
  /** True when some scope option of the Nation can make this league playable (`full` offered). */
  readonly fullReachable: boolean;
  readonly recommendation: RecommendationReason;
}

/** The validation read up to the grid and sidebar, as checked values (never throws). */
export interface ActiveLeaguesValidation {
  readonly valid: boolean;
  readonly hasAtLeastOneActiveLeague: boolean;
  readonly duplicateLeagueIds: readonly string[];
  readonly blockingMessages: readonly string[];
}

/** One league the catalogue offers that the current setup does not carry yet. */
export interface AddableLeagueView {
  readonly leagueId: string;
  readonly leagueName: string;
  readonly nationName: string;
}

/** The complete derived view the workspace and sidebar consume. */
export interface ActiveLeaguesDerivedView {
  readonly rows: readonly GridRowView[];
  readonly activeLeagueCount: number;
  /** Distinct Nations the active leagues span — the introduction's scope summary reads it, so
   *  the figure is derived here with the rest and never counted inside a component. */
  readonly nationCount: number;
  readonly entityEstimate: ActiveLeaguesEntityEstimate;
  readonly processingCost: ProcessingCostReading;
  readonly recommendations: readonly LeagueRecommendation[];
  /** The catalogue's leagues that are not active yet, so the add control offers a real choice
   *  and a league already on the grid can never be added twice (the duplicate rail, at the
   *  affordance rather than only in the reducer). */
  readonly addableLeagues: readonly AddableLeagueView[];
  readonly validation: ActiveLeaguesValidation;
  readonly canContinue: boolean;
  /** True while the current selection has no fresh answer (nothing answered yet, or a newer
   *  answer in flight) — the `stale` flag the workspace renders against. */
  readonly stale: boolean;
  readonly slot: ResolvedSlot;
}

const neutralRecommendation: RecommendationReason = {
  code: "neutral",
  icon: "neutral",
  text: "No specific recommendation for this league.",
};

const EMPTY_ENTITY_ESTIMATE: ActiveLeaguesEntityEstimate = {
  activeLeagueCount: 0,
  clubCount: 0,
  playerCount: 0,
  staffCount: 0,
  entityCount: 0,
};

const EMPTY_PROCESSING_COST: ProcessingCostReading = {
  meterValue: 0,
  category: "light",
  label: "—",
  explanation: "No active leagues to estimate yet.",
  expensiveWarning: null,
};

/** The resolved answer the derived view reads, folding the loading/failed slot states so the
 *  previous answer stays on screen while a newer one resolves (§11.5). */
const resolvedOf = (slot: ResolvedSlot): ResolvedSelectionView | null => {
  switch (slot._tag) {
    case "idle":
      return null;
    case "loading":
    case "failed":
      return slot.previous;
    case "ready":
      return slot.resolved;
  }
};

/**
 * The pure derivation — one function, exhaustively tested, that the atoms memoize. `index` is
 * the wire catalogue; the domain index is rebuilt per call so tests can call this directly
 * against fixtures.
 */
export const deriveActiveLeaguesView = (
  index: LeagueSetupIndexView,
  state: ActiveLeaguesSetupState,
  slot: ResolvedSlot,
): ActiveLeaguesDerivedView => {
  const domainIndex = toDomainIndex(index);
  const resolved = resolvedOf(slot);
  const options = state.advancedOptions as unknown as AdvancedOptionsState;
  const optionsValidation = validateAdvancedOptions(options);

  let projection: ActiveLeaguesProjection | null = null;
  let consequences: ReturnType<typeof estimateActiveLeaguesConsequences> | null = null;
  if (resolved !== null) {
    const domainResolved = toDomainResolved(resolved);
    projection = projectActiveLeagues(domainIndex, domainResolved);
    consequences = estimateActiveLeaguesConsequences(
      domainIndex,
      projection,
      domainResolved,
      toDomainIntents(state.intents),
      options,
    );
  }

  const rows: readonly GridRowView[] =
    projection === null
      ? []
      : projection.rows.map((row): GridRowView => {
          const nation = domainIndex.nations.find((entry) => entry.id === row.nationId);
          const recommendation = consequences?.recommendations.find(
            (entry) => entry.leagueId === row.leagueId,
          )?.reason;
          return {
            leagueId: row.leagueId,
            leagueName: row.leagueName,
            nationId: row.nationId,
            nationName: row.nationName,
            nationCode: nation?.code ?? "",
            scopeDescription: row.scopeDescription,
            depth: row.depth,
            isDependency: row.isDependency,
            editableDepth: row.editableDepth,
            fullReachable: isFullReachable(domainIndex, row.nationId, row.leagueId),
            recommendation: recommendation ?? neutralRecommendation,
          };
        });

  // The catalogue minus what is already on the grid. Sorted by nation then league so the list
  // reads the same on every render — an add control whose options reorder under the pointer is
  // its own bug.
  const activeIds = new Set(rows.map((row) => row.leagueId));
  const addableLeagues: readonly AddableLeagueView[] = domainIndex.nations
    .filter((nation) => nation.available)
    .flatMap((nation) =>
      nation.competitions
        .filter((competition) => !activeIds.has(competition.id))
        .map((competition) => ({
          leagueId: competition.id,
          leagueName: catalogueName(competition.id),
          nationName: nation.name,
        })),
    )
    .sort((a, b) =>
      a.nationName === b.nationName
        ? a.leagueName.localeCompare(b.leagueName)
        : a.nationName.localeCompare(b.nationName),
    );

  const blockingMessages = [
    ...(projection?.issues.filter((entry) => entry.level === "blocking").map((entry) => entry.message) ?? []),
    ...optionsValidation.issues
      .filter((entry) => entry.level === "blocking")
      .map((entry) => entry.message),
  ];

  const valid =
    slot._tag === "ready" &&
    projection !== null &&
    projection.valid &&
    optionsValidation.valid &&
    blockingMessages.length === 0;

  return {
    rows,
    activeLeagueCount: projection?.rows.length ?? 0,
    nationCount: new Set(rows.map((row) => row.nationId)).size,
    entityEstimate: consequences?.entityEstimate ?? EMPTY_ENTITY_ESTIMATE,
    processingCost: consequences?.processingCost ?? EMPTY_PROCESSING_COST,
    recommendations: consequences?.recommendations ?? [],
    addableLeagues,
    validation: {
      valid,
      hasAtLeastOneActiveLeague: projection?.hasAtLeastOneActiveLeague ?? false,
      duplicateLeagueIds: projection?.duplicateLeagueIds ?? [],
      blockingMessages,
    },
    canContinue: valid,
    stale: resolved === null || slot._tag !== "ready",
    slot,
  };
};

/** Whether some scope option of the league's Nation carries it as playable — the same check the
 *  depth-change rail uses, so the offered `full` option and the reducer's accepted intent agree. */
const isFullReachable = (
  domainIndex: ReturnType<typeof toDomainIndex>,
  nationId: string,
  leagueId: string,
): boolean =>
  domainIndex.nations
    .find((nation) => nation.id === nationId)
    ?.scopeOptions.some((option) => option.playableCompetitionIds.includes(leagueId)) ?? false;

export interface ActiveLeaguesAtoms {
  readonly stateAtom: Atom.Writable<ActiveLeaguesSetupState>;
  readonly resolvedSlotAtom: Atom.Writable<ResolvedSlot>;
  /** The full derived view; the siblings below are the individual reads the ticket names. */
  readonly viewAtom: Atom.Atom<ActiveLeaguesDerivedView>;
  readonly rowsAtom: Atom.Atom<readonly GridRowView[]>;
  readonly activeLeagueCountAtom: Atom.Atom<number>;
  readonly nationCountAtom: Atom.Atom<number>;
  readonly entityEstimateAtom: Atom.Atom<ActiveLeaguesEntityEstimate>;
  readonly processingCostAtom: Atom.Atom<ProcessingCostReading>;
  readonly recommendationsAtom: Atom.Atom<readonly LeagueRecommendation[]>;
  readonly addableLeaguesAtom: Atom.Atom<readonly AddableLeagueView[]>;
  readonly validationAtom: Atom.Atom<ActiveLeaguesValidation>;
  readonly canContinueAtom: Atom.Atom<boolean>;
  readonly staleAtom: Atom.Atom<boolean>;
}

/** Build the atom set for one screen instance. The provider owns these, so two setups sharing a
 *  mount never share a value. */
export const createActiveLeaguesAtoms = (
  index: LeagueSetupIndexView,
  initial: ActiveLeaguesSetupState,
  initialSlot: ResolvedSlot = { _tag: "idle" },
): ActiveLeaguesAtoms => {
  const stateAtom = Atom.make(initial) as Atom.Writable<ActiveLeaguesSetupState>;
  const resolvedSlotAtom = Atom.make(initialSlot) as Atom.Writable<ResolvedSlot>;

  const viewAtom = Atom.readable((get) =>
    deriveActiveLeaguesView(index, get(stateAtom), get(resolvedSlotAtom)),
  );

  const read = <A>(select: (view: ActiveLeaguesDerivedView) => A): Atom.Atom<A> =>
    Atom.readable((get) => select(get(viewAtom)));

  return {
    stateAtom,
    resolvedSlotAtom,
    viewAtom,
    rowsAtom: read((view) => view.rows),
    activeLeagueCountAtom: read((view) => view.activeLeagueCount),
    nationCountAtom: read((view) => view.nationCount),
    entityEstimateAtom: read((view) => view.entityEstimate),
    processingCostAtom: read((view) => view.processingCost),
    recommendationsAtom: read((view) => view.recommendations),
    addableLeaguesAtom: read((view) => view.addableLeagues),
    validationAtom: read((view) => view.validation),
    canContinueAtom: read((view) => view.canContinue),
    staleAtom: read((view) => view.stale),
  };
};