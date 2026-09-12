import { createRegistry } from "./registry.js";
import type { Action, ScopeState, ScreenName } from "./types.js";
import { gPrefixCompletionsOf } from "./overrides.js";
import {
  FREE_AGENT_PALETTE_OPTIONS,
  MARKET_PALETTE_OPTIONS,
  SQUAD_PALETTE_OPTIONS,
  tableSortAndFilterActions,
} from "../table/paletteActions.js";

/**
 * The canonical Action registry for the keyboard spine (ADR-0012). Every screen
 * operation is declared here colocated-by-scope and collected into one registry
 * at startup; buttons, the key map, the palette (Stage 4) and help overlay are
 * four views of the same records. The `id`s here are the stable kebab-case keys.
 *
 * The `handler` fields are structural placeholders — the spine and screens
 * register *live* handlers at runtime via `registerActionHandler`, so handlers
 * can close over React hooks (mutation setters) while the structure, labels,
 * bindings and availability check belong to the registry.
 */

const ready = (state: ScopeState): boolean => state.ready === true;

/** Career-global availability: a career is shown and the season can advance.
 *  A live match suspends the season (match-day note AC-4): `state.match` being
 *  present marks "in flight", so Continue (button, Space, palette) is uniformly
 *  unavailable until the match reaches full time. */
const continueAvailable = (state: ScopeState): boolean =>
  ready(state) &&
  state.advancing !== true &&
  state.match === undefined;

const navAction = (
  id: string,
  label: string,
  binding: string,
  metadata?: Record<string, unknown>,
): Action => ({
  id,
  label,
  scope: "career-global",
  available: ready,
  handler: () => undefined,
  binding,
  metadata,
});

