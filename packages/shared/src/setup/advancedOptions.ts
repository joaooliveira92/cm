/**
 * Advanced options model for the Active Leagues Setup screen.
 *
 * Per the Active Leagues Setup spec's "Advanced options ship only where a real system exists"
 * decision: four option categories land, each tuning a shipped system and feeding the estimate
 * (or a real information policy), so a checkbox can never change nothing:
 *
 * - **Match-simulation detail** — tunes how much of a match the engine resolves. Feeds the
 *   processing-cost estimate (more detail, more per-minute event work).
 * - **Transfer-market activity** — tunes the volume of AI transfer movement. Feeds the
 *   processing-cost estimate (more activity, more market churn).
 * - **Roster-generation detail** — tunes how many players each loaded club carries (first team
 *   versus full squad depth). Feeds the entity-count estimate (players per club) and, through
 *   that, the processing cost.
 * - **Information visibility** — tunes the game's information policy: exact attribute figures
 *   versus the ranged, scouting-gated read the Attribute Range term describes. Does *not* feed
 *   the estimate; it feeds a real information policy (see `resolveInformationPolicy`).
 *
 * Everything here is pure and derived, with no I/O, like the rest of the selection domain.
 * Failures are checked values, never throws: an unsupported option value or an incompatible
 * combination is an `AdvancedOptionsIssue` (a validation result the screen renders), not a
 * defect. Staff generation and editor/developer capabilities do not exist in v1 and are
 * recorded as future slots (`ADVANCED_OPTION_FUTURE_SLOTS`), not modeled here.
 *
 * The state carries a `version` so the draft later persists a shape it can version; a payload
 * whose version is not this model's version is refused as a checked issue, never half-read.
 */

// ---------------------------------------------------------------------------
// The four categories and their shipped option values
// ---------------------------------------------------------------------------

export const MATCH_SIMULATION_DETAILS = ["full", "standard", "quick"] as const;
export type MatchSimulationDetail = (typeof MATCH_SIMULATION_DETAILS)[number];

export const TRANSFER_MARKET_ACTIVITIES = ["active", "standard", "quiet"] as const;
export type TransferMarketActivity = (typeof TRANSFER_MARKET_ACTIVITIES)[number];

export const ROSTER_GENERATION_DETAILS = ["full", "standard", "first_team"] as const;
export type RosterGenerationDetail = (typeof ROSTER_GENERATION_DETAILS)[number];

export const INFORMATION_VISIBILITIES = ["exact", "ranged"] as const;
export type InformationVisibility = (typeof INFORMATION_VISIBILITIES)[number];

export const ADVANCED_OPTIONS_VERSION = 1;

/** The four option keys — the setup state's advanced-options field, one value per key. */
export const ADVANCED_OPTION_KEYS = [
  "matchSimulationDetail",
  "transferMarketActivity",
  "rosterGenerationDetail",
  "informationVisibility",
] as const;

export type AdvancedOptionsKey = (typeof ADVANCED_OPTION_KEYS)[number];

export interface AdvancedOptionsState {
  /** Version of the shape the draft persists; a future version is refused rather than misread. */
  readonly version: typeof ADVANCED_OPTIONS_VERSION;
  readonly matchSimulationDetail: MatchSimulationDetail;
  readonly transferMarketActivity: TransferMarketActivity;
  readonly rosterGenerationDetail: RosterGenerationDetail;
  readonly informationVisibility: InformationVisibility;
}

/** The legal value set per key, for validation and for the screen's "legal option set" read. */
export const ADVANCED_OPTION_LEGAL_VALUES: Readonly<
  Record<AdvancedOptionsKey, readonly string[]>
> = {
  matchSimulationDetail: MATCH_SIMULATION_DETAILS,
  transferMarketActivity: TRANSFER_MARKET_ACTIVITIES,
  rosterGenerationDetail: ROSTER_GENERATION_DETAILS,
  informationVisibility: INFORMATION_VISIBILITIES,
};

