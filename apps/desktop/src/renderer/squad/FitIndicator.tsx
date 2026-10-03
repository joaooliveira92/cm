/**
 * The mark a roster row carries when it fills the selected slot's Position — the reason the
 * highlight is never colour alone, and the reason a manager who cannot sort by Familiarity Tier
 * can still read the answer.
 *
 * Read through a context of its own rather than the Squad provider's, for the same reason the
 * match-day indicator beside it has one: the table's column cell renders this, and the column
 * definitions are built inside the hook that feeds the provider, so importing the provider here
 * would close an import cycle. The provider publishes the readout only while a slot is selected,
 * and both layouts draw the mark from that one value, so the position list and the table cannot
 * disagree about a row.
 *
 * Not a button, and not a control: it is a read on a row whose one focusable control is the name
 * button, and a second stop per row would break the roving-focus model both layouts share.
 */
import { createContext, useContext } from "react";
import { FAMILIARITY_TIERS } from "@cm-clone/shared";
import { tierLabel, type LineupFitReadout } from "./lineupFit.js";

/** The roster's fit readout, or `null` while no slot is selected. */
export const LineupFitContext = createContext<LineupFitReadout | null>(null);

export const useLineupFitReadout = (): LineupFitReadout | null => useContext(LineupFitContext);

/** The width the table reserves for the mark, in px, and the position list's matching slot. */
export const FIT_COLUMN_WIDTH = 32;

/**
 * The mark for one row, or nothing when that row cannot fill the selected Position. The code the
 * eye reads is the star; the state ("Fits DC, Natural") is the accessible text, following the
 * match-day indicator's convention: decoration is aria-hidden, the meaning is the text.
 */
export const FitIndicator = ({ rowId }: { readonly rowId: string }) => {
  const readout = useLineupFitReadout();
  const rank = readout?.rankById.get(rowId);
  if (readout === null || rank === undefined) return null;
  const tier = FAMILIARITY_TIERS[rank];
  const labelled =
    tier === undefined
      ? `Fits ${readout.position}`
      : `Fits ${readout.position}, ${tierLabel(tier)}`;
  return (
    <span
      title={labelled}
      data-testid="squad-fit-mark"
      className="inline-flex h-5 min-w-8 shrink-0 items-center justify-center rounded-control border border-text-highlight bg-text-highlight/15 px-1 font-mono text-caption leading-none text-text-highlight"
    >
      <span aria-hidden="true">★</span>
      <span className="sr-only">{labelled}</span>
    </span>
  );
};
