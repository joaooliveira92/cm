/**
 * The Action model (ADR-0012 — keyboard-first renderer). Every screen operation
 * is a named, scoped, dispatchable record; the command palette (Stage 4), help
 * overlay, key bindings, and rendered buttons are four views of the same record.
 *
 * UI vocabulary lives here in the renderer, never in CONTEXT.md (a pure game-domain
 * glossary). `id`s are stable kebab-case keys shared by the key map, palette, and
 * help overlay.
 */

/** The career screens (route screen-ids) plus the creation/save list scopes. */
export type ScreenName =
  | "squad"
  | "tactics"
  | "transfers"
  | "league"
  | "fixtures"
  | "match"
  | "seasonSummary"
  | "manager"
  | "createLeagues"
  | "createStep1"
  | "createStep2"
  | "createStep3"
  | "mainMenu"
  | "loadCareer";

/** A career screen id — the subset with `g <key>` navigation (note: creation is excluded). */
export type CareerScreenName =
  | "squad"
  | "tactics"
  | "transfers"
  | "league"
  | "fixtures"
  | "match"
  | "seasonSummary"
  | "manager";

/**
 * The scope an Action lives in. `screen`/`career-global`/`app-global` spans the
 * scope classification in the global-key-map note; the bare-screen scope is the
 * `career_screen` scope, and `app-global` covers `app_global` invariants.
 */
export type ActionScope = "app-global" | "career-global" | ScreenName;

/**
 * The minimal read model `available` predicates are evaluated against — the
 * current screen's state, never the full React tree. `ready` marks a screen
 * whose data has loaded and whose controls are live.
 */
export interface ScopeState {
  readonly ready: boolean;
  /**
   * A live match readout, published by the Match Day screen while a match is
   * in flight (match-day note AC-4). When present, the career chrome's temporal
   * cluster shows the match instead of the season readout and Continue is
   * unavailable; absent at full time, the season readout and Continue return.
   */
  readonly match?: MatchReadout | undefined;
  readonly [key: string]: unknown;
}

/**
 * The read-only slice of a live match the chrome shows. Deliberately the same
 * surface the domain exposes — club names and the score — so the temporal
 * cluster and the scoreboard agree. The unit is minutes, never a clock.
 */
export interface MatchReadout {
  readonly homeClubName: string;
  readonly awayClubName: string;
  readonly homeScore: number;
  readonly awayScore: number;
  readonly currentMinute: number;
}

/** A dispatchable, scoped, named operation. `handler` takes the operation's
 *  typed parameters; availability is a best-effort frontend optimisation — the
 *  backend still validates every command. */
export interface Action<Params = void> {
  readonly id: string;
  readonly label: string;
  readonly scope: ActionScope;
  readonly available: (context: ScopeState) => boolean;
  readonly handler: (params: Params) => void | Promise<void>;
  /** Coded default keyboard binding (e.g. `"g s"`, `"Space"`, `"b"`). */
  readonly binding?: string;
  /** Primary-action designation: drives presentation and discovery, never
   *  automatic `Enter` dispatch (global-key-map note AC-11). */
  readonly primary?: boolean;
  /** Plain-language reason shown when `available` is false (command-palette
   *  note: unavailable actions are disabled-with-reason, never hidden). */
  readonly unavailableReason?: string;
  /** Free-form registry metadata (badges, keyboard tier, ...) consumed by later stages. */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/** A single normalized keystroke, independent of keyboard layout/platform modifiers. */
export interface Keystroke {
  readonly key: string;
  readonly ctrl: boolean;
  readonly meta: boolean;
  readonly shift: boolean;
  /** True when produced with the Primary modifier (Cmd on macOS, Ctrl elsewhere). */
  readonly primary: boolean;
}