/** The game's shipped default configuration: middle-of-the-road everywhere it exists. */
export const DEFAULT_ADVANCED_OPTIONS: AdvancedOptionsState = {
  version: ADVANCED_OPTIONS_VERSION,
  matchSimulationDetail: "standard",
  transferMarketActivity: "standard",
  rosterGenerationDetail: "standard",
  informationVisibility: "exact",
};

/**
 * Future slots. Staff generation and editor/developer capabilities are recorded because the
 * spec's decision says they stay as future slots, but no such system ships in v1, so they are
 * deliberately not modeled as options. A screen may render them disabled/absent; nothing reads
 * them as values.
 */
export const ADVANCED_OPTION_FUTURE_SLOTS = [
  { key: "staff_generation", label: "Staff generation" },
  { key: "editor_developer_capabilities", label: "Editor and developer capabilities" },
] as const;

// ---------------------------------------------------------------------------
// Issues: checked, never thrown
// ---------------------------------------------------------------------------

export const ADVANCED_OPTION_ISSUE_CODES = [
  "unsupported_option_value",
  "unknown_option_key",
  "incompatible_match_and_roster",
  "incompatible_visibility_and_market",
  "unsupported_version",
] as const;

export type AdvancedOptionsIssueCode = (typeof ADVANCED_OPTION_ISSUE_CODES)[number];

export const ADVANCED_OPTION_ISSUE_LEVELS = ["warning", "blocking"] as const;

export type AdvancedOptionsIssueLevel = (typeof ADVANCED_OPTION_ISSUE_LEVELS)[number];

export interface AdvancedOptionsIssue {
  readonly code: AdvancedOptionsIssueCode;
  readonly level: AdvancedOptionsIssueLevel;
  readonly message: string;
}

/**
 * Detect every incompatibility in an options state. Total over any `AdvancedOptionsState`:
 * an unsupported option value or an unknown key is reported as a blocking issue, never thrown.
 * The incompatible combinations are the spec's "which options are legal together and which
 * conflict": a full roster with quick match simulation is contradictory, and ranged visibility
 * with an active transfer market would let the market move on players the manager cannot read.
 */
export const validateAdvancedOptions = (
  options: AdvancedOptionsState,
): { readonly valid: boolean; readonly issues: readonly AdvancedOptionsIssue[] } => {
  const issues: AdvancedOptionsIssue[] = [];

  if (options.version !== ADVANCED_OPTIONS_VERSION) {
    issues.push({
      code: "unsupported_version",
      level: "blocking",
      message: `Advanced options version ${options.version} is not supported by this build (expected ${ADVANCED_OPTIONS_VERSION}).`,
    });
    return { valid: issues.length === 0, issues };
  }

  for (const key of ADVANCED_OPTION_KEYS) {
    const legal = ADVANCED_OPTION_LEGAL_VALUES[key];
    const value = options[key] as string;
    if (!legal.includes(value)) {
      issues.push({
        code: "unsupported_option_value",
        level: "blocking",
        message: `"${value}" is not a supported ${key} value.`,
      });
    }
  }

  if (options.matchSimulationDetail === "quick" && options.rosterGenerationDetail === "full") {
    issues.push({
      code: "incompatible_match_and_roster",
      level: "blocking",
      message:
        "Quick match simulation and a full roster generation contradict each other: a quick engine never exercises a full squad's per-player depth. Choose a slower simulation or a first-team roster.",
    });
  }

  if (options.informationVisibility === "ranged" && options.transferMarketActivity === "active") {
    issues.push({
      code: "incompatible_visibility_and_market",
      level: "blocking",
      message:
        "Ranged information visibility and an active transfer market are incompatible: a market that moves players on exact figures cannot run under the ranged read. Choose exact visibility or a quieter market.",
    });
  }

  return { valid: issues.length === 0, issues };
};

