import { createRegistry } from "./registry.js";
import type { Action, ScopeState, ScreenName } from "./types.js";
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

/** Career-global availability: a career is shown and the season can advance. */
const continueAvailable = (state: ScopeState): boolean =>
  ready(state) && state.phase !== "season_complete" && state.advancing !== true;

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
  // career-global — active only while a career screen is shown.
  { id: "continue", label: "Continue", scope: "career-global", available: continueAvailable, unavailableReason: "The Calendar cannot advance right now.", handler: () => undefined, binding: "Space" },
  navAction("go-to-squad", "Go to Squad", "g s", { destination: "squad" }),
  navAction("go-to-tactics", "Go to Tactics", "g a", { destination: "tactics" }),
  navAction("go-to-transfers", "Go to Transfers", "g t", { destination: "transfers" }),
  navAction("go-to-league", "Go to League Table", "g l", { destination: "league" }),
  navAction("go-to-fixtures", "Go to Fixtures", "g f", { destination: "fixtures" }),
  navAction("go-to-match", "Go to Match Day", "g m", { destination: "match" }),
  navAction("go-to-season-summary", "Go to Season Summary", "g y", { destination: "seasonSummary" }),
  navAction("go-back", "Go to previous screen", "g b"),
  // league
  { id: "advance-calendar", label: "Advance the Calendar", scope: "league", available: continueAvailable, unavailableReason: "The Calendar cannot advance right now.", handler: () => undefined, binding: "c", primary: true },
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
  // tactics
  { id: "save-tactic", label: "Save the tactic", scope: "tactics", available: ready, handler: () => undefined, primary: true },
  { id: "set-formation", label: "Choose a formation", scope: "tactics", available: ready, handler: () => undefined },
  { id: "set-mentality", label: "Set mentality", scope: "tactics", available: ready, handler: () => undefined },
  { id: "set-tempo", label: "Set tempo", scope: "tactics", available: ready, handler: () => undefined },
  { id: "set-pressing", label: "Set pressing", scope: "tactics", available: ready, handler: () => undefined },
  { id: "assign-slot-player", label: "Assign a player to a tactics slot", scope: "tactics", available: ready, handler: () => undefined },
  // match day
  { id: "start-match", label: "Start the match", scope: "match", available: ready, handler: () => undefined },
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
  { id: "reset-match", label: "Back to the opponent picker", scope: "match", available: ready, handler: () => undefined },
];

/** The compiled registry. Build-time collision/locked-key checks run here (AC-17). */
export const ACTION_REGISTRY = createRegistry(ALL_ACTIONS);

/** The valid `g <key>` completion set derived from the registry's career-global nav actions. */
export const G_PREFIX_COMPLETIONS: ReadonlySet<string> = new Set(
  ALL_ACTIONS.filter((a) => a.scope === "career-global")
    .map((a) => a.binding)
    .filter((b): b is string => b !== undefined && b.startsWith("g "))
    .map((b) => b.slice(2).trim()),
);

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
  createStep1: { showKeyBadges: false },
  createStep2: { showKeyBadges: false },
  createStep3: { showKeyBadges: false },
  saveList: { showKeyBadges: false },
};

/** Honored by the badge renderer: a screen opts into inline key badges here. */
export const keyBadgesEnabledFor = (screen: ScreenName): boolean =>
  SCREEN_METADATA[screen].showKeyBadges;
