/**
 * The player-status vocabulary (note: dense table visuals and the player-status
 * vocabulary). CM 03/04 put a runner of three-letter status abbreviations beside
 * every player name; this module is the clone's version of that vocabulary.
 *
 * Two halves, and the split is the whole point:
 *
 * - `RESERVED_STATUSES` is the FULL CM 03/04 set, recorded as a contract about
 *   the column's shape — so a future status system fills a seat rather than
 *   forcing a re-layout. Each entry carries an honest likelihood note: a
 *   reservation is not a promise that the engine will ever model it.
 * - `statusesOf` renders ONLY what the engine models today. Mechanical
 *   Provenance (contextual-help note) forbids the renderer inventing state, so
 *   every unmodeled status yields nothing and the cell is empty. There is
 *   deliberately no fallback branch that guesses.
 *
 * Accessibility: the abbreviation is the visual channel only. Every rendered
 * abbreviation ships its full term as text for assistive technology, and the
 * screen feeds the same full term to the table's polite announcer on row focus.
 * The raw code never reaches a screen reader.
 */
import { NON_CONTACT_CONDITION_THRESHOLD } from "@cm-clone/game-engine";
import { FOCUS_RING } from "../../focus.js";

/**
 * The semantic colour of a status, named for what it says about the player
 * rather than for the hue. Maps onto the three shared semantic text tokens; a
 * fourth status-only colour family would collide with the danger/amber/green
 * meanings every other surface already carries.
 */
export type StatusTone =
  /** Cannot be selected: injured, suspended, ineligible. */
  | "danger"
  /** Selectable but diminished or at risk: tired, one card from a ban. */
  | "warning"
  /** Market, contract and interest information; no effect on availability. */
  | "success";

/** How likely the engine is to ever model the state behind a reserved slot. */
export type StatusLikelihood =
  /** Modeled today — this one renders. */
  | "modeled"
  /** No engine state yet, but it sits on a system the game plausibly grows. */
  | "plausible"
  /** Depends on competition/selection rules the clone has no model for. */
  | "unlikely";

export interface ReservedStatus {
  /** The three-letter CM code. Visual channel only — never spoken. */
  readonly abbreviation: string;
  /** The full term. What assistive technology and the announcer receive. */
  readonly term: string;
  readonly tone: StatusTone;
  readonly likelihood: StatusLikelihood;
  /** Why this slot is reserved, or what the engine models for it today. */
  readonly note: string;
}

/** The one status the engine models today: below the engine's own fatigue-injury
 *  threshold, the player is tired. The threshold is imported rather than
 *  restated so the display rule cannot drift from the mechanic it reports. */
const TIRED: ReservedStatus = {
  abbreviation: "Tir",
  term: "Tired",
  tone: "warning",
  likelihood: "modeled",
  note: `Shown when Condition is below ${NON_CONTACT_CONDITION_THRESHOLD}% — the same threshold at which the match engine starts rolling fatigue injuries.`,
};

/**
 * The reserved catalogue, in CM 03/04's own order (`docs/design/ui-elements.md`).
 * Exactly one entry is `modeled` today. Adding an entry here reserves a slot;
 * it renders only once `statusesOf` can derive it from engine state.
 */
export const RESERVED_STATUSES: readonly ReservedStatus[] = [
  {
    abbreviation: "Lmp",
    term: "Lacking match practice",
    tone: "warning",
    likelihood: "plausible",
    note: "No appearance ledger per player yet; the season already tracks fixtures, so this is reachable.",
  },
  {
    abbreviation: "Inj",
    term: "Injured",
    tone: "danger",
    likelihood: "plausible",
    note: "Injury exists as a per-match event, not as a season-long 'out for N days' state.",
  },
  {
    abbreviation: "Sus",
    term: "Suspended",
    tone: "danger",
    likelihood: "plausible",
    note: "Cards are simulated; no accumulation or ban model reaches the squad read model.",
  },
  {
    abbreviation: "Wnt",
    term: "Wanted by another club",
    tone: "success",
    likelihood: "plausible",
    note: "AI clubs bid, but no standing interest is exposed per player.",
  },
  {
    abbreviation: "Bid",
    term: "Transfer bid received",
    tone: "success",
    likelihood: "plausible",
    note: "Incoming bids exist on the Transfers screen; they are not projected onto the squad row.",
  },
  {
    abbreviation: "Yel",
    term: "One booking from a suspension",
    tone: "warning",
    likelihood: "plausible",
    note: "Needs the same card-accumulation ledger as Suspended.",
  },
  {
    abbreviation: "Int",
    term: "On international duty",
    tone: "danger",
    likelihood: "unlikely",
    note: "No international teams or fixture calendar.",
  },
  {
    abbreviation: "Fgn",
    term: "Counts as a foreign player",
    tone: "danger",
    likelihood: "unlikely",
    note: "No nationality-based selection rules.",
  },
  {
    abbreviation: "Ine",
    term: "Ineligible for the competition",
    tone: "danger",
    likelihood: "unlikely",
    note: "No per-competition registration rules.",
  },
  {
    abbreviation: "Wpm",
    term: "No work permit",
    tone: "danger",
    likelihood: "unlikely",
    note: "No nationality or work-permit model.",
  },
  TIRED,
  {
    abbreviation: "Cup",
    term: "Cup-tied",
    tone: "danger",
    likelihood: "unlikely",
    note: "No cup competitions.",
  },
  {
    abbreviation: "Loa",
    term: "Available for loan",
    tone: "success",
    likelihood: "plausible",
    note: "No loan system; transfers are permanent.",
  },
  {
    abbreviation: "Lst",
    term: "Transfer-listed",
    tone: "success",
    likelihood: "plausible",
    note: "Transfers exist; no per-player listing flag is stored.",
  },
  {
    abbreviation: "Unh",
    term: "Unhappy",
    tone: "warning",
    likelihood: "plausible",
    note: "No player morale or happiness state.",
  },
  {
    abbreviation: "Unf",
    term: "Not fully fit",
    tone: "warning",
    likelihood: "plausible",
    note: "Distinct from Tired: needs an injury-recovery state, which the engine does not carry between matches.",
  },
  {
    abbreviation: "Sct",
    term: "Being scouted",
    tone: "success",
    likelihood: "unlikely",
    note: "Scouting is specified but unbuilt, and would report on other clubs' players rather than your own.",
  },
  {
    abbreviation: "Yth",
    term: "On a youth contract",
    tone: "success",
    likelihood: "unlikely",
    note: "No contract model at all.",
  },
  {
    abbreviation: "Req",
    term: "Transfer-listed by request",
    tone: "success",
    likelihood: "plausible",
    note: "Needs both a listing flag and the morale state that would drive the request.",
  },
];