/** All coded default bindings (global-key-map note). No single-key `g` binding. */
export const ALL_ACTIONS: ReadonlyArray<Action> = [
  // app-global — active on every screen (palette/help are discoverable from the
  // save list and creation flow too; only the g-prefix/Space are career-scoped).
  { id: "open-palette", label: "Open command palette", scope: "app-global", available: () => true, handler: () => undefined, binding: "Primary+K" },
  { id: "open-help", label: "Open keyboard help", scope: "app-global", available: () => true, handler: () => undefined, binding: "Primary+/" },
  // The help overlay is the rebinding surface (ticket 14): this unbounded palette command
  // opens it the same way Primary+/ does, giving rebinding a second, discoverable entry point.
  { id: "open-rebind", label: "Rebind…", scope: "app-global", available: () => true, handler: () => undefined },
  // career-global — active only while a career screen is shown.
  // `primary: true` is consumed by the career chrome for the gradient treatment —
  // presentation only, never automatic Enter dispatch (global-key-map note AC-11).
  { id: "continue", label: "Continue", scope: "career-global", available: continueAvailable, unavailableReason: "The Calendar cannot advance right now.", handler: () => undefined, binding: "Space", primary: true },
  navAction("go-to-squad", "Go to Squad", "g 1", { destination: "squad", sectionKey: "1" }),
  navAction("go-to-tactics", "Go to Tactics", "g 2", { destination: "tactics", sectionKey: "2" }),
  navAction("go-to-training", "Go to Training", "g 3", { destination: "squad", sectionKey: "3" }),
  navAction("go-to-recruitment", "Go to Recruitment", "g 4", { destination: "transfers", sectionKey: "4" }),
  navAction("go-to-analysis", "Go to Analysis", "g 5", { destination: "league", sectionKey: "5" }),
  navAction("go-to-news", "Go to News", "g 6", { destination: "news", sectionKey: "6" }),
  navAction("go-to-club", "Go to Club", "g 7", { destination: "manager", sectionKey: "7" }),
  { id: "go-to-transfers", label: "Go to Transfer Market", scope: "squad", available: ready, handler: () => undefined },
  navAction("go-back", "Go to previous screen", "g b"),
  // transfers
  { id: "focus-bid", label: "Focus the bid workflow", scope: "transfers", available: ready, handler: () => undefined, binding: "b" },
  { id: "place-bid", label: "Place a bid", scope: "transfers", available: ready, handler: () => undefined },
  { id: "sign-free-agent", label: "Sign free agent", scope: "transfers", available: ready, handler: () => undefined },
  { id: "respond-accept", label: "Accept incoming bid", scope: "transfers", available: ready, handler: () => undefined },
  { id: "respond-reject", label: "Reject incoming bid", scope: "transfers", available: ready, handler: () => undefined },
  { id: "respond-counter", label: "Counter incoming bid", scope: "transfers", available: ready, handler: () => undefined },
  { id: "accept-counter", label: "Accept counter-offer", scope: "transfers", available: ready, handler: () => undefined },
  { id: "withdraw-bid", label: "Withdraw outgoing bid", scope: "transfers", available: ready, handler: () => undefined },
  // transfers table palettes (Stage 5): sort/filter Market and Free Agents by
  // keyword — enumerated parameterized Actions sharing the header-button command.
  ...tableSortAndFilterActions(MARKET_PALETTE_OPTIONS),
  ...tableSortAndFilterActions(FREE_AGENT_PALETTE_OPTIONS),
  // squad table palette (Stage 5): sorting by the primary columns + position
  // filters; every attribute column remains header-sortable.
  ...tableSortAndFilterActions(SQUAD_PALETTE_OPTIONS),
  {
    id: "retry-squad-table",
    label: "Retry loading the Squad",
    scope: "squad",
    available: () => true,
    handler: () => undefined,
  },
  {
    id: "retry-market-table",
    label: "Retry loading the Market",
    scope: "transfers",
    available: () => true,
    handler: () => undefined,
  },
  {
    id: "retry-free-agents-table",
    label: "Retry loading Free Agents",
    scope: "transfers",
    available: () => true,
    handler: () => undefined,
  },
  {
    id: "restore-squad-columns",
    label: "Restore Squad column defaults",
    scope: "squad",
    available: ready,
    handler: () => undefined,
  },
  // main menu + load career — the one pre-career action: re-reading the Save
  // repository after a failure (save-list-error-handling ticket 01). One id
  // across two scopes is legal — same-id Actions in different scopes are
  // distinct records (registry note) — and exactly one screen is mounted at a
  // time, so the live handler map never serves a stale screen.
  {
    id: "retry-save-list",
    label: "Retry loading saves",
    scope: "mainMenu",
    available: () => true,
    handler: () => undefined,
  },
  {
    id: "retry-save-list",
    label: "Retry loading saves",
    scope: "loadCareer",
    available: () => true,
    handler: () => undefined,
  },
  // tactics
  { id: "save-tactic", label: "Save the tactic", scope: "tactics", available: ready, handler: () => undefined, primary: true },
  { id: "set-formation", label: "Choose a formation", scope: "tactics", available: ready, handler: () => undefined },
  { id: "set-mentality", label: "Set mentality", scope: "tactics", available: ready, handler: () => undefined },
  { id: "set-tempo", label: "Set tempo", scope: "tactics", available: ready, handler: () => undefined },
  { id: "set-pressing", label: "Set pressing", scope: "tactics", available: ready, handler: () => undefined },
  { id: "assign-slot-player", label: "Assign a player to a tactics slot", scope: "tactics", available: ready, handler: () => undefined },
  // match day
  { id: "start-match", label: "Play the match", scope: "match", available: ready, handler: () => undefined },
  { id: "quick-result", label: "Quick result", scope: "match", available: ready, handler: () => undefined },
  { id: "toggle-control-panel", label: "Toggle the live control panel", scope: "match", available: ready, handler: () => undefined },
  { id: "apply-live-tactics", label: "Apply live tactics change", scope: "match", available: ready, handler: () => undefined },
  { id: "set-live-mentality", label: "Set live mentality", scope: "match", available: ready, handler: () => undefined },
  { id: "set-live-tempo", label: "Set live tempo", scope: "match", available: ready, handler: () => undefined },
  { id: "set-live-pressing", label: "Set live pressing", scope: "match", available: ready, handler: () => undefined },
  { id: "set-live-substitute-off", label: "Choose the player coming off", scope: "match", available: ready, handler: () => undefined },
  { id: "set-live-substitute-in", label: "Choose the player coming on", scope: "match", available: ready, handler: () => undefined },
  { id: "make-substitution", label: "Make a substitution", scope: "match", available: ready, handler: () => undefined },
  { id: "play-on", label: "Play on (crippled)", scope: "match", available: ready, handler: () => undefined },
  { id: "bring-off", label: "Bring off (10 men)", scope: "match", available: ready, handler: () => undefined },
  { id: "commit-matchday", label: "Accept the result", scope: "match", available: ready, handler: () => undefined },
];

/** The compiled registry. Build-time collision/locked-key checks run here (AC-17). */
export const ACTION_REGISTRY = createRegistry(ALL_ACTIONS);

/** The valid `g <key>` completion set derived from the registry's career-global nav actions.
 *  (Defaults-only — the spine derives the *effective* set from overrides via
 *  `gPrefixCompletionsOf` in `overrides.ts`; this constant is what a fresh player sees.) */
export const G_PREFIX_COMPLETIONS: ReadonlySet<string> = gPrefixCompletionsOf(ALL_ACTIONS);

/**
 * Per-screen registry metadata (command-palette note: inline key badges are
 * toggleable *per screen*, not an all-or-nothing project switch — dense tables
 * may prefer clean buttons, action-heavy screens benefit most). Read through
 * `keyBadgesEnabledFor`; the badge helper in `discoverability/ActionKeyBadge`
 * is the single consumer so rendered badges can never drift from the registry.
 */
export interface ScreenRegistryMetadata {
  readonly showKeyBadges: boolean;
}

