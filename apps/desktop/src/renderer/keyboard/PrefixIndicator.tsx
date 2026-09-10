/**
 * The `g <key>` prefix indicator (discoverability note, AC-18). A nonmodal
 * floating badge shown while the `g` prefix is active — never more than a few
 * milliseconds from the key that started it.
 */

import { ALL_ACTIONS } from "../actions/allActions.js";
import { prefixIndicatorEntriesOf, type PrefixIndicatorEntry } from "../actions/overrides.js";

export type { PrefixIndicatorEntry } from "../actions/overrides.js";

/**
 * "Go to: Squad [S] · Tactics [A] · …" — the *defaults* prefix indicator, derived
 * through the shared helper; the live indicator under rebinding is computed in the
 * spine from the effective actions (`prefixIndicatorEntriesOf(effectiveActions)`).
 */
export const PREFIX_INDICATOR_ENTRIES: ReadonlyArray<PrefixIndicatorEntry> =
  prefixIndicatorEntriesOf(ALL_ACTIONS);

/** The visible nonmodal prefix feedback (AC-18): fixed below the nav bar,
 *  pointer-transparent so it never blocks interaction. */
export const PrefixIndicator = ({
  entries,
}: {
  readonly entries: ReadonlyArray<PrefixIndicatorEntry>;
}) => (
  <div
    role="status"
    aria-live="polite"
    className="pointer-events-none fixed top-14 left-2 z-50 rounded-control border border-text-highlight/60 bg-panel-bg-strong px-3 py-1.5 text-sm text-text-strong shadow-lg"
  >
    <span className="font-semibold text-text-highlight">Go to:</span>{" "}
    {entries.map((entry) => `${entry.label} [${entry.key}]`).join(" \u00b7 ")}
  </div>
);