// ---------------------------------------------------------------------------
// Option application: a typed intent whose result is checked, never thrown
// ---------------------------------------------------------------------------

export interface ApplyAdvancedOptionsResult {
  readonly options: AdvancedOptionsState;
  readonly issues: readonly AdvancedOptionsIssue[];
  readonly valid: boolean;
}

/**
 * Apply a change to one option and report the resulting validation. An unknown key or an
 * unsupported value leaves the state unchanged and reports a blocking issue; a legal value
 * produces the new state with its own validation, so the caller sees an incompatibility as a
 * result to render and refuses to persist, never as a throw.
 */
export const applyAdvancedOption = (
  current: AdvancedOptionsState,
  key: AdvancedOptionsKey,
  value: string,
): ApplyAdvancedOptionsResult => {
  if (!ADVANCED_OPTION_KEYS.includes(key)) {
    return {
      options: current,
      issues: [
        { code: "unknown_option_key", level: "blocking", message: `Unknown advanced option "${key}".` },
      ],
      valid: false,
    };
  }
  if (!ADVANCED_OPTION_LEGAL_VALUES[key].includes(value)) {
    return {
      options: current,
      issues: [
        {
          code: "unsupported_option_value",
          level: "blocking",
          message: `"${value}" is not a supported ${key} value.`,
        },
      ],
      valid: false,
    };
  }

  const next: AdvancedOptionsState = { ...current, [key]: value as never };
  const { valid, issues } = validateAdvancedOptions(next);
  return { options: next, issues, valid };
};

/** The empty/absent-options case: a draft without an options field resolves to the shipped
 *  defaults, valid by construction. */
export const defaultAdvancedOptions = (): AdvancedOptionsState => ({
  ...DEFAULT_ADVANCED_OPTIONS,
});

// ---------------------------------------------------------------------------
// The estimate feed (ticket 02 consequence layer)
// ---------------------------------------------------------------------------

export interface AdvancedOptionsEstimateFactors {
  readonly matchSimulation: number;
  readonly transferMarket: number;
  readonly rosterPlayer: number;
}

/**
 * The three estimate factors for a given configuration, as one read. Each category maps onto a
 * multiplier over the ticket-02 reference-processing unit (match-simulation detail and
 * transfer-market activity scale the processing-cost score; roster-generation detail scales the
 * players-per-club entity figure). `1` is the shipped default, so an untouched configuration
 * produces exactly the ticket-02 numbers and only a *changed* option moves the sidebar feedback.
 */
export const estimateFactorsFor = (
  options: AdvancedOptionsState,
): AdvancedOptionsEstimateFactors => ({
  matchSimulation:
    options.matchSimulationDetail === "full"
      ? 1.15
      : options.matchSimulationDetail === "standard"
        ? 1
        : 0.7,
  transferMarket:
    options.transferMarketActivity === "active"
      ? 1.1
      : options.transferMarketActivity === "standard"
        ? 1
        : 0.8,
  rosterPlayer:
    options.rosterGenerationDetail === "full"
      ? 1.1
      : options.rosterGenerationDetail === "standard"
        ? 1
        : 0.85,
});

// ---------------------------------------------------------------------------
// The real information policy (information visibility)
// ---------------------------------------------------------------------------

/** What the game reveals about a player, per the Attribute Range / scouting vocabulary. */
export type InformationVisibilityPolicy = {
  /** `exact` — precise 1-20 figures; `ranged` — the bounded estimate until Fully Scouted. */
  readonly attributeDisplay: "exact" | "ranged";
};

/** The information policy the chosen visibility option produces — the "real information policy"
 *  this category feeds, distinct from the estimate. */
export const resolveInformationPolicy = (
  visibility: InformationVisibility,
): InformationVisibilityPolicy => ({
  attributeDisplay: visibility === "exact" ? "exact" : "ranged",
});