export const SCREEN_METADATA: Readonly<Record<ScreenName, ScreenRegistryMetadata>> = {
  squad: { showKeyBadges: false },
  tactics: { showKeyBadges: false },
  transfers: { showKeyBadges: true },
  league: { showKeyBadges: true },
  fixtures: { showKeyBadges: false },
  match: { showKeyBadges: false },
  seasonSummary: { showKeyBadges: false },
  manager: { showKeyBadges: false },
  news: { showKeyBadges: false },
  training: { showKeyBadges: false },
  clubInfo: { showKeyBadges: false },
  boardConfidence: { showKeyBadges: false },
  clubHistory: { showKeyBadges: false },
  finances: { showKeyBadges: true },
  staffOverview: { showKeyBadges: false },
  shortlist: { showKeyBadges: false },
  scouting: { showKeyBadges: false },
  playerSearch: { showKeyBadges: true },
  staffSearch: { showKeyBadges: true },
  competitions: { showKeyBadges: true },
  nations: { showKeyBadges: false },
  clubs: { showKeyBadges: false },
  gameStatus: { showKeyBadges: false },
  managerChat: { showKeyBadges: false },
  // The club-scoped drill-downs are terminal reading surfaces owning no screen-scoped action, so
  // there is nothing on either page a badge could sit on.
  clubStaff: { showKeyBadges: false },
  teamScoutReport: { showKeyBadges: false },
  // The player-scoped drill-down — same rationale.
  playerProfile: { showKeyBadges: false },
  playerAttributes: { showKeyBadges: false },
  playerContract: { showKeyBadges: false },
  playerHistory: { showKeyBadges: false },
  playerForm: { showKeyBadges: false },
  playerInjuries: { showKeyBadges: false },
  playerScoutReport: { showKeyBadges: false },
  playerCoachReport: { showKeyBadges: false },
  // The staff-scoped drill-downs.
  staffProfile: { showKeyBadges: false },
  staffAttributes: { showKeyBadges: false },
  staffContract: { showKeyBadges: false },
  staffHistory: { showKeyBadges: false },
  staffJobInfo: { showKeyBadges: false },
  // The club sub-surface drill-downs.
  clubSquadDetail: { showKeyBadges: false },
  clubReservesDetail: { showKeyBadges: false },
  clubYouthDetail: { showKeyBadges: false },
  clubFixturesDetail: { showKeyBadges: false },
  clubTransfersDetail: { showKeyBadges: false },
  clubFinancesDetail: { showKeyBadges: false },
  clubHistoryDetail: { showKeyBadges: false },
  clubCompetitionsDetail: { showKeyBadges: false },
  clubInformation: { showKeyBadges: false },
  // The nation-scoped drill-downs.
  nationOverview: { showKeyBadges: false },
  nationSeniorSquad: { showKeyBadges: false },
  nationYouthSquads: { showKeyBadges: false },
  nationFixtures: { showKeyBadges: false },
  nationCompetitions: { showKeyBadges: false },
  nationClubs: { showKeyBadges: false },
  nationPlayers: { showKeyBadges: false },
  nationStaff: { showKeyBadges: false },
  nationHistory: { showKeyBadges: false },
  nationInformation: { showKeyBadges: false },
  // The competition-scoped drill-downs.
  competitionOverview: { showKeyBadges: false },
  competitionTable: { showKeyBadges: true },
  competitionFixturesDetail: { showKeyBadges: false },
  competitionResults: { showKeyBadges: false },
  competitionStages: { showKeyBadges: false },
  competitionRules: { showKeyBadges: false },
  competitionStatistics: { showKeyBadges: true },
  competitionPastWinners: { showKeyBadges: false },
  competitionRecords: { showKeyBadges: false },
  competitionNews: { showKeyBadges: false },
  competitionTeams: { showKeyBadges: false },
  competitionPlayerStats: { showKeyBadges: true },
  // The match sub-screen placeholders.
  matchStats: { showKeyBadges: false },
  matchPlayerStats: { showKeyBadges: false },
  matchHomeTeam: { showKeyBadges: false },
  matchAwayTeam: { showKeyBadges: false },
  matchRatings: { showKeyBadges: false },
  matchLatestScores: { showKeyBadges: false },
  matchLiveTable: { showKeyBadges: true },
  matchMatchTactics: { showKeyBadges: false },
  matchSubstitutions: { showKeyBadges: false },
  matchOppositionInstructions: { showKeyBadges: false },
  matchCommentary: { showKeyBadges: false },
  matchReplays: { showKeyBadges: false },
  matchReport: { showKeyBadges: false },
  createLeagues: { showKeyBadges: false },
  createStep1: { showKeyBadges: false },
  createStep2: { showKeyBadges: false },
  createStep3: { showKeyBadges: false },
  mainMenu: { showKeyBadges: false },
  loadCareer: { showKeyBadges: false },
};

/** Honored by the badge renderer: a screen opts into inline key badges here. */
export const keyBadgesEnabledFor = (screen: ScreenName): boolean =>
  SCREEN_METADATA[screen].showKeyBadges;