/** The engine-modeled state a squad row carries. Narrow on purpose: widening it
 *  is the signal that a reserved slot has become renderable. */
export interface StatusSource {
  /** Current Condition (%), from the season's fitness ledger. */
  readonly condition: number;
}

/**
 * The statuses to render for one player, derived only from modeled state.
 * Pure, and the whole provenance boundary: a status absent here renders as
 * nothing rather than as a guess.
 */
export const statusesOf = (source: StatusSource): readonly ReservedStatus[] =>
  source.condition < NON_CONTACT_CONDITION_THRESHOLD ? [TIRED] : [];

/** The full terms of a player's statuses, as the announcer speaks them. */
export const statusTermsOf = (source: StatusSource): readonly string[] =>
  statusesOf(source).map((status) => status.term);

const TONE_CLASS: Readonly<Record<StatusTone, string>> = {
  danger: "text-text-danger",
  warning: "text-text-warning",
  success: "text-text-success",
};

/** The width the Status column reserves, in px. Fixed because the column is
 *  pinned: the sticky offset of every column right of it is computed from this. */
export const STATUS_COLUMN_WIDTH = 72;

/** The abbreviation runner for one row. Empty when nothing is modeled. */
export const StatusCell = ({ statuses }: { readonly statuses: readonly ReservedStatus[] }) => (
  <span className="flex gap-1 font-semibold">
    {statuses.map((status) => (
      <span key={status.abbreviation}>
        {/* The code is decoration; the term is the text. A screen reader reads
            "Tired", never "Tir". */}
        <span aria-hidden="true" className={TONE_CLASS[status.tone]}>
          {status.abbreviation}
        </span>
        <span className="sr-only">{status.term}</span>
      </span>
    ))}
  </span>
);

const LIKELIHOOD_LABEL: Readonly<Record<StatusLikelihood, string>> = {
  modeled: "Shown today",
  plausible: "Reserved — plausible",
  unlikely: "Reserved — unlikely",
};

/**
 * The abbreviation legend (Term Disclosure: visible, focusable, keyboard-
 * operable, never hover-only, never a modal). It renders above the table rather
 * than inside the header cell because the header lives in a horizontally
 * scrolling, overflow-clipped container that a pinned 72px cell cannot escape.
 */
export const StatusLegend = ({ id }: { readonly id: string }) => (
  <div
    id={id}
    className="mt-2 max-h-64 overflow-y-auto rounded-panel border border-panel-border bg-panel-bg p-3 text-xs"
  >
    <p className="text-text-body">
      The Status column shows only what the game models. Reserved codes are the
      Championship Manager 03/04 vocabulary, held as slots so the column does not
      need re-designing when a system ships — a reservation is not a promise.
    </p>
    <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
      {RESERVED_STATUSES.map((status) => (
        <li key={status.abbreviation} className="flex gap-2">
          <span className={`w-8 shrink-0 font-semibold ${TONE_CLASS[status.tone]}`}>
            {status.abbreviation}
          </span>
          <span className="text-text-body">
            <span className="text-text-primary">{status.term}</span>
            {" — "}
            {LIKELIHOOD_LABEL[status.likelihood]}. {status.note}
          </span>
        </li>
      ))}
    </ul>
  </div>
);

/** The Status column header: the label doubles as the legend's disclosure. */
export const StatusColumnHeader = ({
  expanded,
  legendId,
  onToggle,
}: {
  readonly expanded: boolean;
  readonly legendId: string;
  readonly onToggle: () => void;
}) => (
  <button
    type="button"
    aria-expanded={expanded}
    aria-controls={legendId}
    onClick={onToggle}
    className={`flex items-center gap-1 uppercase ${FOCUS_RING.join(" ")}`}
  >
    <span>Status</span>
    <span aria-hidden="true" className="text-text-secondary">
      {expanded ? "▴" : "▾"}
    </span>
    <span className="sr-only">{expanded ? "Hide" : "Show"} the status abbreviation legend</span>
  </button>
);
